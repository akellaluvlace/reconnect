# Axil — External Setup Checklist

Everything needed beyond the codebase. Split by who does what.

**Last updated:** 2026-02-21

---

## Client Side

Things the client needs to create/provide. We handle all technical wiring once we get the credentials.

### 1. Azure AD App Registration (Microsoft Login)

**Status:** Waiting on client
**Blocks:** Users signing in with Microsoft accounts
**Priority:** High

**Steps:**
1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations → New registration
3. Name: `Axil`
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: `https://vfufxduwywrnwbjtwdjz.supabase.co/auth/v1/callback` (type: Web)
6. After creation → Certificates & secrets → New client secret → copy the value immediately (it's only shown once)

**Send us:**
- Application (client) ID
- Directory (tenant) ID
- Client secret value

---

### 2. Google Cloud Project (Google Login)

**Status:** Waiting on client
**Blocks:** Users signing in with Google accounts
**Priority:** High

**Steps:**
1. Go to https://console.cloud.google.com
2. Create project named `Axil`
3. APIs & Services → OAuth consent screen → External → fill in app name (`Axil`), support email, developer contact
4. APIs & Services → Credentials → Create OAuth client ID → Web application
5. Authorized redirect URI: `https://vfufxduwywrnwbjtwdjz.supabase.co/auth/v1/callback`

**Send us:**
- Client ID (ends in `.apps.googleusercontent.com`)
- Client secret

---

### 3. Google Workspace Account (Recording Infrastructure)

**Status:** Waiting on client
**Blocks:** Step 10.1-10.2 — entire interview recording pipeline (Meet → Drive → Whisper → Claude)
**Priority:** High — this is the critical path

**Steps:**
1. Sign up at https://workspace.google.com — **Business Standard** plan (minimum tier for Meet recording)
2. Only 1 user needed (e.g. `platform@axil.ie` or similar)
3. In Admin console (https://admin.google.com):
   - Apps → Google Workspace → Google Meet → enable "Recording"
4. In the **same Google Cloud project** from item #2 above, enable 3 additional APIs:
   - Google Drive API
   - Google Calendar API
   - Google Meet REST API
5. Create another OAuth client ID (Web application) — separate from the login one

**Send us:**
- OAuth Client ID + Client secret (for the Drive/Meet/Calendar client)
- Workspace account email address (e.g. `platform@axil.ie`)
- Workspace account password (one-time use — we do an OAuth authorization, then store refresh tokens securely, password no longer needed)

---

### 4. Domain DNS

**Status:** Client has domain, DNS not pointed yet
**Blocks:** Production deployment + emails from custom domain
**Priority:** Medium (not needed until we're ready to deploy)

**What we need to know:**
- The domain name
- Preferred structure (e.g. `axil.ie` for landing + `app.axil.ie` for dashboard)

**What to do when we're ready:**
- We send exact DNS records (CNAME/A records for Vercel, MX/TXT records for email)
- Client adds them in their domain registrar's DNS panel

---

### 5. Google Analytics (Optional)

**Status:** Not set up
**Blocks:** Nothing — landing page analytics only
**Priority:** Low

**Steps:**
1. Go to https://analytics.google.com
2. Create a property for the landing page domain
3. Send us the Measurement ID (format: `G-XXXXXXXXXX`)

---

## Our Side

Things we configure once we have the client's credentials, plus infrastructure we set up independently.

### 1. Supabase Auth Providers

**Status:** Email+password works. Google + Microsoft not configured.
**Depends on:** Client items #1 (Azure) and #2 (Google OAuth)

**Steps:**
- Supabase dashboard → Authentication → Providers → Google: paste Client ID + Secret
- Supabase dashboard → Authentication → Providers → Azure: paste Client ID + Secret + Tenant ID
- Redirect URI for both: `https://vfufxduwywrnwbjtwdjz.supabase.co/auth/v1/callback`

---

### 2. Google Platform Token Authorization

**Status:** Not done — Step 10.1 code not built yet
**Depends on:** Client item #3 (Google Workspace)

**Steps:**
- Build OAuth flow in Step 10.1 (internal admin-only route)
- One-time authorization with Workspace account
- Store refresh token in `platform_google_config` table (service_role only, RLS protected)
- Verify token auto-refresh works

---

### 3. Deploy Migrations to Production

**Status:** Ready to do
**Depends on:** Nothing

**Steps:**
- `supabase db push` via session-mode pooler (port 5432)
- 22 migrations to apply (schema + RLS + triggers + FK cascades)
- Verify RLS with real logins after deployment

---

### 4. Vercel Environment Variables

**Status:** Not set
**Depends on:** All client credentials above
**Blocks:** Production deployment

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Have it |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Have it |
| `SUPABASE_SERVICE_ROLE_KEY` | Have it |
| `ANTHROPIC_API_KEY` | Have it |
| `TAVILY_API_KEY` | Have it |
| `OPENAI_API_KEY` | Have it |
| `RESEND_API_KEY` | Have it |
| `RESEND_FROM_EMAIL` | Waiting on domain verification |
| `GOOGLE_CLIENT_ID` | Waiting on client |
| `GOOGLE_CLIENT_SECRET` | Waiting on client |
| `GOOGLE_REDIRECT_URI` | Set when deploying |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional, waiting on client |

---

### 5. Resend Domain Verification

**Status:** Not done
**Depends on:** Client's domain + DNS access

**Steps:**
- Add domain in Resend dashboard (https://resend.com/domains)
- Get MX + TXT DNS records from Resend
- Send records to client for DNS setup
- Once verified, update `RESEND_FROM_EMAIL` to `noreply@axil.ie` (or similar)

**Note:** Works without this during dev/beta — emails come from Resend's sandbox domain with limited daily sending.

---

### 6. Error Monitoring (Sentry)

**Status:** Not implemented
**Depends on:** Nothing
**Priority:** Should be done before beta

**Steps:**
- Create Sentry project
- Install `@sentry/nextjs`
- Configure DSN in Vercel env vars
- Add error boundary to app layout

---

### 7. Rate Limiting on AI Endpoints

**Status:** Not implemented
**Depends on:** Nothing
**Priority:** Should be done before beta (prevents API credit burn if someone hammers the AI routes)

**Options (pick one):**
- Vercel's built-in rate limiting (simplest, least control)
- Middleware-level IP-based limiting (moderate)
- Per-user limiting via Supabase (most granular)

---

### 8. Step 10.1-10.2 Code (Recording Pipeline)

**Status:** Not started
**Depends on:** Client item #3 (Google Workspace)

Build the recording pipeline code:
- Google client wrapper + token management
- Calendar event creation with Meet link
- Meet API recording retrieval
- Drive download + Whisper transcription integration
- Manual upload fallback (Supabase Storage)
- Interview scheduling UI

See `steps/step-10-integrations-delivery.md` for full spec and `docs/TESTING_AND_BETA_PLAN.md` for test strategy.

---

## Summary

### Already Done

| Item | Details |
|------|---------|
| Supabase project | `vfufxduwywrnwbjtwdjz`, EU West 1, 22 migrations |
| Anthropic API key | Plugged into .env.local |
| Tavily API key | Plugged into .env.local (dev tier) |
| OpenAI API key | Plugged into .env.local |
| Resend API key | Plugged into .env.local |
| Supabase service role key | Plugged into .env.local |
| Steps 1-9 | Complete + hardened + mutation tested |
| 960 tests | 233 DB + 251 AI + 476 web, all green |

### Waiting on Client

| Item | Blocks |
|------|--------|
| Azure AD credentials | Microsoft login |
| Google OAuth credentials | Google login |
| Google Workspace account | Recording pipeline (Step 10.1-10.2) |
| Domain DNS pointing | Production deployment |

### Waiting on Us

| Item | Depends on | Priority |
|------|-----------|----------|
| Supabase auth provider config | Client Azure + Google creds | High |
| Google platform authorization | Client Workspace account | High |
| Step 10.1-10.2 code | Client Workspace account | High |
| Deploy migrations to prod | Nothing — ready now | High |
| Vercel env vars | All credentials | High |
| Error monitoring (Sentry) | Nothing | Medium |
| Rate limiting | Nothing | Medium |
| Resend domain verification | Client DNS access | Low (works without) |
