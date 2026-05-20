import * as XLSX from 'xlsx';
import { ALIASES } from './constants.js';
import { fmtDateTime, getEnrichment } from './lib.js';

const HEADER_STYLE = { fill: { fgColor: { rgb: '102C4F' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 10 }, alignment: { vertical: 'center', wrapText: true } };
const SUBHEAD_STYLE = { fill: { fgColor: { rgb: 'C5A85A' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 }, alignment: { vertical: 'center' } };
const TITLE_STYLE = { fill: { fgColor: { rgb: '102C4F' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 14 }, alignment: { vertical: 'center' } };

const ENR_HEADERS = ['Seniority', 'Budget', 'Budget influence', 'Decision role', 'Investment timeframe',
                     'Sector interested in', 'Reason for attending', 'LinkedIn URL', 'City', 'Industry',
                     'Headline', 'Summary', 'Challenge', 'Roundtable themes', 'Product categories interested', 'Default locations'];

const enrCols = (email, enrichmentMap) => {
  const e = getEnrichment(email, enrichmentMap);
  if (!e) return ENR_HEADERS.map(() => '');
  return [e.seniority || '', e.annual_budget || '', e.budget_influence || '', e.decision_role || '',
          e.investment_timeframe || '', e.sector_interested || '', e.reason_attending || '',
          e.linkedin_url || '', e.city || '', e.industry || '',
          e.headline || '', e.summary || '', e.challenge || '', e.roundtable_themes || '',
          e.product_categories || '', e.default_locations || ''];
};

export const exportSponsorPack = (sponsor, data, enrichmentMap) => {
  const { standScans, accepted, pending, declined, sessionBlocks, seniorityTargeted } = data;
  const wb = XLSX.utils.book_new();

  // ---- Summary sheet ----
  const sumRows = [
    [`Banking Transformation Summit London 2026`],
    [`Sponsor Engagement Pack — ${sponsor.name}`],
    [],
    ['Sponsor', sponsor.name],
    ['Tier', sponsor.tier],
    ['Generated', new Date().toLocaleString('en-GB')],
    ['Your stated target seniority', seniorityTargeted || '(not set in Grip)'],
    [],
    ['Metric', 'Value'],
    ['Accepted meetings', accepted.length],
    ['Pending meetings', pending.length],
    ['Declined meetings', declined.length],
    ['Total stand scans', standScans.length],
    ['Sponsored sessions', sessionBlocks.length],
    ['Total session check-ins', sessionBlocks.reduce((a, b) => a + b.rows.length, 0)],
  ];
  const sumWs = XLSX.utils.aoa_to_sheet(sumRows);
  sumWs['!cols'] = [{ wch: 55 }, { wch: 30 }];
  sumWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
  if (sumWs['A1']) sumWs['A1'].s = TITLE_STYLE;
  if (sumWs['A2']) sumWs['A2'].s = SUBHEAD_STYLE;
  if (sumWs['A9']) sumWs['A9'].s = HEADER_STYLE;
  if (sumWs['B9']) sumWs['B9'].s = HEADER_STYLE;
  XLSX.utils.book_append_sheet(wb, sumWs, 'Summary');

  // ---- Meetings ----
  const meetingsRows = [[`Meetings — ${sponsor.name}`]];
  const meetHeaders = ['Date', 'Time', 'Status', 'Location', 'Your team rep', 'Counterparty', 'Job title', 'Company', 'Personal message', ...ENR_HEADERS];
  const aliasSet = new Set(ALIASES[sponsor.name] || [sponsor.name]);
  const meetRow = (m) => {
    const orgIn = aliasSet.has((m.organizer_company || '').trim());
    const ours = orgIn ? m.organizer_name : m.recipient_names;
    const cp = orgIn ? m.recipient_names : m.organizer_name;
    const cpTitle = orgIn ? m.recipient_job_titles : m.organizer_job_title;
    const cpCo = orgIn ? m.recipient_companies : m.organizer_company;
    const cpEmail = orgIn ? (m.recipient_emails || '').split(',')[0]?.trim() : m.organizer_email;
    return [m.meeting_date || '', m.meeting_time || '', (m.status || '').replace(/\b\w/g, c => c.toUpperCase()),
            m.location || '', ours || '', cp || '', cpTitle || '', cpCo || '',
            String(m.personal_message || '').slice(0, 300), ...enrCols(cpEmail, enrichmentMap)];
  };
  const sortMeets = (arr) => [...arr].sort((a, b) => {
    const da = new Date(a.meeting_date); const db = new Date(b.meeting_date);
    return da - db || (a.meeting_time || '').localeCompare(b.meeting_time || '');
  });
  for (const [label, arr] of [['Accepted', accepted], ['Pending', pending], ['Declined', declined]]) {
    meetingsRows.push([]);
    meetingsRows.push([`${label} (${arr.length})`]);
    meetingsRows.push(meetHeaders);
    if (arr.length === 0) meetingsRows.push([`No ${label.toLowerCase()} meetings`, ...Array(meetHeaders.length - 1).fill('')]);
    else for (const m of sortMeets(arr)) meetingsRows.push(meetRow(m));
  }
  const meetWs = XLSX.utils.aoa_to_sheet(meetingsRows);
  meetWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 11 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 50 },
                     ...Array(ENR_HEADERS.length).fill({ wch: 28 })];
  meetWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: meetHeaders.length - 1 } }];
  if (meetWs['A1']) meetWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, meetWs, 'Meetings');

  // ---- Stand Scans ----
  const scanRows = [[`Stand Scans — ${sponsor.name} (${standScans.length})`]];
  const scanHeaders = ['Date & time', 'Scanned by (your rep)', 'Attendee name', 'Job title', 'Company', 'Email', 'Phone', 'Location', 'Attendee type', ...ENR_HEADERS];
  scanRows.push(scanHeaders);
  if (standScans.length === 0) scanRows.push(['No stand scans yet', ...Array(scanHeaders.length - 1).fill('')]);
  else for (const s of standScans) scanRows.push([
    fmtDateTime(s.date_created_on), s.scanner_name || '', s.attendee_name || '',
    s.attendee_job_title || '', s.attendee_company || '', s.attendee_email || '',
    s.attendee_phone || '', s.attendee_location || '', s.attendee_type || '',
    ...enrCols(s.attendee_email, enrichmentMap),
  ]);
  const scanWs = XLSX.utils.aoa_to_sheet(scanRows);
  scanWs['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
                     ...Array(ENR_HEADERS.length).fill({ wch: 28 })];
  scanWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: scanHeaders.length - 1 } }];
  if (scanWs['A1']) scanWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, scanWs, 'Stand Scans');

  // ---- Session Scans ----
  const sessRows = [[`Session Scans — ${sponsor.name}`]];
  const sessHeaders = ['Check-in time', 'Attendee name', 'Job title', 'Company', 'Email', 'Phone', ...ENR_HEADERS];
  if (sessionBlocks.length === 0) {
    sessRows.push([]);
    sessRows.push(['This sponsor does not have a sponsored stage session in the agenda.']);
  } else {
    for (const { session, rows } of sessionBlocks) {
      sessRows.push([]);
      sessRows.push([`${session}  (${rows.length} check-ins)`]);
      sessRows.push(sessHeaders);
      if (rows.length === 0) sessRows.push(['No scan data for this session yet', ...Array(sessHeaders.length - 1).fill('')]);
      else for (const r of rows) sessRows.push([
        fmtDateTime(r.data_checked_in), r.participant_name || '', r.participant_job_title || '',
        r.participant_company || '', r.participant_email || '', r.participant_phone || '',
        ...enrCols(r.participant_email, enrichmentMap),
      ]);
    }
  }
  const sessWs = XLSX.utils.aoa_to_sheet(sessRows);
  sessWs['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 32 }, { wch: 16 },
                     ...Array(ENR_HEADERS.length).fill({ wch: 28 })];
  sessWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: sessHeaders.length - 1 } }];
  if (sessWs['A1']) sessWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, sessWs, 'Session Scans');

  const safe = sponsor.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
  XLSX.writeFile(wb, `BTS_London_2026_Sponsor_Pack_${safe}.xlsx`);
};
