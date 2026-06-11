# Deployment guide — SEG Solar visitor log

This takes the app from the in-memory demo to a live, multi-user deployment.
Estimated time: ~30 minutes. You will need a Supabase account and a Vercel
account (both have free tiers that cover this app's volume).

---

## 1. Create the Supabase project (the database)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region
   close to the factory (e.g. Singapore for Indonesia). Save the database
   password somewhere safe.
2. When it finishes provisioning, open the **SQL Editor** → **New query**.
3. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and
   click **Run**. This creates the `visits` and `employees` tables, the visit
   numbering, Row Level Security (deny-by-default), the auto-close and
   photo-purge functions, and seeds a few sample employees.
4. Go to **Project Settings → API** and copy two values:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** secret key → this is `SUPABASE_SERVICE_ROLE_KEY`
     (under "Project API keys"; it's the one labelled `service_role`, **not**
     `anon`). This key is server-only — never expose it to the browser.

> Optional but recommended: enable **pg_cron** (Database → Extensions) and
> uncomment the two `cron.schedule(...)` lines at the bottom of `schema.sql` so
> stale visits close and old photos purge nightly even with no dashboard
> traffic.

## 2. Generate the secrets

- `AUTH_SECRET` — sign-in cookie signing key, min 32 chars:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `STAFF_RECEPTIONIST_PASSWORD`, `STAFF_GUARD_PASSWORD`, `STAFF_ADMIN_PASSWORD`
  — pick strong, distinct passwords. A role whose password is left unset
  **cannot log in** (handy if you don't need the admin role at first).

## 3. Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. At [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Vercel auto-detects Next.js; no build settings to change.
3. Before the first deploy, open **Settings → Environment Variables** and add
   (Production scope), matching [`.env.example`](.env.example):

   | Name | Value |
   | --- | --- |
   | `AUTH_SECRET` | the 32-char hex from step 2 |
   | `STAFF_RECEPTIONIST_PASSWORD` | … |
   | `STAFF_GUARD_PASSWORD` | … |
   | `STAFF_ADMIN_PASSWORD` | … |
   | `SUPABASE_URL` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `PHOTO_RETENTION_DAYS` | `30` (or your policy) |

4. **Deploy.** You'll get a URL like `https://seg-visitor-log.vercel.app`.

## 4. Set up the gate

1. Log in at `/login` as **admin** and open `/admin`. Replace the seeded sample
   employees with your real staff (name + department) — these power the host
   autocomplete on the check-in form.
2. Open `/qr`, click **Print**. Cut the two posters apart and **laminate**
   them. Mount the green CHECK IN poster and the amber CHECK OUT poster at the
   security post.
3. Confirm the posters point at your live domain (the QR encodes
   `https://your-domain/checkin` and `/checkout`).

## 5. Before you rely on it — verify at the gate

- **Phone signal / guest WiFi at the post.** The whole flow needs the visitor's
  phone to reach the internet from the gate. Test it physically.
- Do one real round trip: scan CHECK IN → fill the form → guard confirms on
  `/guard` → it appears on `/dashboard` → scan CHECK OUT.
- Keep the **paper log book** as a fallback for visitors without a smartphone or
  signal; the guard can also fill the form on their behalf from `/guard`.

## Switching back to demo mode

Leave `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` unset and the app falls back
to the in-memory store automatically — useful for local testing.

## Notes

- **Backups:** Supabase keeps automatic daily backups on paid plans; on free,
  export periodically (Database → Backups) if the log is compliance-critical.
- **Data scale:** selfies and signatures are stored inline as data URLs. At a
  few hundred visits a month this is fine. If volume grows large, migrate
  `photo_data` / `signature_data` to Supabase Storage with signed URLs.
- **Privacy:** `PHOTO_RETENTION_DAYS` controls selfie auto-deletion. Set it to
  match your retention policy under Indonesia's UU PDP.
