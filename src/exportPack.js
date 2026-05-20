import * as XLSX from 'xlsx';
import { ALIASES } from './constants.js';
import { fmtDateTime, getEnrichment, getConsolidatedAttendees, getRepPerformance, arrivedFor } from './lib.js';

const HEADER_STYLE = { fill: { fgColor: { rgb: '102C4F' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 10 }, alignment: { vertical: 'center', wrapText: true } };
const SUBHEAD_STYLE = { fill: { fgColor: { rgb: 'C5A85A' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 }, alignment: { vertical: 'center' } };
const TITLE_STYLE = { fill: { fgColor: { rgb: '102C4F' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 14 }, alignment: { vertical: 'center' } };
const HOT_STYLE = { fill: { fgColor: { rgb: 'D1FAE5' } }, font: { color: { rgb: '065F46' }, bold: true } };
const WARM_STYLE = { fill: { fgColor: { rgb: 'FEF3C7' } }, font: { color: { rgb: '92400E' }, bold: true } };
const COLD_STYLE = { fill: { fgColor: { rgb: 'F1F5F9' } }, font: { color: { rgb: '475569' } } };

const ENR_HEADERS = ['Mobile', 'LinkedIn', 'Seniority', 'Budget', 'Budget influence', 'Decision role',
                     'Investment timeframe', 'Sector interested in', 'Reason for attending',
                     'City', 'Industry', 'Headline', 'Summary', 'Challenge', 'Roundtable themes',
                     'Product categories interested', 'Default locations', 'Photo URL'];

const enrCols = (email, enrichmentMap) => {
  const e = getEnrichment(email, enrichmentMap);
  if (!e) return ENR_HEADERS.map(() => '');
  return [e.mobile_phone || '', e.linkedin_url || '', e.seniority || '', e.annual_budget || '',
          e.budget_influence || '', e.decision_role || '', e.investment_timeframe || '',
          e.sector_interested || '', e.reason_attending || '', e.city || '', e.industry || '',
          e.headline || '', e.summary || '', e.challenge || '', e.roundtable_themes || '',
          e.product_categories || '', e.default_locations || '', e.picture_url || ''];
};

const colWidthsForEnr = () => [
  { wch: 16 }, { wch: 32 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 24 },
  { wch: 22 }, { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 30 },
  { wch: 40 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 40 },
];

export const exportSponsorPack = (sponsor, data, enrichmentMap) => {
  const { standScans, accepted, pending, declined, sessionBlocks, seniorityTargeted } = data;
  const wb = XLSX.utils.book_new();
  const consolidated = getConsolidatedAttendees(sponsor.name, data, enrichmentMap);
  const reps = getRepPerformance(data);
  const aliasSet = new Set(ALIASES[sponsor.name] || [sponsor.name]);

  // ===== 1. SUMMARY TAB =====
  const tierCounts = { Hot: 0, Warm: 0, Cold: 0 };
  consolidated.forEach(p => tierCounts[p.score]++);
  const sumRows = [
    [`Banking Transformation Summit London 2026`],
    [`Sponsor Engagement Pack — ${sponsor.name}`],
    [],
    ['Sponsor', sponsor.name],
    ['Tier', sponsor.tier],
    ['Generated', new Date().toLocaleString('en-GB')],
    ['Your stated target seniority', seniorityTargeted || '(not set in Grip)'],
    [],
    ['How to use this pack'],
    ['Start with the "Action List" tab — every person you engaged with, deduplicated, sorted by lead score.'],
    ['Hot leads have strong buyer signals plus multiple touchpoints. Call them first.'],
    [],
    ['Lead scoring breakdown'],
    ['Hot leads', tierCounts.Hot],
    ['Warm leads', tierCounts.Warm],
    ['Cold leads', tierCounts.Cold],
    ['Total unique people', consolidated.length],
    [],
    ['Engagement metrics'],
    ['Accepted meetings', accepted.length],
    ['Pending meetings', pending.length],
    ['Declined meetings', declined.length],
    ['Total stand scans', standScans.length],
    ['Sponsored sessions', sessionBlocks.length],
    ['Total session check-ins', sessionBlocks.reduce((a, b) => a + b.rows.length, 0)],
  ];
  if (reps.length > 0) {
    sumRows.push([]);
    sumRows.push(['Your reps — booth scan performance']);
    sumRows.push(['Rep name', 'Scans', 'Unique people']);
    for (const r of reps) sumRows.push([r.rep, r.scans, r.unique]);
  }
  const sumWs = XLSX.utils.aoa_to_sheet(sumRows);
  sumWs['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 16 }];
  sumWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } }, { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } },
    { s: { r: 18, c: 0 }, e: { r: 18, c: 2 } },
  ];
  if (sumWs['A1']) sumWs['A1'].s = TITLE_STYLE;
  if (sumWs['A2']) sumWs['A2'].s = SUBHEAD_STYLE;
  ['A9', 'A13', 'A19'].forEach(c => { if (sumWs[c]) sumWs[c].s = SUBHEAD_STYLE; });
  XLSX.utils.book_append_sheet(wb, sumWs, 'Summary');

  // ===== 2. ACTION LIST (consolidated, deduped, scored) =====
  const actionHeaders = ['Lead score', 'Score pts', 'Touchpoints', 'Name', 'Job title', 'Company', 'Email',
                         'Stand scans', 'Sessions attended', 'Session names', 'Meetings accepted', 'Meetings pending',
                         'Meetings declined', 'Showed up?', ...ENR_HEADERS];
  const actionRows = [[`Action List — ${sponsor.name} (${consolidated.length} unique people, sorted by lead score)`]];
  actionRows.push(actionHeaders);
  if (consolidated.length === 0) {
    actionRows.push(['No engagement data yet', ...Array(actionHeaders.length - 1).fill('')]);
  } else {
    for (const p of consolidated) {
      actionRows.push([
        p.score, p.score_pts, p.touchpoints, p.name, p.job_title, p.company, p.email,
        p.stand_scans, p.sessions_attended, p.session_names.join('; '),
        p.meetings_accepted, p.meetings_pending, p.meetings_declined, p.meeting_arrived || '',
        ...enrCols(p.email, enrichmentMap),
      ]);
    }
  }
  const actionWs = XLSX.utils.aoa_to_sheet(actionRows);
  actionWs['!cols'] = [
    { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 22 }, { wch: 32 },
    { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 11 },
    ...colWidthsForEnr(),
  ];
  actionWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: actionHeaders.length - 1 } }];
  if (actionWs['A1']) actionWs['A1'].s = TITLE_STYLE;
  // Style header row
  for (let c = 0; c < actionHeaders.length; c++) {
    const cell = actionWs[XLSX.utils.encode_cell({ r: 1, c })];
    if (cell) cell.s = HEADER_STYLE;
  }
  // Style lead score cells
  for (let r = 2; r < actionRows.length; r++) {
    const cell = actionWs[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!cell) continue;
    if (cell.v === 'Hot') cell.s = HOT_STYLE;
    else if (cell.v === 'Warm') cell.s = WARM_STYLE;
    else if (cell.v === 'Cold') cell.s = COLD_STYLE;
  }
  actionWs['!freeze'] = { xSplit: 0, ySplit: 2 };
  XLSX.utils.book_append_sheet(wb, actionWs, 'Action List');

  // ===== 3. MEETINGS =====
  const meetingsRows = [[`Meetings — ${sponsor.name}`]];
  const meetHeaders = ['Date', 'Time', 'Status', 'Showed up?', 'Location', 'Your team rep', 'Counterparty',
                       'Job title', 'Company', 'Personal message (full)', ...ENR_HEADERS];
  const meetRow = (m) => {
    const orgIn = aliasSet.has((m.organizer_company || '').trim());
    const ours = orgIn ? m.organizer_name : m.recipient_names;
    const cp = orgIn ? m.recipient_names : m.organizer_name;
    const cpTitle = orgIn ? m.recipient_job_titles : m.organizer_job_title;
    const cpCo = orgIn ? m.recipient_companies : m.organizer_company;
    const cpEmail = orgIn ? (m.recipient_emails || '').split(',')[0]?.trim() : m.organizer_email;
    const arrived = orgIn
      ? arrivedFor(cpEmail, m.recipient_emails, m.recipient_arrived)
      : (m.organizer_arrived || '');
    return [m.meeting_date || '', m.meeting_time || '', (m.status || '').replace(/\b\w/g, c => c.toUpperCase()),
            arrived || '(no data)', m.location || '', ours || '', cp || '', cpTitle || '', cpCo || '',
            String(m.personal_message || ''), ...enrCols(cpEmail, enrichmentMap)];
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
  meetWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 11 }, { wch: 11 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
                     { wch: 28 }, { wch: 22 }, { wch: 60 }, ...colWidthsForEnr()];
  meetWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: meetHeaders.length - 1 } }];
  if (meetWs['A1']) meetWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, meetWs, 'Meetings');

  // ===== 4. STAND SCANS =====
  const scanRows = [[`Stand Scans — ${sponsor.name} (${standScans.length})`]];
  const scanHeaders = ['Date & time', 'Scanned by (your rep)', 'Attendee name', 'Job title', 'Company',
                       'Email', 'Phone (on badge)', 'Location', 'Attendee type', ...ENR_HEADERS];
  scanRows.push(scanHeaders);
  if (standScans.length === 0) scanRows.push(['No stand scans yet', ...Array(scanHeaders.length - 1).fill('')]);
  else for (const s of standScans) scanRows.push([
    fmtDateTime(s.date_created_on), s.scanner_name || '', s.attendee_name || '',
    s.attendee_job_title || '', s.attendee_company || '', s.attendee_email || '',
    s.attendee_phone || '', s.attendee_location || '', s.attendee_type || '',
    ...enrCols(s.attendee_email, enrichmentMap),
  ]);
  const scanWs = XLSX.utils.aoa_to_sheet(scanRows);
  scanWs['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 32 },
                     { wch: 16 }, { wch: 18 }, { wch: 18 }, ...colWidthsForEnr()];
  scanWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: scanHeaders.length - 1 } }];
  if (scanWs['A1']) scanWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, scanWs, 'Stand Scans');

  // ===== 5. SESSION SCANS =====
  const sessRows = [[`Session Scans — ${sponsor.name}`]];
  const sessHeaders = ['Check-in time', 'Attendee name', 'Job title', 'Company', 'Email', 'Phone (on badge)',
                       'Also scanned at your booth?', ...ENR_HEADERS];
  const standEmails = new Set(standScans.map(s => (s.attendee_email || '').toLowerCase()).filter(Boolean));
  if (sessionBlocks.length === 0) {
    sessRows.push([]);
    sessRows.push(['This sponsor does not have a sponsored stage session in the agenda.']);
  } else {
    for (const { session, rows } of sessionBlocks) {
      sessRows.push([]);
      sessRows.push([`${session}  (${rows.length} check-ins)`]);
      sessRows.push(sessHeaders);
      if (rows.length === 0) sessRows.push(['No scan data for this session yet', ...Array(sessHeaders.length - 1).fill('')]);
      else for (const r of rows) {
        const alsoBooth = standEmails.has((r.participant_email || '').toLowerCase()) ? 'YES — hot lead' : '';
        sessRows.push([
          fmtDateTime(r.data_checked_in), r.participant_name || '', r.participant_job_title || '',
          r.participant_company || '', r.participant_email || '', r.participant_phone || '', alsoBooth,
          ...enrCols(r.participant_email, enrichmentMap),
        ]);
      }
    }
  }
  const sessWs = XLSX.utils.aoa_to_sheet(sessRows);
  sessWs['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 22 },
                     ...colWidthsForEnr()];
  sessWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: sessHeaders.length - 1 } }];
  if (sessWs['A1']) sessWs['A1'].s = TITLE_STYLE;
  XLSX.utils.book_append_sheet(wb, sessWs, 'Session Scans');

  const safe = sponsor.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
  XLSX.writeFile(wb, `BTS_London_2026_Sponsor_Pack_${safe}.xlsx`);
};
