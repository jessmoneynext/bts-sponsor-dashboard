-- =============================================================
-- BTS London 2026 Sponsor Dashboard — Supabase Schema
-- Run this once in the Supabase SQL Editor, top to bottom.
-- =============================================================

-- ---- Stand scans (from Master Badge Scanning CSV) ----
create table if not exists stand_scans (
  scan_id text primary key,
  date_created_on timestamptz,
  source text,
  scanner_name text,
  scanner_company text,
  scanner_type text,
  attendee_name text,
  attendee_company text,
  attendee_job_title text,
  attendee_email text,
  attendee_phone text,
  attendee_location text,
  attendee_type text
);
create index if not exists idx_stand_scans_scanner_company on stand_scans (scanner_company);
create index if not exists idx_stand_scans_attendee_email on stand_scans (lower(attendee_email));
create index if not exists idx_stand_scans_source on stand_scans (source);

-- ---- Session check-ins ----
create table if not exists session_checkins (
  scan_id text primary key,
  data_checked_in timestamptz,
  session_id text,
  session_name text,
  session_name_normalised text,
  participant_name text,
  participant_company text,
  participant_job_title text,
  participant_email text,
  participant_phone text
);
create index if not exists idx_session_checkins_norm on session_checkins (session_name_normalised);

-- ---- Meetings ----
create table if not exists meetings (
  meeting_id text primary key,
  status text,
  meeting_date text,
  meeting_time text,
  location text,
  organizer_name text,
  organizer_email text,
  organizer_company text,
  organizer_job_title text,
  recipient_names text,
  recipient_emails text,
  recipient_companies text,
  recipient_job_titles text,
  personal_message text
);
create index if not exists idx_meetings_org_company on meetings (organizer_company);
create index if not exists idx_meetings_status on meetings (status);

-- ---- Enrichment (Grip + HubSpot merged, keyed on lowercase email) ----
create table if not exists enrichment (
  email text primary key,
  full_name text,
  company text,
  job_title text,
  headline text,
  summary text,
  picture_url text,
  seniority text,
  annual_budget text,
  budget_influence text,
  decision_role text,
  investment_timeframe text,
  sector_interested text,
  reason_attending text,
  challenge text,
  roundtable_themes text,
  product_categories text,
  default_locations text,
  seniority_targeted text,
  linkedin_url text,
  city text,
  industry text
);
create index if not exists idx_enrichment_company on enrichment (company);

-- =============================================================
-- ROW LEVEL SECURITY
-- Anyone with a valid login can read and write. The publishable
-- key alone (without a login) gets nothing.
-- =============================================================

alter table stand_scans enable row level security;
alter table session_checkins enable row level security;
alter table meetings enable row level security;
alter table enrichment enable row level security;

-- Drop any old policies first (so this script is rerunnable)
drop policy if exists "authed full access" on stand_scans;
drop policy if exists "authed full access" on session_checkins;
drop policy if exists "authed full access" on meetings;
drop policy if exists "authed full access" on enrichment;

create policy "authed full access" on stand_scans
  for all to authenticated using (true) with check (true);
create policy "authed full access" on session_checkins
  for all to authenticated using (true) with check (true);
create policy "authed full access" on meetings
  for all to authenticated using (true) with check (true);
create policy "authed full access" on enrichment
  for all to authenticated using (true) with check (true);

-- =============================================================
-- 30-DAY RETENTION (optional — schedule manually if you want it)
-- Run this query monthly, or set up pg_cron if you have it enabled.
-- =============================================================

-- delete from stand_scans where date_created_on < now() - interval '30 days';
-- delete from session_checkins where data_checked_in < now() - interval '30 days';
-- (Meetings and enrichment kept for the duration of the event cycle.)
