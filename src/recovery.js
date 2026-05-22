// src/recovery.js
//
// Vision Stage Session Check-In Recovery
// =======================================
// During BTS London 2026, a temp scanner operator (Nadia Ismail) was assigned
// to scan attendees into the Vision Stage sessions but her device was
// registered as a generic stand scanner with no sponsor company. Her scans
// went into the master badge scanning data instead of session check-ins.
//
// This module reattributes her stand scans that fall within Vision Stage
// session windows as session check-ins for the relevant sponsor. Confirmed
// via timing analysis on 22 May 2026: 315 of her 864 scans line up with 6 of
// the 8 Vision Stage sessions.
//
// Two Vision Stage sessions remain genuinely zero in her data:
//   - ElevenLabs second session at 11:55 on Day 1 (their first session at
//     Headliners scanned cleanly with 100 check-ins)
//   - Started PR After Hours Live Lounge at 16:55 on Day 1

import { normalise, cleanSessionName } from './lib.js';

// Scanner identity: matched on name because the stand_scans schema doesn't
// store the scanner's email, only their name, company, and type.
const SCANNER_NAME = 'Nadia Ismail';

// Each window starts 10 minutes before the agenda time (to catch early
// arrivals) and ends at the published session end time.
const WINDOWS = [
  { sponsor: 'EXL',      session: 'Reimagining Banking Operations using Data & AI: From Contact Centers to Experience Centers', day: '2026-05-19', start: '10:35', end: '11:05' },
  { sponsor: 'Flowable', session: 'Real AI: Operational Use Cases Delivering Impact Today',                                     day: '2026-05-19', start: '11:05', end: '11:45' },
  { sponsor: 'Adesso',   session: 'The AI Act Reality Check: From Principle to Practice',                                       day: '2026-05-19', start: '12:15', end: '12:55' },
  { sponsor: 'Alinia',   session: 'Responsible AI at Scale: From Pilots to Bank-Wide Execution',                                day: '2026-05-19', start: '13:45', end: '14:25' },
  { sponsor: 'Airia',    session: 'Out of the Shadows: A Strategic Framework for AI Governance in Financial Services',          day: '2026-05-19', start: '14:25', end: '14:55' },
  { sponsor: 'Element',  session: 'Promises vs Platforms: Can Modernisation Actually Deliver Momentum?',                        day: '2026-05-20', start: '10:15', end: '10:55' },
];

const RECOVERED_SPONSORS = new Set(WINDOWS.map(w => w.sponsor));

/**
 * Augments session_checkins with recovered Vision Stage entries.
 * Pure function: returns a new array, mutates nothing.
 */
export const recoverSessionCheckins = (scans, checkins) => {
  if (!Array.isArray(scans) || !Array.isArray(checkins)) {
    return checkins || [];
  }

  // Dedup key: attendee email + normalised session name. Stops us double-
  // counting if Grip ever back-fills genuine check-ins for these sessions.
  const seen = new Set(
    checkins.map(c =>
      `${(c.participant_email || '').toLowerCase()}|${normalise(cleanSessionName(c.session_name))}`
    )
  );

  const recovered = [];

  for (const w of WINDOWS) {
    const startMs = Date.parse(`${w.day}T${w.start}:00`);
    const endMs   = Date.parse(`${w.day}T${w.end}:00`);
    const sessionNorm = normalise(cleanSessionName(w.session));

    for (const scan of scans) {
      if (scan.source !== 'was_scanned') continue;
      if ((scan.scanner_name || '').trim() !== SCANNER_NAME) continue;

      const ts = Date.parse(scan.date_created_on);
      if (isNaN(ts) || ts < startMs || ts > endMs) continue;

      const email = (scan.attendee_email || '').toLowerCase();
      const dedupKey = `${email}|${sessionNorm}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      recovered.push({
        scan_id: `recovered_${scan.scan_id}`,
        data_checked_in: scan.date_created_on,
        session_id: null,
        session_name: w.session,
        session_name_normalised: sessionNorm,
        participant_name: scan.attendee_name,
        participant_company: scan.attendee_company,
        participant_job_title: scan.attendee_job_title,
        participant_email: scan.attendee_email,
        participant_phone: scan.attendee_phone,
        _recovered: true,
      });
    }
  }

  return [...checkins, ...recovered];
};

/**
 * Whether the sponsor's pack should display the Vision Stage recovery
 * footnote on the Summary tab.
 */
export const isRecoveredSponsor = (sponsorName) => RECOVERED_SPONSORS.has(sponsorName);

/**
 * The note to display on recovered sponsors' pack Summary tab.
 */
export const RECOVERY_FOOTNOTE =
  'Note on session check-ins: Your Vision Stage session attendance figures ' +
  'were reconciled post-event. The on-stage attendee scanner was registered ' +
  'to a temporary operator profile during the event, so check-ins did not ' +
  'initially attribute to your session in the Grip platform. We have ' +
  'recovered the scans by matching their timestamps to the published agenda. ' +
  'Final figures may be marginally understated.';
