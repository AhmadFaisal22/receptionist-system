# SEG Solar visitor log

A Progressive Web App that replaces the paper visitor log book at SEG Solar
Manufaktur Indonesia. The security post has no computer, so visitors check in
on their **own phone** by scanning a QR poster; the receptionist in the main
office sees every arrival on a **live dashboard**.

## How it works

```
Gate (no computer)            Cloud                 Main office
  ┌───────────┐                                     ┌──────────────┐
  │ CHECK IN  │  scan ─▶ visitor's phone  ─POST─▶   │  live         │
  │ QR poster │         fills the form              │  dashboard    │
  └───────────┘                  │                  │ (receptionist)│
  ┌───────────┐                  ▼                  └──────────────┘
  │ CHECK OUT │  scan ─▶  one-tap clock out         ┌──────────────┐
  │ QR poster │                                     │ guard's phone │
  └───────────┘                                     │ confirm/out   │
                                                     └──────────────┘
```

Visit status flows `pending → checked_in → checked_out`. A guard confirms
arrivals (defeating remote fake check-ins); visitors clock themselves out via
the exit QR; anything left open at midnight is auto-closed and flagged.

## Screens

| Route | Who | Purpose |
| --- | --- | --- |
| `/checkin` | visitors (public) | Trilingual form (ID / EN / 中文): name, company, phone, purpose, host, selfie, finger signature |
| `/checkout` | visitors (public) | One-tap clock-out via saved exit token, or visit code + phone |
| `/dashboard` | receptionist, admin | Live table, stat cards, search, detail drawer, Excel + PDF export |
| `/guard` | guard, admin | Confirm pending arrivals; manual clock-out |
| `/admin` | admin | Maintain the employee list behind host autocomplete |
| `/qr` | staff | Printable CHECK IN / CHECK OUT posters for the gate |

## Run locally (demo mode)

No database needed — runs against an in-memory store seeded with sample
employees. Data resets when the server restarts.

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET + the 3 staff passwords
npm run dev                  # http://localhost:3000
```

Demo logins use the role dropdown on `/login` with the passwords you set in
`.env.local` (`STAFF_RECEPTIONIST_PASSWORD`, `STAFF_GUARD_PASSWORD`,
`STAFF_ADMIN_PASSWORD`).

```bash
npm test       # unit tests (auth, store, validation, rate limit, CSV)
npm run build  # production build
```

## Going live

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full checklist: create a Supabase
project, run `supabase/schema.sql`, set the production environment variables,
deploy to Vercel, and print the QR posters.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind · GSAP (dashboard animation) ·
Supabase (Postgres + RLS) · Zod validation · signature_pad · qrcode.react.

## Security notes

- HMAC-signed httpOnly session cookies; staff passwords from env vars only.
- Deny-by-default Supabase Row Level Security; the app talks to the DB with the
  server-only service-role key.
- CSP and security headers in `next.config.ts`; rate limiting on public routes.
- CSV export is hardened against spreadsheet formula injection.
- Visitor selfies are personal data (UU PDP) — auto-deleted after
  `PHOTO_RETENTION_DAYS` (default 30); the rest of the log is kept for audit.
