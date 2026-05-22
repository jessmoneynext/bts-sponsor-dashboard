import { ALIASES, SPONSOR_SESSIONS } from './constants.js';
import { recoverSessionCheckins } from './recovery.js';

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

  // Apply Vision Stage recovery: any check-ins originally captured by the
  // misconfigured stage scanner get reattributed to their proper session.
  const augmentedCheckins = recoverSessionCheckins(scans, checkins);

  const sponsorSessionNames = SPONSOR_SESSIONS.filter(s => s.sponsor === sponsorName);
  const sessionBlocks = sponsorSessionNames.map(({ session }) => {
    const norm = normalise(cleanSessionName(session));
    const rows = augmentedCheckins
      .filter(c => c.session_name_normalised === norm)
      .sort((a, b) => new Date(a.data_checked_in) - new Date(b.data_checked_in));
    return { session, rows };
  });

  return { standScans, accepted, pending, declined, sessionBlocks, sponsorMeets, seniorityTargeted };
};

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
