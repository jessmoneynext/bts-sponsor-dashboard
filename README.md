# BTS London 2026 Sponsor Engagement Dashboard

A password-protected web app for browsing sponsor engagement data (meetings, stand scans, session check-ins) with attendee enrichment from Grip and HubSpot. Drop new exports in at any point and they merge with what's there. Download per-sponsor Excel packs to send out.

**Stack**: React + Vite frontend, Supabase backend (Postgres + Auth), Netlify hosting.

---

## What you'll have at the end

- A URL like `https://bts-sponsors.netlify.app` (or your custom domain)
- A login screen on the front door, gated by the Supabase team account you create
- Three tabs inside: Uploads (drop new exports), Sponsor view (browse one at a time with dashboard + Excel export), All sponsors (overview index)
- Data sits in your Supabase project, deduplicated on natural keys (Scan ID, Meeting ID), 1,797 attendee enrichment profiles pre-loaded

---

## Setup, step by step

This takes 25–40 minutes the first time. You only do it once.

### 1. Set up the Supabase database (5 min)

1. Open your Supabase project (https://bjiivmiulrmpvkyxuhkd.supabase.co)
2. In the left sidebar, click **SQL Editor** → **New query**
3. Open `supabase/schema.sql` from this folder, copy the whole thing, paste it in, and click **Run**
4. You should see "Success. No rows returned." That's the four tables (`stand_scans`, `session_checkins`, `meetings`, `enrichment`) plus the row-level security policies created.

### 2. Import the enrichment data (5 min)

1. In Supabase, click **Table Editor** in the left sidebar
2. Click the `enrichment` table
3. Click **Insert** → **Import data from CSV** (or the upload icon near the top)
4. Upload `data/enrichment.csv` from this folder. Supabase will auto-detect the columns
5. Confirm. You should see 1,797 rows imported.

This is the merged Grip + HubSpot attendee profile data. It powers all the buyer signal pills (seniority, budget, decision role, investment timeframe) plus LinkedIn URLs, city, industry.

### 3. Create the team login account (3 min)

1. In Supabase, click **Authentication** → **Users** in the left sidebar
2. Click **Add user** → **Create new user**
3. Enter an email and a strong password. Suggestions:
   - Email: `bts-team@moneynext.com` (or any team alias you have access to)
   - Password: generate a strong one in 1Password / Bitwarden and save it there
4. Tick **Auto Confirm User** so you don't have to verify the email
5. Click Create

This is the single shared account everyone on your team uses to log in. Anyone you give the password to can access the dashboard.

If you'd rather have one user per person (better audit trail), create individual accounts here instead. The app handles either approach.

### 4. Get your Supabase credentials (2 min)

1. In Supabase, click **Project Settings** (the gear icon) → **API**
2. You need two values:
   - **Project URL** (something like `https://bjiivmiulrmpvkyxuhkd.supabase.co`)
   - **Project API Keys** → the one labelled `anon` `public` (the new format starts with `sb_publishable_`)
3. Copy these — you'll paste them into Netlify in step 7

**Important**: never use the `service_role` key in this app. That key bypasses all security. The publishable/anon key is what you want; it's designed to be in client code.

### 5. Put this folder into a GitHub repo (5 min)

You'll need a GitHub account. If you don't have one, sign up at github.com first.

The simplest path (no command line needed):

1. Go to https://github.com/new
2. Name the repo `bts-sponsor-dashboard` (private)
3. Click **Create repository**
4. On the next page, click **uploading an existing file**
5. Drag this entire folder's contents into the upload area. **Don't include the `node_modules` folder** if you have one; check there isn't a `.env` file with secrets in there either (the `.gitignore` excludes both, but worth checking)
6. Commit

If you're comfortable with the command line, use git push instead — same result.

### 6. Deploy to Netlify (5 min)

1. Go to https://app.netlify.com (sign up if you haven't)
2. Click **Add new site** → **Import an existing project**
3. Choose **Deploy with GitHub**, authorise Netlify to access your repos, pick `bts-sponsor-dashboard`
4. Netlify auto-detects it as a Vite project. The build command (`npm run build`) and publish directory (`dist`) should already be filled in — they come from the `netlify.toml` in this repo
5. Click **Deploy site**

The first build takes 1–2 minutes. It'll fail at the end because the env vars aren't set yet — that's expected.

### 7. Add the Supabase credentials to Netlify (2 min)

1. In your new Netlify site, click **Site configuration** → **Environment variables**
2. Click **Add a variable** → **Add a single variable**, and add these two:
   - Key: `VITE_SUPABASE_URL` → Value: your Supabase Project URL from step 4
   - Key: `VITE_SUPABASE_PUBLISHABLE_KEY` → Value: your `sb_publishable_...` key from step 4
3. Click **Deploys** in the left sidebar → **Trigger deploy** → **Deploy site**

After ~1 minute the deploy goes green. Click the URL at the top (something like `https://random-name-12345.netlify.app`) and the login screen appears.

### 8. First login

Go to the deployed URL. Log in with the team email and password from step 3. You should see an empty dashboard with the enrichment count showing 1,797 in the header.

### 9. (Optional) Custom domain and friendlier URL

In Netlify, **Domain management** → **Add custom domain** or **Options** → **Edit site name** to set something like `bts-sponsors.netlify.app`.

---

## Daily use

For Natalie or whoever runs this during the event:

1. Open the URL, sign in with the team email + password
2. Go to **Uploads**. Drop in the latest exports as they come from Grip:
   - Master Badge Scanning → CSV file
   - Session Check-Ins → CSV file
   - Meetings List → Excel file
3. The upload runs in a few seconds. Any duplicate records are merged on their unique IDs, any meeting whose status changed from pending to accepted gets updated. Nothing duplicates.
4. Click **Sponsor view**, pick any sponsor from the dropdown, see their data with buyer signal pills under each attendee name. LinkedIn icons link out to the person's profile.
5. Click **Download Excel pack** to get the same xlsx as before with all the data tabs and enrichment columns.
6. **All sponsors** gives the index view if you want overview numbers.

The enrichment table is set-and-forget — you imported it in step 2 and it stays put. If you want to refresh it (new event, updated data), go to the Supabase Table Editor for the `enrichment` table, delete all rows, re-import a fresh CSV.

---

## Updating the app

If you want to change something — a new sponsor, a new sponsored session, change the styling — edit the code locally or via the GitHub web editor and commit. Netlify auto-rebuilds and redeploys within 1–2 minutes.

Key files to know:

- `src/constants.js` — sponsor list, aliases, sponsored sessions. Edit this for content changes.
- `src/App.jsx` — the main UI.
- `src/exportPack.js` — Excel export logic.
- `src/lib.js` — pill colour rules and data filtering logic.

---

## Security notes

- The Supabase publishable/anon key in `.env` is safe to ship in client code by design. Row-level security on every table requires a valid Supabase auth session, so anyone without a login gets nothing.
- The `service_role` key (if you ever see one starting with `eyJ` or `sb_secret_`) is the master key and must never be used in this app. It bypasses RLS.
- Anyone with the team login password has full read/write access to all tables. If someone leaves the team, change the password in Supabase Auth (Users → ... → Reset password).
- Data retention: there's no automatic cleanup. To wipe the dynamic tables after an event, run the commented-out DELETE statements at the bottom of `schema.sql`, or clear via the Supabase Table Editor.
- The data contains personal contact information (names, emails, phone numbers, job titles). Treat the URL and password as confidential.

---

## Troubleshooting

**Upload says "rows: 0" after uploading**: the CSV/XLSX might have a different column header structure than expected. The mapper functions in `src/App.jsx` (look for `mapScans`, `mapCheckins`, `mapMeetings`) check for the exact column names from Grip's exports. If Grip changes a column name, update the mapper.

**Login fails with "Invalid login credentials"**: the team auth user wasn't created, or you typed the email/password wrong. Go to Supabase → Authentication → Users to verify.

**Dashboard is empty even though tables have data**: check the browser console (right-click → Inspect → Console) for errors. Most common: the env vars in Netlify don't match what Supabase shows. Re-paste and redeploy.

**Pills don't show up under attendee names**: the enrichment table wasn't imported, or the email on the scan/meeting record doesn't match the email in the enrichment table. Check email casing (the app lowercases on lookup; the import preserves whatever was in the CSV — should already be lowercase).
