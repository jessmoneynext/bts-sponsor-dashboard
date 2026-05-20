import { ALIASES, SPONSOR_SESSIONS } from './constants.js';

export const normalise = (s) => {
  if (!s) return '';
  return String(s).toLowerCase().trim()
    .replace(/[\u2019\u2018]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u2011]/g, '-').replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
};

export const cleanSessionName = (s) => {
  if (!s) return '';
  return String(s).replace(/^(Panel|Keynote|Roundtable|Fireside|Workshop|Boardroom|Innovation Lab|Breakfast|Podcast Panel)( \([^)]+\))?:\s*/i, '').trim();
};

export const fmtDateTime = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getEnrichment = (email, enrichmentMap) => {
  if (!email || !enrichmentMap) return null;
  return enrichmentMap[String(email).toLowerCase().trim()] || null;
};

export const getSponsorTargeting = (sponsorName, enrichmentMap) => {
  const aliases = ALIASES[sponsorName] || [sponsorName];
  const aliasSet = new Set(aliases);
  for (const e of Object.values(enrichmentMap || {})) {
    if (aliasSet.has((e.company || '').trim()) && e.seniority_targeted) {
      return e.seniority_targeted;
    }
  }
  return null;
};

export const getSponsorData = (sponsorName, scans, checkins, meetings, enrichmentMap) => {
  const aliases = ALIASES[sponsorName] || [sponsorName];
  const aliasSet = new Set(aliases);
  const seniorityTargeted = getSponsorTargeting(sponsorName, enrichmentMap);

  const standScans = scans
    .filter(s => s.source === 'was_scanned' && aliasSet.has((s.scanner_company || '').trim()))
    .sort((a, b) => new Date(a.date_created_on) - new Date(b.date_created_on));

  const sponsorMeets = meetings.filter(m => {
    if (aliasSet.has((m.organizer_company || '').trim())) return true;
    const recip = (m.recipient_companies || '').split(',').map(c => c.trim());
    return recip.some(c => aliasSet.has(c));
  });

  const accepted = sponsorMeets.filter(m => m.status === 'accepted');
  const pending = sponsorMeets.filter(m => m.status === 'pending');
  const declined = sponsorMeets.filter(m => m.status === 'declined');

  const sponsorSessionNames = SPONSOR_SESSIONS.filter(s => s.sponsor === sponsorName);
  const sessionBlocks = sponsorSessionNames.map(({ session }) => {
    const norm = normalise(cleanSessionName(session));
    const rows = checkins
      .filter(c => c.session_name_normalised === norm)
      .sort((a, b) => new Date(a.data_checked_in) - new Date(b.data_checked_in));
    return { session, rows };
  });

  return { standScans, accepted, pending, declined, sessionBlocks, sponsorMeets, seniorityTargeted };
};

// Lead score: combines touchpoint count with buyer signals
export const leadScore = (touchpoints, enr) => {
  let pts = 0;
  // Multi-touchpoint
  if (touchpoints >= 3) pts += 2;
  else if (touchpoints === 2) pts += 1;
  // Buyer signals from enrichment
  if (enr) {
    const tf = (enr.investment_timeframe || '').toLowerCase();
    if (tf.includes('3 months')) pts += 3;
    else if (tf.includes('6 months')) pts += 2;
    else if (tf.includes('12 months')) pts += 1;
    const bg = (enr.annual_budget || '').toLowerCase();
    if (bg.includes('10m') || (bg.includes('2m') && !bg.includes('500'))) pts += 2;
    else if (bg.includes('500k')) pts += 1;
    const dr = (enr.decision_role || '').toLowerCase();
    if (dr.includes('final') || dr.includes('decision-making committee')) pts += 2;
    else if (dr.includes('influencer') || dr.includes('recommender')) pts += 1;
    const bi = (enr.budget_influence || '').toLowerCase();
    if (bi.includes('control')) pts += 1;
  }
  if (pts >= 6) return { tier: 'Hot', pts };
  if (pts >= 3) return { tier: 'Warm', pts };
  return { tier: 'Cold', pts };
};

// Decode arrived status for a specific counterparty in a meeting
// recipient_arrived is comma-joined parallel to recipient_emails
const arrivedFor = (email, namesField, arrivedField) => {
  if (!email || !namesField || !arrivedField) return '';
  const emails = namesField.split(',').map(s => s.trim().toLowerCase());
  const arrived = arrivedField.split(',').map(s => s.trim());
  const idx = emails.indexOf(email.toLowerCase());
  return idx >= 0 ? (arrived[idx] || '') : '';
};

// Build a consolidated per-attendee touchpoint summary for the sponsor.
// Dedup by lowercase email. Each row has touchpoints + lead score.
export const getConsolidatedAttendees = (sponsorName, sponsorData, enrichmentMap) => {
  const { standScans, accepted, pending, declined, sessionBlocks } = sponsorData;
  const aliases = new Set(ALIASES[sponsorName] || [sponsorName]);
  const byEmail = {};

  const upsert = (email, name, jobTitle, company, source) => {
    if (!email) return;
    const k = email.toLowerCase().trim();
    if (!byEmail[k]) {
      byEmail[k] = {
        email: k, name: name || '', job_title: jobTitle || '', company: company || '',
        stand_scans: 0, sessions_attended: 0, meetings_accepted: 0, meetings_pending: 0,
        meetings_declined: 0, session_names: [], meeting_arrived: '',
      };
    }
    if (name && !byEmail[k].name) byEmail[k].name = name;
    if (jobTitle && !byEmail[k].job_title) byEmail[k].job_title = jobTitle;
    if (company && !byEmail[k].company) byEmail[k].company = company;
    if (source.kind === 'scan') byEmail[k].stand_scans += 1;
    else if (source.kind === 'session') {
      byEmail[k].sessions_attended += 1;
      if (source.session) byEmail[k].session_names.push(source.session);
    }
    else if (source.kind === 'meeting') {
      if (source.status === 'accepted') byEmail[k].meetings_accepted += 1;
      else if (source.status === 'pending') byEmail[k].meetings_pending += 1;
      else if (source.status === 'declined') byEmail[k].meetings_declined += 1;
      if (source.arrived && !byEmail[k].meeting_arrived) byEmail[k].meeting_arrived = source.arrived;
    }
  };

  for (const s of standScans) {
    upsert(s.attendee_email, s.attendee_name, s.attendee_job_title, s.attendee_company, { kind: 'scan' });
  }
  for (const { session, rows } of sessionBlocks) {
    for (const r of rows) upsert(r.participant_email, r.participant_name, r.participant_job_title, r.participant_company, { kind: 'session', session });
  }
  const addMeeting = (m, status) => {
    const orgIn = aliases.has((m.organizer_company || '').trim());
    if (orgIn) {
      const emails = (m.recipient_emails || '').split(',').map(s => s.trim());
      const names = (m.recipient_names || '').split(',').map(s => s.trim());
      const jobs = (m.recipient_job_titles || '').split(',').map(s => s.trim());
      const cos = (m.recipient_companies || '').split(',').map(s => s.trim());
      const arrivedArr = (m.recipient_arrived || '').split(',').map(s => s.trim());
      for (let i = 0; i < emails.length; i++) {
        if (!emails[i]) continue;
        upsert(emails[i], names[i] || '', jobs[i] || '', cos[i] || '',
               { kind: 'meeting', status, arrived: arrivedArr[i] || '' });
      }
    } else {
      upsert(m.organizer_email, m.organizer_name, m.organizer_job_title, m.organizer_company,
             { kind: 'meeting', status, arrived: m.organizer_arrived || '' });
    }
  };
  for (const m of accepted) addMeeting(m, 'accepted');
  for (const m of pending) addMeeting(m, 'pending');
  for (const m of declined) addMeeting(m, 'declined');

  const enriched = Object.values(byEmail).map(p => {
    const enr = getEnrichment(p.email, enrichmentMap);
    const touchpoints = p.stand_scans + p.sessions_attended + p.meetings_accepted + p.meetings_pending;
    const score = leadScore(touchpoints, enr);
    return { ...p, touchpoints, enr, score: score.tier, score_pts: score.pts };
  });

  const tierRank = { Hot: 0, Warm: 1, Cold: 2 };
  enriched.sort((a, b) => tierRank[a.score] - tierRank[b.score] || b.touchpoints - a.touchpoints || b.score_pts - a.score_pts);
  return enriched;
};

// Reps performance — count unique people scanned per sponsor rep
export const getRepPerformance = (sponsorData) => {
  const byRep = {};
  for (const s of sponsorData.standScans) {
    const rep = s.scanner_name || '(unknown rep)';
    if (!byRep[rep]) byRep[rep] = { rep, scans: 0, unique_emails: new Set() };
    byRep[rep].scans += 1;
    if (s.attendee_email) byRep[rep].unique_emails.add(s.attendee_email.toLowerCase());
  }
  return Object.values(byRep).map(r => ({
    rep: r.rep, scans: r.scans, unique: r.unique_emails.size,
  })).sort((a, b) => b.scans - a.scans);
};

export { arrivedFor };

// Pill colour logic — green = strong buyer signal, amber = warm, slate = neutral
export const pillTone = (kind, value) => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (kind === 'timeframe') {
    if (v.includes('3 months') || v.includes('6 months')) return 'emerald';
    if (v.includes('12 months')) return 'amber';
    if (v.includes('no active')) return null;
    return 'slate';
  }
  if (kind === 'budget') {
    if (v.includes('10m') || (v.includes('2m') && !v.includes('500'))) return 'emerald';
    if (v.includes('500k')) return 'amber';
    return 'slate';
  }
  if (kind === 'decisionRole') {
    if (v.includes('final') || v.includes('decision-making committee') || v.includes('decision maker')) return 'emerald';
    if (v.includes('influencer') || v.includes('recommender')) return 'amber';
    if (v.includes('no involvement')) return null;
    return 'slate';
  }
  if (kind === 'seniority') {
    if (/c[-\s]?suite|chair|board|vp|vice president|director|head of/i.test(value)) return 'emerald';
    if (/manager|lead/i.test(value)) return 'amber';
    return 'slate';
  }
  if (kind === 'influence') {
    if (v.includes('control')) return 'emerald';
    if (v.includes('influence')) return 'amber';
    return null;
  }
  return 'slate';
};
