import * as XLSX from 'xlsx';
import { ALIASES } from './constants.js';
import { fmtDateTime, getEnrichment, getConsolidatedAttendees, getRepPerformance, arrivedFor } from './lib.js';

// ===== BTS London 2026 brand palette =====
const NAVY = '001630';          // Universal wordmark navy
const GREEN_DARK = '004C3F';    // BTS dark green
const GREEN_MID = '08B76C';     // BTS mid green
const GREEN_BRIGHT = '35D86B';  // BTS bright green (Hot leads)
const AMBER = 'F59E0B';
const SLATE = '475569';
const SLATE_PALE = 'F1F5F9';
const BAND = 'F8FAFC';
const WHITE = 'FFFFFF';
const FONT = 'Montserrat';

const border = (color = 'E2E8F0') => ({
  top: { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left: { style: 'thin', color: { rgb: color } },
  right: { style: 'thin', color: { rgb: color } },
});

const COVER_TITLE = { fill: { fgColor: { rgb: NAVY } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 22 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const COVER_SUBTITLE = { fill: { fgColor: { rgb: GREEN_DARK } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 13 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const COVER_META = { fill: { fgColor: { rgb: GREEN_MID } }, font: { name: FONT, color: { rgb: WHITE }, sz: 10 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const TITLE_STYLE = { fill: { fgColor: { rgb: NAVY } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 14 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const SECTION_STYLE = { fill: { fgColor: { rgb: GREEN_DARK } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 12 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const SUBHEAD_STYLE = { fill: { fgColor: { rgb: GREEN_MID } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 11 }, alignment: { vertical: 'center', horizontal: 'left', indent: 1 } };
const HEADER_STYLE = { fill: { fgColor: { rgb: NAVY } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 10 }, alignment: { vertical: 'center', wrapText: true }, border: border() };
const LABEL_STYLE = { font: { name: FONT, color: { rgb: NAVY }, bold: true, sz: 10 }, alignment: { vertical: 'center' } };
const BODY_STYLE = { font: { name: FONT, sz: 10 }, alignment: { vertical: 'top', wrapText: true } };
const BAND_STYLE = { fill: { fgColor: { rgb: BAND } }, font: { name: FONT, sz: 10 }, alignment: { vertical: 'top', wrapText: true } };
const FOOTER_STYLE = { fill: { fgColor: { rgb: NAVY } }, font: { name: FONT, color: { rgb: WHITE }, sz: 9, italic: true }, alignment: { vertical: 'center', horizontal: 'center' } };
const HOT_STYLE = { fill: { fgColor: { rgb: GREEN_BRIGHT } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 10 }, alignment: { vertical: 'center', horizontal: 'center' }, border: border() };
const WARM_STYLE = { fill: { fgColor: { rgb: AMBER } }, font: { name: FONT, color: { rgb: WHITE }, bold: true, sz: 10 }, alignment: { vertical: 'center', horizontal: 'center' }, border: border() };
const COLD_STYLE = { fill: { fgColor: { rgb: SLATE_PALE } }, font: { name: FONT, color: { rgb: SLATE }, sz: 10 }, alignment: { vertical: 'center', horizontal: 'center' }, border: border() };

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

const applyBanding = (ws, startRow, endRow, colCount) => {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 0) continue;
    for (let c = 0; c < colCount; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && !cell.s) cell.s = BAND_STYLE;
    }
  }
};

const FOOTER_TEXT = 'Banking Transformation Summit London 2026 · Tobacco Dock · 19-20 May 2026 · Prepared by MoneyNext';

const addFooter = (ws, rows, colCount) => {
  rows.push([]); rows.push([FOOTER_TEXT]);
  const r = rows.length - 1;
  XLSX.utils.sheet_add_aoa(ws, [[FOOTER_TEXT]], { origin: { r, c: 0 } });
  const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
  if (cell) cell.s = FOOTER_STYLE;
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
};

export const exportSponsorPack = (sponsor, data, enrichmentMap) => {
  const { standScans, accepted, pending, declined, sessionBlocks, seniorityTargeted } = data;
  const wb = XLSX.utils.book_new();
  const consolidated = getConsolidatedAttendees(sponsor.name, data, enrichmentMap);
  const reps = getRepPerformance(data);
  const aliasSet = new Set(ALIASES[sponsor.name] || [sponsor.name]);
  const tierCounts = { Hot: 0, Warm: 0, Cold: 0 };
  consolidated.forEach(p => tierCounts[p.score]++);

  // ===== 1. COVER =====
  const sumRows = [
    ['BANKING TRANSFORMATION SUMMIT LONDON 2026'],
    ['Sponsor Engagement Pack'],
    ['19-20 May 2026 · Tobacco Dock, London'],
    [],
    ['SPONSOR', sponsor.name],
    ['Tier', sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1)],
    ['Pack generated', new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
    ['Your stated target seniority', seniorityTargeted || '(not set in Grip)'],
    [],
    ['HOW TO USE THIS PACK'],
    ['Start with the Action List tab. Every person who engaged with your stand, booked a meeting with your team, or attended your session is on it, deduplicated and sorted by lead score. Hot leads at the top have strong buyer signals plus multiple touchpoints. Call them first.'],
    ['Meetings, Stand Scans and Session Scans tabs give the raw event-by-event view with full enrichment columns including mobile numbers and LinkedIn URLs.'],
    [],
    ['LEAD SCORE BREAKDOWN'],
    ['Hot leads', tierCounts.Hot],
    ['Warm leads', tierCounts.Warm],
    ['Cold leads', tierCounts.Cold],
    ['Total unique people you engaged', consolidated.length],
    [],
    ['ENGAGEMENT METRICS'],
    ['Accepted meetings', accepted.length],
    ['Pending meetings', pending.length],
    ['Declined meetings', declined.length],
    ['Total stand scans', standScans.length],
    ['Sponsored sessions you ran', sessionBlocks.length],
    ['Total session check-ins', sessionBlocks.reduce((a, b) => a + b.rows.length, 0)],
  ];
  let repsHeaderRow = -1;
  if (reps.length > 0) {
    sumRows.push([]); sumRows.push(['YOUR REPS · BOOTH SCAN PERFORMANCE']);
    repsHeaderRow = sumRows.length;
    sumRows.push(['Rep name', 'Total scans', 'Unique people scanned']);
    for (const r of reps) sumRows.push([r.rep, r.scans, r.unique]);
  }
  sumRows.push([]); sumRows.push(['Questions about this pack? Contact your MoneyNext account manager.']);

  const sumWs = XLSX.utils.aoa_to_sheet(sumRows);
  sumWs['!cols'] = [{ wch: 50 }, { wch: 24 }, { wch: 22 }];
  sumWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, { s: { r: 9, c: 0 }, e: { r: 9, c: 2 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 2 } }, { s: { r: 11, c: 0 }, e: { r: 11, c: 2 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 2 } }, { s: { r: 19, c: 0 }, e: { r: 19, c: 2 } },
  ];
  if (sumWs['A1']) sumWs['A1'].s = COVER_TITLE;
  if (sumWs['A2']) sumWs['A2'].s = COVER_SUBTITLE;
  if (sumWs['A3']) sumWs['A3'].s = COVER_META;
  if (sumWs['A5']) sumWs['A5'].s = LABEL_STYLE;
  if (sumWs['B5']) sumWs['B5'].s = { font: { name: FONT, sz: 14, bold: true, color: { rgb: NAVY } } };
  ['A6', 'A7', 'A8'].forEach(c => { if (sumWs[c]) sumWs[c].s = LABEL_STYLE; });
  ['A10', 'A14', 'A20'].forEach(c => { if (sumWs[c]) sumWs[c].s = SECTION_STYLE; });
  ['A11', 'A12'].forEach(c => { if (sumWs[c]) sumWs[c].s = BODY_STYLE; });
  ['A15', 'A16', 'A17', 'A18', 'A21', 'A22', 'A23', 'A24', 'A25', 'A26'].forEach(c => { if (sumWs[c]) sumWs[c].s = LABEL_STYLE; });
  if (repsHeaderRow >= 0) {
    const titleCell = sumWs[XLSX.utils.encode_cell({ r: repsHeaderRow - 1, c: 0 })];
    if (titleCell) titleCell.s = SECTION_STYLE;
    sumWs['!merges'].push({ s: { r: repsHeaderRow - 1, c: 0 }, e: { r: repsHeaderRow - 1, c: 2 } });
    for (let c = 0; c < 3; c++) {
      const hc = sumWs[XLSX.utils.encode_cell({ r: repsHeaderRow, c })];
      if (hc) hc.s = HEADER_STYLE;
    }
    applyBanding(sumWs, repsHeaderRow + 1, repsHeaderRow + reps.length, 3);
  }
  // Footer question line
  for (let r = sumRows.length - 2; r < sumRows.length; r++) {
    const cell = sumWs[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell && typeof cell.v === 'string' && cell.v.startsWith('Questions')) {
      cell.s = { font: { name: FONT, sz: 9, italic: true, color: { rgb: SLATE } } };
      sumWs['!merges'].push({ s: { r, c: 0 }, e: { r, c: 2 } });
    }
  }
  sumWs['!rows'] = [
    { hpt: 36 }, { hpt: 26 }, { hpt: 22 }, { hpt: 8 },
    { hpt: 22 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 22 }, { hpt: 32 }, { hpt: 32 }, { hpt: 8 }, { hpt: 22 },
  ];
  addFooter(sumWs, sumRows, 3);
  XLSX.utils.book_append_sheet(wb, sumWs, 'Cover');

  // ===== 2. ACTION LIST =====
  const actionHeaders = ['Lead score', 'Score pts', 'Touchpoints', 'Name', 'Job title', 'Company', 'Email',
                         'Stand scans', 'Sessions attended', 'Session names', 'Meetings accepted', 'Meetings pending',
                         'Meetings declined', 'Showed up?', ...ENR_HEADERS];
  const actionRows = [[`Action List · ${sponsor.name} · ${consolidated.length} unique people, sorted by lead score`]];
  actionRows.push(actionHeaders);
  if (consolidated.length === 0) actionRows.push(['No engagement data yet', ...Array(actionHeaders.length - 1).fill('')]);
  else for (const p of consolidated) actionRows.push([
    p.score, p.score_pts, p.touchpoints, p.name, p.job_title, p.company, p.email,
    p.stand_scans, p.sessions_attended, p.session_names.join('; '),
    p.meetings_accepted, p.meetings_pending, p.meetings_declined, p.meeting_arrived || '',
    ...enrCols(p.email, enrichmentMap),
  ]);
  const actionWs = XLSX.utils.aoa_to_sheet(actionRows);
  actionWs['!cols'] = [
    { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 22 }, { wch: 32 },
    { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 11 },
    ...colWidthsForEnr(),
  ];
  actionWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: actionHeaders.length - 1 } }];
  if (actionWs['A1']) actionWs['A1'].s = TITLE_STYLE;
  for (let c = 0; c < actionHeaders.length; c++) {
    const cell = actionWs[XLSX.utils.encode_cell({ r: 1, c })];
    if (cell) cell.s = HEADER_STYLE;
  }
  applyBanding(actionWs, 2, actionRows.length - 1, actionHeaders.length);
  for (let r = 2; r < actionRows.length; r++) {
    const cell = actionWs[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!cell) continue;
    if (cell.v === 'Hot') cell.s = HOT_STYLE;
    else if (cell.v === 'Warm') cell.s = WARM_STYLE;
    else if (cell.v === 'Cold') cell.s = COLD_STYLE;
  }
  actionWs['!freeze'] = { xSplit: 0, ySplit: 2 };
  actionWs['!rows'] = [{ hpt: 28 }, { hpt: 32 }];
  addFooter(actionWs, actionRows, actionHeaders.length);
  XLSX.utils.book_append_sheet(wb, actionWs, 'Action List');

  // ===== 3. MEETINGS =====
  const meetingsRows = [[`Meetings · ${sponsor.name}`]];
  const meetHeaders = ['Date', 'Time', 'Status', 'Showed up?', 'Location', 'Your team rep', 'Counterparty',
                       'Job title', 'Company', 'Personal message (full)', ...ENR_HEADERS];
  const meetRow = (m) => {
    const orgIn = aliasSet.has((m.organizer_company || '').trim());
    const ours = orgIn ? m.organizer_name : m.recipient_names;
    const cp = orgIn ? m.recipient_names : m.organizer_name;
    const cpTitle = orgIn ? m.recipient_job_titles : m.organizer_job_title;
    const cpCo = orgIn ? m.recipient_companies : m.organizer_company;
    const cpEmail = orgIn ? (m.recipient_emails || '').split(',')[0]?.trim() : m.organizer_email;
    const arrived = orgIn ? arrivedFor(cpEmail, m.recipient_emails, m.recipient_arrived) : (m.organizer_arrived || '');
    return [m.meeting_date || '', m.meeting_time || '', (m.status || '').replace(/\b\w/g, c => c.toUpperCase()),
            arrived || '(no data)', m.location || '', ours || '', cp || '', cpTitle || '', cpCo || '',
            String(m.personal_message || ''), ...enrCols(cpEmail, enrichmentMap)];
  };
  const sortMeets = (arr) => [...arr].sort((a, b) => {
    const da = new Date(a.meeting_date); const db = new Date(b.meeting_date);
    return da - db || (a.meeting_time || '').localeCompare(b.meeting_time || '');
  });
  const sectionStart = {};
  for (const [label, arr] of [['Accepted', accepted], ['Pending', pending], ['Declined', declined]]) {
    meetingsRows.push([]); meetingsRows.push([`${label} (${arr.length})`]);
    sectionStart[label] = meetingsRows.length - 1;
    meetingsRows.push(meetHeaders);
    if (arr.length === 0) meetingsRows.push([`No ${label.toLowerCase()} meetings`, ...Array(meetHeaders.length - 1).fill('')]);
    else for (const m of sortMeets(arr)) meetingsRows.push(meetRow(m));
  }
  const meetWs = XLSX.utils.aoa_to_sheet(meetingsRows);
  meetWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 11 }, { wch: 11 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
                     { wch: 28 }, { wch: 22 }, { wch: 60 }, ...colWidthsForEnr()];
  meetWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: meetHeaders.length - 1 } }];
  if (meetWs['A1']) meetWs['A1'].s = TITLE_STYLE;
  for (const label of ['Accepted', 'Pending', 'Declined']) {
    const sectionRow = sectionStart[label];
    const cell = meetWs[XLSX.utils.encode_cell({ r: sectionRow, c: 0 })];
    if (cell) cell.s = SUBHEAD_STYLE;
    meetWs['!merges'].push({ s: { r: sectionRow, c: 0 }, e: { r: sectionRow, c: meetHeaders.length - 1 } });
    for (let c = 0; c < meetHeaders.length; c++) {
      const hc = meetWs[XLSX.utils.encode_cell({ r: sectionRow + 1, c })];
      if (hc) hc.s = HEADER_STYLE;
    }
  }
  meetWs['!freeze'] = { xSplit: 0, ySplit: 1 };
  addFooter(meetWs, meetingsRows, meetHeaders.length);
  XLSX.utils.book_append_sheet(wb, meetWs, 'Meetings');

  // ===== 4. STAND SCANS =====
  const scanRows = [[`Stand Scans · ${sponsor.name} · ${standScans.length} total`]];
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
  for (let c = 0; c < scanHeaders.length; c++) {
    const cell = scanWs[XLSX.utils.encode_cell({ r: 1, c })];
    if (cell) cell.s = HEADER_STYLE;
  }
  applyBanding(scanWs, 2, scanRows.length - 1, scanHeaders.length);
  scanWs['!freeze'] = { xSplit: 0, ySplit: 2 };
  addFooter(scanWs, scanRows, scanHeaders.length);
  XLSX.utils.book_append_sheet(wb, scanWs, 'Stand Scans');

  // ===== 5. SESSION SCANS =====
  const sessRows = [[`Session Scans · ${sponsor.name}`]];
  const sessHeaders = ['Check-in time', 'Attendee name', 'Job title', 'Company', 'Email', 'Phone (on badge)',
                       'Also scanned at your booth?', ...ENR_HEADERS];
  const standEmails = new Set(standScans.map(s => (s.attendee_email || '').toLowerCase()).filter(Boolean));
  const sessSectionRows = [];
  if (sessionBlocks.length === 0) {
    sessRows.push([]); sessRows.push(['This sponsor does not have a sponsored stage session in the agenda.']);
  } else {
    for (const { session, rows } of sessionBlocks) {
      sessRows.push([]); sessRows.push([`${session}  (${rows.length} check-ins)`]);
      sessSectionRows.push(sessRows.length - 1);
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
  for (const sectionRow of sessSectionRows) {
    const cell = sessWs[XLSX.utils.encode_cell({ r: sectionRow, c: 0 })];
    if (cell) cell.s = SUBHEAD_STYLE;
    sessWs['!merges'].push({ s: { r: sectionRow, c: 0 }, e: { r: sectionRow, c: sessHeaders.length - 1 } });
    for (let c = 0; c < sessHeaders.length; c++) {
      const hc = sessWs[XLSX.utils.encode_cell({ r: sectionRow + 1, c })];
      if (hc) hc.s = HEADER_STYLE;
    }
  }
  addFooter(sessWs, sessRows, sessHeaders.length);
  XLSX.utils.book_append_sheet(wb, sessWs, 'Session Scans');

  const safe = sponsor.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
  XLSX.writeFile(wb, `BTS_London_2026_Sponsor_Pack_${safe}.xlsx`);
};
