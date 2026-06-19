# SaaS Security Audit — SEG Solar Visitor Log

**System:** Visitor management PWA (Next.js + Supabase + Vercel)
**Repository:** `AhmadFaisal22/receptionist-system`
**Audit date:** 2026-06-19
**Standard:** ISO/IEC 27001:2022 (Annex A) — technical control alignment
**Classification:** Internal

> Security-first premise: no system is 100% secure. This audit focuses on
> *risk mitigation* and aligning the Supabase + Vercel + custom-code architecture
> with an Information Security Management System (ISMS).

---

## 0. Executive Summary

The application demonstrates a **strong baseline security posture** for its size and
use case. Core data-exposure risks (the most common Supabase failure mode) are
well controlled: Row-Level Security is deny-by-default on every table, the
`service_role` key is strictly server-side, sessions are signed and `httpOnly`,
and a complete set of HTTP security headers is enforced.

The residual risks are primarily **operational / governance** controls expected
by ISO 27001 rather than exploitable code defects: individual accountability
(shared role accounts), audit logging of privileged actions, globally-enforced
rate limiting, and a hardened production CSP.

| Severity | Count | Theme |
|----------|-------|-------|
| 🔴 High | 0 | — |
| 🟠 Medium | 4 | Accountability, audit logging, rate-limit scope, CSP hardening |
| 🟡 Low | 6 | HSTS, MFA, session revocation, dependency scanning, backups/IR, LAN HTTP |
| 🔵 Info | 3 | Monitoring, anti-automation, documentation |

**Overall rating: B+ (Good).** No critical or high-risk findings.

---

## 1. Scope & Methodology

- **In scope:** Supabase schema & RLS (`supabase/schema.sql`), authentication &
  session code (`src/lib/auth-core.ts`, `src/lib/auth.ts`), all API route
  handlers (`src/app/api/**`), input validation (`src/lib/validation.ts`),
  HTTP security headers (`next.config.ts`), rate limiting (`src/lib/ratelimit.ts`),
  secrets handling (Vercel env / `.env`).
- **Method:** White-box source review against ISO 27001 Annex A technical
  controls + OWASP ASVS-aligned checks (authn, authz, data protection,
  configuration, logging).
- **Out of scope:** Penetration testing, Supabase tenant-level configuration
  screenshots, Vercel account RBAC, physical/organizational controls.

---

## 2. Supabase Security Audit (Backend & Data)

### 2.1 ✅ Row-Level Security (RLS) — **PASS**
- RLS is **enabled on every table** (`employees`, `visits`) with **zero policies**
  for `anon`/`authenticated` → deny-by-default. A leaked anon key exposes no
  data (`supabase/schema.sql:69-70`).
- The Next.js server is the **only** DB client, using `service_role` which
  bypasses RLS by design.
- **Verify in dashboard:** confirm no table has been toggled "public" and that
  the anon key returns `[]`/permission error for `select * from visits`.

### 2.2 ✅ `service_role` Key Protection — **PASS**
- Read only from `process.env.SUPABASE_SERVICE_ROLE_KEY` inside the server-side
  store (`src/lib/store/supabase.ts`). **Never** prefixed `NEXT_PUBLIC_`
  (grep-verified) and documented as server-only (`.env.example:13`).
- The key bypasses all RLS, so this control is critical and currently correct.

### 2.3 ✅ Database Functions — **PASS**
- `auto_close_stale()` and `purge_expired_photos()` are `SECURITY DEFINER` with
  `set search_path = public` (prevents search-path hijacking) and have
  `EXECUTE` **revoked** from `public, anon, authenticated`
  (`schema.sql:103,123`).

### 2.4 ✅ Data Protection / Encryption — **PASS (with note)**
- Encryption **at rest** and **in transit** is provided by Supabase/Postgres by
  default (TLS + AES). No plaintext secrets stored in the DB.
- Personal data minimization: column `CHECK` constraints bound field sizes;
  selfies are purged after a retention window (UU PDP). Signature/photo are
  stored as data URLs — acceptable at this volume; migrate to Storage + signed
  URLs if volume grows (already noted in schema).
- **Action:** confirm Supabase **Point-in-Time Recovery / daily backups** are
  enabled on the project plan (see Finding F-09).

---

## 3. Vercel & Application Security (Edge & Transport)

### 3.1 ✅ HTTP Security Headers — **PASS (CSP to harden)**
Configured globally in `next.config.ts`:
- `Content-Security-Policy` (see F-04), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(self), microphone=(), geolocation=()`,
  `poweredByHeader: false`.
- **Missing:** `Strict-Transport-Security` (HSTS) — see F-05.

### 3.2 ✅ Secrets Management — **PASS**
- Secrets live in Vercel env vars + local `.env.local`; `.env*` is gitignored
  (only `.env.example` tracked).
- `AUTH_SECRET` is **enforced ≥ 32 chars in production** or the app refuses to
  start (`auth-core.ts:10-12`).

### 3.3 ✅ Transport — **PASS (with LAN note)**
- Session cookie `Secure` flag follows the real protocol via `x-forwarded-proto`
  (`auth-core.ts:85-106`). On plain-HTTP LAN access the flag is intentionally
  dropped so guard/visitor phones can log in — a usability/security tradeoff
  (see F-10).

---

## 4. Custom Code Security (AuthN / AuthZ / Input)

### 4.1 ✅ Authentication — **PASS**
- Sessions are **HMAC-SHA256 signed**, `httpOnly`, `SameSite=Lax`, 12h expiry,
  verified with **timing-safe comparison** (`auth-core.ts:30-64`).
- Credential check is **constant-time** and runs a **dummy comparison for
  unknown users** to remove a timing oracle (`auth-core.ts:72-82`).
- Login is rate-limited to **5 attempts / 5 min / IP** (`api/auth/login`).

### 4.2 ✅ Authorization — **PASS**
- Every staff endpoint calls `requireRole(...)`; destructive edit/delete is
  restricted to `receptionist`/`admin` and **excludes guard** by design
  (`api/visits/[id]/route.ts`).
- The secret `exit_token` is stripped from every client response via
  `toPublic()` (`api/visits/route.ts:21`).
- Public visitor status endpoint only accepts a valid UUID token and returns
  just `{status, code}` — no PII leak (`api/visit-status/route.ts`).

### 4.3 ✅ Input Validation & Injection — **PASS**
- All write endpoints validate with **Zod** schemas (`lib/validation.ts`); DB
  access uses the parameterized Supabase client (no string-concatenated SQL).
- Open-redirect protection: post-login redirect is constrained to **same-origin**
  (`login/page.tsx`).
- CSRF: mitigated by `SameSite=Lax` cookies + JSON APIs + `form-action 'self'`.

---

## 5. Findings & Remediation

| ID | Severity | Finding | ISO 27001 Annex A | Recommendation |
|----|----------|---------|-------------------|----------------|
| F-01 | 🟠 Medium | **Rate limiting is in-memory / per-instance.** On multiple Vercel serverless instances the brute-force and abuse limits are not enforced globally (`ratelimit.ts`). | A.8.20, A.8.6 | Move to **Vercel KV / Upstash Redis** for a shared sliding-window. |
| F-02 | 🟠 Medium | **Shared role accounts** (one password per role) — no individual accountability for who performed an action. | A.5.16, A.5.17, A.8.2 | Introduce **named per-user accounts** (or at minimum unique credentials per operator) tied to roles. |
| F-03 | 🟠 Medium | **No audit logging** of privileged actions (edit, **hard delete**, confirm, checkout). Deletes leave no trail. | A.8.15, A.5.28 | Add an **append-only audit log** table (actor, action, visit id, timestamp) and prefer **soft-delete** for visits. |
| F-04 | 🟠 Medium | **CSP allows `'unsafe-inline'` and `'unsafe-eval'`** in `script-src`, weakening XSS defense in production. | A.8.26, A.8.27 | Adopt **nonce/hash-based CSP** for production builds; keep relaxed CSP for dev only. |
| F-05 | 🟡 Low | **HSTS header missing.** | A.8.24 | Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` for HTTPS hosts. |
| F-06 | 🟡 Low | **No MFA** for staff login. | A.8.5 | Add **TOTP** (2FA) at least for privileged roles. |
| F-07 | 🟡 Low | **Stateless sessions cannot be revoked** before 12h expiry (no logout-all / rotation). | A.8.5 | Acceptable; optionally add a server-side session/version check or shorter TTL + refresh. |
| F-08 | 🟡 Low | **No automated dependency vulnerability scanning** in CI. | A.8.8 | Enable **Dependabot** + `npm audit` (or Snyk) gate in CI. |
| F-09 | 🟡 Low | **Backups / DR & incident response unverified.** | A.8.13, A.5.29, A.5.24–A.5.27 | Confirm Supabase **PITR/backups**; document an **incident response** runbook. |
| F-10 | 🟡 Low | **LAN HTTP mode** disables the `Secure` cookie flag — session cookie travels in clear on plain-HTTP LANs. | A.8.24, A.8.20 | Prefer **HTTPS even on LAN** (reverse proxy / self-signed) and re-enable `Secure`. |
| F-11 | 🔵 Info | **No security monitoring/alerting** for auth failures or anomalies. | A.8.15, A.8.16 | Centralize logs + alert on repeated 401/429 and admin actions. |
| F-12 | 🔵 Info | **Visitor check-in is unauthenticated** (by design) — spam possible despite IP rate limit. | A.8.6 | Add a lightweight **CAPTCHA / proof-of-work** only if abuse is observed. |
| F-13 | 🔵 Info | **No documented data classification / retention policy** beyond photo purge. | A.5.12, A.5.33, A.8.10 | Document a short **data classification & retention** policy (UU PDP aligned). |

---

## 6. ISO 27001 Annex A — Control Coverage Snapshot

| Control area | Status | Evidence / Gap |
|--------------|--------|----------------|
| A.5.15 Access control | 🟢 Mostly | `requireRole` everywhere; gap: shared accounts (F-02) |
| A.5.16/5.17 Identity & authentication info | 🟠 Partial | Strong session crypto; shared role passwords (F-02) |
| A.8.2 Privileged access | 🟠 Partial | Role separation good; no individual privileged identity |
| A.8.3 Information access restriction | 🟢 Strong | RLS deny-by-default; `toPublic` token stripping |
| A.8.5 Secure authentication | 🟠 Partial | Constant-time creds, rate-limited; no MFA (F-06) |
| A.8.8 Technical vulnerability mgmt | 🟡 Gap | No automated scanning (F-08) |
| A.8.9 Configuration management | 🟢 Strong | Security headers, `AUTH_SECRET` enforcement |
| A.8.10 Information deletion | 🟠 Partial | Photo purge yes; hard-delete w/o trail (F-03) |
| A.8.12 Data leakage prevention | 🟢 Strong | RLS, server-only `service_role`, no `NEXT_PUBLIC` secrets |
| A.8.13 Backup | 🟡 Verify | Confirm Supabase PITR (F-09) |
| A.8.15 Logging | 🟠 Gap | No audit log of privileged actions (F-03, F-11) |
| A.8.16 Monitoring | 🟡 Gap | No alerting (F-11) |
| A.8.20 Network security | 🟢 Mostly | TLS, CSP `connect-src` scoped; rate-limit scope (F-01) |
| A.8.23 Web filtering / headers | 🟢 Strong | Full header set; HSTS missing (F-05) |
| A.8.24 Cryptography | 🟢 Strong | HMAC sessions, TLS; LAN HTTP exception (F-10) |
| A.8.26/8.27 Application security | 🟠 Partial | Zod validation, secure SDLC; CSP hardening (F-04) |
| A.5.24–5.27 Incident management | 🟡 Gap | No documented IR plan (F-09) |
| A.5.12/5.33 Data classification & retention | 🔵 Info | Implicit only (F-13) |

---

## 7. Prioritized Remediation Roadmap

**Phase 1 — Quick wins (days)**
1. Add **HSTS** header (F-05).
2. Enable **Dependabot + `npm audit`** in CI (F-08).
3. Confirm **Supabase PITR/backups** + write a one-page **incident response** runbook (F-09).

**Phase 2 — Accountability & integrity (1–2 weeks)**
4. **Audit log** table for staff actions + **soft-delete** visits (F-03).
5. **Named per-user accounts** per operator (F-02).
6. Move rate limiting to **Vercel KV / Upstash** (F-01).

**Phase 3 — Hardening (as capacity allows)**
7. **Nonce-based production CSP** (F-04).
8. **MFA (TOTP)** for privileged roles (F-06).
9. **HTTPS on LAN** to restore `Secure` cookies (F-10).
10. Centralized **logging/alerting** (F-11) + documented **data retention** policy (F-13).

---

## 8. Conclusion

The architecture follows Supabase/Vercel security best practices: deny-by-default
RLS, a strictly server-side `service_role` key, signed `httpOnly` sessions,
constant-time authentication, validated inputs, and a complete header set. There
are **no high-risk findings**. The path to ISO 27001 readiness is mainly about
**governance evidence** — individual accountability, audit logging, global rate
limiting, and CSP hardening — captured in the roadmap above.

*This document records the state at the audit date and should be re-reviewed
after each significant change (new endpoint, schema change, dependency bump).*
