import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, Download, Lock, Trash2, BarChart3, Users, CheckCircle2, AlertCircle, X, LogOut } from 'lucide-react';
import { supabase } from './supabase.js';
import { SPONSORS, ALIASES } from './constants.js';
import { normalise, cleanSessionName, fmtDateTime, getEnrichment, getSponsorData, pillTone } from './lib.js';
import { exportSponsorPack } from './exportPack.js';

const NAVY = '#102C4F';
const TONE_CLASS = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

// =============== Auth gate ===============

function LoginGate({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) setErr(error.message);
    else onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-96">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-6 h-6" style={{ color: NAVY }} />
          <h1 className="text-xl font-semibold" style={{ color: NAVY }}>BTS London 2026 Sponsor Dashboard</h1>
        </div>
        <p className="text-sm text-slate-600 mb-6">Sign in with the team account.</p>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" autoFocus
          className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-slate-400" />
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Password"
          className="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-slate-400" />
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button onClick={submit} disabled={busy}
          className="w-full text-white px-4 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50"
          style={{ background: NAVY }}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </div>
    </div>
  );
}

// =============== UI Components ===============

function Pill({ tone, label }) {
  if (!tone || !label) return null;
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border mr-1 mb-1 ${TONE_CLASS[tone]}`}>{label}</span>;
}

function EnrichmentPills({ enr }) {
  if (!enr) return null;
  const pills = [];
  if (enr.seniority) pills.push({ k: 'seniority', val: enr.seniority, label: enr.seniority });
  if (enr.annual_budget) pills.push({ k: 'budget', val: enr.annual_budget, label: '£ ' + enr.annual_budget });
  if (enr.budget_influence) pills.push({ k: 'influence', val: enr.budget_influence, label: enr.budget_influence });
  if (enr.decision_role) pills.push({ k: 'decisionRole', val: enr.decision_role, label: enr.decision_role });
  if (enr.investment_timeframe) pills.push({ k: 'timeframe', val: enr.investment_timeframe, label: 'Buys ' + enr.investment_timeframe.toLowerCase() });
  const rendered = pills.map((p, i) => {
    const tone = pillTone(p.k, p.val);
    if (!tone) return null;
    return <Pill key={i} tone={tone} label={p.label} />;
  }).filter(Boolean);
  if (rendered.length === 0) return null;
  return <div className="mt-1 flex flex-wrap">{rendered}</div>;
}

function UploadBox({ label, hint, accept, status, onFile, onClear }) {
  const handle = (e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; };
  return (
    <div className="border border-slate-200 rounded-lg p-5 bg-white">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
        {status?.rows > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>{status.rows.toLocaleString()} rows</span>
            {onClear && <button onClick={onClear} title="Clear table" className="text-slate-400 hover:text-red-600 ml-1"><X className="w-4 h-4" /></button>}
          </div>
        )}
      </div>
      {status?.lastUpload && <p className="text-xs text-slate-400 mb-2">Last upload: {status.lastUpload}</p>}
      {status?.uploading && <p className="text-xs text-amber-600 mb-2">Uploading...</p>}
      {status?.error && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {status.error}</p>}
      <label className="cursor-pointer">
        <input type="file" accept={accept} onChange={handle} className="hidden" disabled={status?.uploading} />
        <span className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50">
          <Upload className="w-4 h-4" />
          {status?.rows > 0 ? 'Upload newer export' : 'Choose file'}
        </span>
      </label>
    </div>
  );
}

function StatPill({ label, value, tone = 'slate' }) {
  const tones = { slate: 'bg-slate-100 text-slate-900', emerald: 'bg-emerald-50 text-emerald-900', amber: 'bg-amber-50 text-amber-900', rose: 'bg-rose-50 text-rose-900' };
  return (
    <div className={`rounded-lg p-3 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function MeetingsView({ data, enrichmentMap }) {
  const sections = [
    { label: 'Accepted', rows: data.accepted },
    { label: 'Pending', rows: data.pending },
    { label: 'Declined', rows: data.declined },
  ];
  const aliasSet = new Set(ALIASES[data.sponsorName] || [data.sponsorName]);
  return (
    <div className="space-y-6">
      {sections.map(({ label, rows }) => (
        <div key={label}>
          <h3 className="font-semibold text-slate-900 mb-2">{label} <span className="text-slate-500 font-normal">({rows.length})</span></h3>
          {rows.length === 0 ? <p className="text-sm text-slate-500 italic">No {label.toLowerCase()} meetings</p> : (
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr><th className="text-left p-2">Date</th><th className="text-left p-2">Time</th><th className="text-left p-2">Location</th><th className="text-left p-2">Your rep</th><th className="text-left p-2">Counterparty</th><th className="text-left p-2">Company</th></tr>
                </thead>
                <tbody>
                  {rows.map((m, i) => {
                    const orgIn = aliasSet.has((m.organizer_company || '').trim());
                    const cpEmail = orgIn ? (m.recipient_emails || '').split(',')[0]?.trim() : m.organizer_email;
                    const enr = getEnrichment(cpEmail, enrichmentMap);
                    return (
                      <tr key={i} className={i % 2 ? 'bg-slate-50/50 align-top' : 'align-top'}>
                        <td className="p-2">{m.meeting_date}</td>
                        <td className="p-2">{m.meeting_time}</td>
                        <td className="p-2">{m.location}</td>
                        <td className="p-2">{orgIn ? m.organizer_name : m.recipient_names}</td>
                        <td className="p-2">
                          <div>{orgIn ? m.recipient_names : m.organizer_name}</div>
                          {enr?.linkedin_url && <a href={enr.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">LinkedIn</a>}
                          <EnrichmentPills enr={enr} />
                        </td>
                        <td className="p-2 text-slate-600">{orgIn ? m.recipient_companies : m.organizer_company}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScansView({ rows, enrichmentMap }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500 italic">No stand scans yet</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr><th className="text-left p-2">Time</th><th className="text-left p-2">Scanned by</th><th className="text-left p-2">Attendee</th><th className="text-left p-2">Job title</th><th className="text-left p-2">Company</th><th className="text-left p-2">Email</th></tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const enr = getEnrichment(s.attendee_email, enrichmentMap);
            return (
              <tr key={i} className={i % 2 ? 'bg-slate-50/50 align-top' : 'align-top'}>
                <td className="p-2 whitespace-nowrap">{fmtDateTime(s.date_created_on)}</td>
                <td className="p-2">{s.scanner_name}</td>
                <td className="p-2">
                  <div>{s.attendee_name}</div>
                  {enr?.linkedin_url && <a href={enr.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">LinkedIn</a>}
                  <EnrichmentPills enr={enr} />
                </td>
                <td className="p-2 text-slate-600">{enr?.headline || s.attendee_job_title}</td>
                <td className="p-2">{s.attendee_company}</td>
                <td className="p-2 text-slate-600 text-xs">{s.attendee_email}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SessionScansView({ blocks, enrichmentMap }) {
  if (blocks.length === 0) return <p className="text-sm text-slate-500 italic">This sponsor does not have a sponsored stage session in the agenda.</p>;
  return (
    <div className="space-y-6">
      {blocks.map(({ session, rows }, i) => (
        <div key={i}>
          <h3 className="font-semibold text-slate-900 mb-2">{session} <span className="text-slate-500 font-normal">({rows.length} check-ins)</span></h3>
          {rows.length === 0 ? <p className="text-sm text-slate-500 italic">No scan data for this session yet</p> : (
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr><th className="text-left p-2">Time</th><th className="text-left p-2">Attendee</th><th className="text-left p-2">Job title</th><th className="text-left p-2">Company</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => {
                    const enr = getEnrichment(r.participant_email, enrichmentMap);
                    return (
                      <tr key={ri} className={ri % 2 ? 'bg-slate-50/50 align-top' : 'align-top'}>
                        <td className="p-2 whitespace-nowrap">{fmtDateTime(r.data_checked_in)}</td>
                        <td className="p-2">
                          <div>{r.participant_name}</div>
                          {enr?.linkedin_url && <a href={enr.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">LinkedIn</a>}
                          <EnrichmentPills enr={enr} />
                        </td>
                        <td className="p-2 text-slate-600">{enr?.headline || r.participant_job_title}</td>
                        <td className="p-2">{r.participant_company}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============== File parsers ===============

const parseCSV = (file) => new Promise((resolve, reject) => {
  Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data), error: reject });
});

const parseXLSX = async (file, headerRow = 0) => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { range: headerRow, defval: '' });
};

// Batch upsert helper — Supabase handles ~1000 rows comfortably per call
const upsertChunks = async (table, rows, conflictKey) => {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey });
    if (error) throw error;
  }
};

// =============== Mappers from raw CSV/XLSX rows to DB shape ===============

const mapScans = (rows) => rows.filter(r => r['Scan ID']).map(r => ({
  scan_id: String(r['Scan ID']),
  date_created_on: r['Date Created On'] || null,
  source: r['Source'] || null,
  scanner_name: r['to_profile name'] || null,
  scanner_company: r['to_profile company name'] || null,
  scanner_type: r['to_profile type'] || null,
  attendee_name: r['profile name'] || null,
  attendee_company: r['profile company name'] || null,
  attendee_job_title: r['profile job title'] || null,
  attendee_email: r['profile email'] || null,
  attendee_phone: r['profile phone number'] || null,
  attendee_location: r['profile location'] || null,
  attendee_type: r['profile type'] || null,
}));

const mapCheckins = (rows) => rows.filter(r => r['Scan ID']).map(r => ({
  scan_id: String(r['Scan ID']),
  data_checked_in: r['Data Checked In'] || null,
  session_id: r['Session ID'] ? String(r['Session ID']) : null,
  session_name: r['Session Name'] || null,
  session_name_normalised: normalise(r['Session Name']),
  participant_name: r['Participant Name'] || null,
  participant_company: r['Participant Company Name'] || null,
  participant_job_title: r['Participant Job Title'] || null,
  participant_email: r['Participant Email'] || null,
  participant_phone: r['Particpant Phone Number'] || null,
}));

const mapMeetings = (rows) => rows.filter(r => r['Meeting ID']).map(r => ({
  meeting_id: String(r['Meeting ID']),
  status: r['Status'] || null,
  meeting_date: r['Meeting Date'] || null,
  meeting_time: r['Meeting Time'] || null,
  location: r['Location name'] || null,
  organizer_name: r['Organizer Name'] || null,
  organizer_email: r['Organizer Email'] || null,
  organizer_company: r['Organizer Company'] || null,
  organizer_job_title: r['Organizer Job Title'] || null,
  recipient_names: r['Recipient Names'] || null,
  recipient_emails: r['Recipient Emails'] || null,
  recipient_companies: r['Recipient Companies'] || null,
  recipient_job_titles: r['Recipient Job Titles'] || null,
  personal_message: r['Meeting Personal Message'] || null,
}));

// =============== Main App ===============

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upload');
  const [view, setView] = useState('meetings');
  const [selectedSponsor, setSelectedSponsor] = useState(SPONSORS[0].name);

  const [scans, setScans] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [enrichmentList, setEnrichmentList] = useState([]);

  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Email → enrichment record lookup
  const enrichmentMap = useMemo(() => {
    const m = {};
    for (const e of enrichmentList) if (e.email) m[e.email.toLowerCase()] = e;
    return m;
  }, [enrichmentList]);

  const refreshAll = async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from('stand_scans').select('*').order('date_created_on', { ascending: true }).limit(20000),
      supabase.from('session_checkins').select('*').order('data_checked_in', { ascending: true }).limit(20000),
      supabase.from('meetings').select('*').limit(10000),
      supabase.from('enrichment').select('*').limit(5000),
    ]);
    setScans(a.data || []);
    setCheckins(b.data || []);
    setMeetings(c.data || []);
    setEnrichmentList(d.data || []);
    setStatuses({
      scans: { rows: (a.data || []).length, lastUpload: 'live' },
      checkins: { rows: (b.data || []).length, lastUpload: 'live' },
      meetings: { rows: (c.data || []).length, lastUpload: 'live' },
    });
  };

  useEffect(() => { if (session) refreshAll(); }, [session]);

  const wrappedUpload = (key, mapper, table, conflictKey, parser) => async (file) => {
    setStatuses(s => ({ ...s, [key]: { ...(s[key] || {}), uploading: true, error: null } }));
    try {
      const raw = await parser(file);
      const mapped = mapper(raw);
      await upsertChunks(table, mapped, conflictKey);
      await refreshAll();
      setStatuses(s => ({ ...s, [key]: { ...(s[key] || {}), uploading: false, lastUpload: new Date().toLocaleString('en-GB') } }));
    } catch (e) {
      console.error(e);
      setStatuses(s => ({ ...s, [key]: { ...(s[key] || {}), uploading: false, error: e.message } }));
    }
  };

  const handleScans = wrappedUpload('scans', mapScans, 'stand_scans', 'scan_id', parseCSV);
  const handleCheckins = wrappedUpload('checkins', mapCheckins, 'session_checkins', 'scan_id', parseCSV);
  const handleMeetings = wrappedUpload('meetings', mapMeetings, 'meetings', 'meeting_id', (f) => parseXLSX(f, 1));

  const clearTable = async (table, key) => {
    if (!confirm(`Clear all rows in ${table}? This deletes the data from Supabase. Cannot be undone.`)) return;
    const { error } = await supabase.from(table).delete().not('scan_id', 'is', null);
    if (error) { alert(error.message); return; }
    await refreshAll();
    setStatuses(s => ({ ...s, [key]: undefined }));
  };

  const clearMeetings = async () => {
    if (!confirm('Clear all meetings? Cannot be undone.')) return;
    const { error } = await supabase.from('meetings').delete().not('meeting_id', 'is', null);
    if (error) { alert(error.message); return; }
    await refreshAll();
    setStatuses(s => ({ ...s, meetings: undefined }));
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const sponsorData = useMemo(() => {
    const d = getSponsorData(selectedSponsor, scans, checkins, meetings, enrichmentMap);
    return { ...d, sponsorName: selectedSponsor };
  }, [selectedSponsor, scans, checkins, meetings, enrichmentMap]);

  const allSponsorsSummary = useMemo(() => {
    return SPONSORS.map(sp => {
      const d = getSponsorData(sp.name, scans, checkins, meetings, enrichmentMap);
      return { ...sp, accepted: d.accepted.length, pending: d.pending.length, declined: d.declined.length,
               stand: d.standScans.length, sessions: d.sessionBlocks.length,
               sessionScans: d.sessionBlocks.reduce((a, b) => a + b.rows.length, 0) };
    });
  }, [scans, checkins, meetings, enrichmentMap]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!session) return <LoginGate onLogin={refreshAll} />;

  const currentSponsorObj = SPONSORS.find(s => s.name === selectedSponsor);
  const hasData = scans.length || checkins.length || meetings.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="text-white px-6 py-4" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">BTS London 2026 — Sponsor Engagement Dashboard</h1>
            <p className="text-xs opacity-80 mt-1">{enrichmentList.length} enriched attendee profiles loaded.</p>
          </div>
          <button onClick={signOut} className="text-xs opacity-80 hover:opacity-100 flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {[{ k: 'upload', label: 'Uploads', icon: Upload },
            { k: 'sponsor', label: 'Sponsor view', icon: Users },
            { k: 'index', label: 'All sponsors', icon: BarChart3 }].map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${tab === k ? 'border-current' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              style={{ color: tab === k ? NAVY : undefined }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {tab === 'upload' && (
          <div>
            <div className="mb-6 p-4 bg-slate-100 rounded-lg text-sm text-slate-700">
              Upload the latest exports from Grip and the platform. New uploads merge with what's already in Supabase, deduplicated on unique IDs. So if you upload again an hour later, only new records get added and updated rows get refreshed. Attendee profile enrichment (seniority, budget, decision role, investment timeframe, LinkedIn URL) is matched by email from the pre-loaded enrichment table.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <UploadBox label="Master Badge Scanning" hint="CSV from Grip. Deduplicated on Scan ID."
                accept=".csv" status={statuses.scans} onFile={handleScans}
                onClear={() => clearTable('stand_scans', 'scans')} />
              <UploadBox label="Session Check-Ins" hint="CSV from session scanner. Deduplicated on Scan ID."
                accept=".csv" status={statuses.checkins} onFile={handleCheckins}
                onClear={() => clearTable('session_checkins', 'checkins')} />
              <UploadBox label="Meetings List" hint="Excel export from Grip. Deduplicated on Meeting ID."
                accept=".xlsx,.xls" status={statuses.meetings} onFile={handleMeetings}
                onClear={clearMeetings} />
              <div className="border border-dashed border-slate-300 rounded-lg p-5 bg-slate-50">
                <h3 className="font-semibold text-slate-700">Attendee enrichment</h3>
                <p className="text-xs text-slate-500 mt-1">{enrichmentList.length.toLocaleString()} profiles pre-loaded from Grip + HubSpot in Supabase. Update via the Supabase Table Editor if needed between events.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'sponsor' && (
          <div>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">Sponsor:</label>
                <select value={selectedSponsor} onChange={(e) => setSelectedSponsor(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm min-w-[280px]">
                  {SPONSORS.map(s => <option key={s.name} value={s.name}>{s.name} ({s.tier})</option>)}
                </select>
              </div>
              <button onClick={() => exportSponsorPack(currentSponsorObj, sponsorData, enrichmentMap)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-md text-sm font-medium hover:opacity-90"
                style={{ background: NAVY }}>
                <Download className="w-4 h-4" /> Download Excel pack
              </button>
            </div>

            {sponsorData.seniorityTargeted && (
              <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <span className="font-semibold">Your stated target seniority:</span> {sponsorData.seniorityTargeted}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <StatPill label="Accepted meetings" value={sponsorData.accepted.length} tone="emerald" />
              <StatPill label="Pending meetings" value={sponsorData.pending.length} tone="amber" />
              <StatPill label="Declined" value={sponsorData.declined.length} tone="rose" />
              <StatPill label="Stand scans" value={sponsorData.standScans.length} />
              <StatPill label="Session check-ins" value={sponsorData.sessionBlocks.reduce((a, b) => a + b.rows.length, 0)} />
            </div>

            <div className="flex gap-1 border-b border-slate-200 mb-4">
              {[{ k: 'meetings', label: 'Meetings' }, { k: 'scans', label: 'Stand scans' }, { k: 'sessions', label: 'Session scans' }].map(({ k, label }) => (
                <button key={k} onClick={() => setView(k)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${view === k ? 'border-current' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                  style={{ color: view === k ? NAVY : undefined }}>{label}</button>
              ))}
            </div>

            <div>
              {view === 'meetings' && <MeetingsView data={sponsorData} enrichmentMap={enrichmentMap} />}
              {view === 'scans' && <ScansView rows={sponsorData.standScans} enrichmentMap={enrichmentMap} />}
              {view === 'sessions' && <SessionScansView blocks={sponsorData.sessionBlocks} enrichmentMap={enrichmentMap} />}
            </div>
          </div>
        )}

        {tab === 'index' && (
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: NAVY }}>All sponsors</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left p-3">Sponsor</th><th className="text-left p-3">Tier</th>
                    <th className="text-right p-3">Accepted</th><th className="text-right p-3">Pending</th>
                    <th className="text-right p-3">Declined</th><th className="text-right p-3">Stand scans</th>
                    <th className="text-right p-3">Sessions</th><th className="text-right p-3">Session check-ins</th>
                    <th className="text-right p-3">Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {allSponsorsSummary.map((s, i) => (
                    <tr key={s.name} className={i % 2 ? 'bg-slate-50/50' : ''}>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-slate-600">{s.tier}</td>
                      <td className="p-3 text-right">{s.accepted}</td>
                      <td className="p-3 text-right">{s.pending}</td>
                      <td className="p-3 text-right text-slate-500">{s.declined}</td>
                      <td className="p-3 text-right">{s.stand}</td>
                      <td className="p-3 text-right">{s.sessions}</td>
                      <td className="p-3 text-right">{s.sessionScans}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => exportSponsorPack(s, getSponsorData(s.name, scans, checkins, meetings, enrichmentMap), enrichmentMap)}
                          className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-100">
                          <Download className="w-3 h-3 inline mr-1" />xlsx
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
