# External Setup — Client + Developer Split

This doc splits setup between **you (the client)** creating accounts under your credentials, and **me (the developer)** doing the technical configuration inside them. This avoids painful migrations later — especially OAuth providers, which break existing user sessions if moved between accounts.

---

## Already Done

| Service | Status | Details |
|---------|--------|---------|
| Supabase Project | Done | Project ref: `vfufxduwywrnwbjtwdjz`, EU West 1 |
| Supabase CLI Auth | Done | Linked via `supabase login` |
| Git Repository | Done | Local, 8 commits on `master` |
| Database Schema | Done | 11 tables, 6 migrations, RLS policies, triggers |

---

## Phase 1 — Needed Now (Before Next Build Sessions)

### 1. Google Cloud Project (for Google OAuth + Drive export later)

**Why under your account:** The OAuth consent screen shows your company name to users during login. Google's verification process takes days — you don't want to redo it. Migrating OAuth = new Client ID = breaks all existing Google logins.

**Client does:**
1. Go to https://console.cloud.google.com/
2. Sign in with your company Google account (the one that will own this long-term)
3. Click "Select a project" → "New Project" → Name: `Reconnect` → Create
4. Add me as collaborator: IAM & Admin → IAM → Grant Access → enter my email → Role: **Editor** → Save

**Then send me:**
- Confirmation that the project is created and I have Editor access

**I will then configure:**
- OAuth consent screen (app name, logo, privacy policy URL, authorized domains)
- OAuth 2.0 credentials (Client ID + Secret with correct redirect URIs)
- Enable required APIs (Google Drive API for later)
- Connect to Supabase Authentication → Providers → Google

---

### 2. Microsoft Azure App Registration (for Microsoft OAuth)

**Why under your account:** Same as Google — the Azure app registration shows your company name during Microsoft login. Migrating = new Application ID = breaks existing Microsoft logins.

**Client does:**
1. Go to https://portal.azure.com/
2. Sign in with a Microsoft account (company or personal — whichever will own this)
3. Search for "App registrations" in the top search bar → click it
4. Click "New registration":
   - Name: `Rec+onnect`
   - Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Redirect URI: leave blank for now (I'll set it)
   - Click Register
5. Add me as collaborator: Go to the app → "Owners" in the left menu → "Add owners" → search my email → Add

**Then send me:**
- Confirmation that the app is registered and I'm added as owner

**I will then configure:**
- Redirect URI: `https://vfufxduwywrnwbjtwdjz.supabase.co/auth/v1/callback`
- Client secret generation
- API permissions
- Connect to Supabase Authentication → Providers → Azure

---

### 3. Anthropic Account (for Claude AI features)

**Why under your account:** Billing goes to your card. API keys are trivial to rotate, so this one is easy to migrate if needed — but simpler to start under your account.

**Client does:**
1. Go to https://console.anthropic.com/
2. Sign up / sign in
3. Add a payment method (Settings → Billing)
4. Go to API Keys → Create Key → Name: `reconnect-dev`

**Then send me:**
- The API key (`sk-ant-...`)
- That's it — no collaborator access needed, I just need the key

**Cost estimate:** ~$5-20/month during development (testing AI features). Production depends on usage.

---

### 4. Resend Account (for email notifications — needed by Step 10)

**Not urgent now, but good to start early because domain verification can take up to 48 hours.**

**Client does:**
1. Go to https://resend.com/
2. Sign up with your company email
3. Add me as teammate: Settings → Team → Invite → enter my email → Role: **Admin**

**Then send me:**
- Confirmation I'm added as teammate

**I will then configure:**
- Sending domain (DNS records for verification)
- API key generation
- Email templates

**Free tier:** 100 emails/day, 3,000/month — plenty for MVP/beta.

---

### 5. Domain Name

**Client does:**
1. Register a domain (e.g., `reconnect.ie`, `reconnect.app`, `getreconnect.com` — whatever you prefer)
2. Use any registrar (Namecheap, Cloudflare, GoDaddy, etc.)
3. If using Cloudflare: add me as a member with DNS edit access
4. If using another registrar: share nameserver/DNS panel access or be available to update DNS records when I ask

**Used for:** Production URL, email sending domain (Resend verification), OAuth redirect URIs.

---

## Phase 2 — Before Beta Launch

### 6. Vercel Account (deployment)

**Client does:**
1. Go to https://vercel.com/ → Sign up
2. Settings → Members → Invite → my email → Role: **Member**

**I will configure:** Project setup, environment variables, domain connection, deployments.

### 7. OpenAI Account (optional — Whisper transcription)

Only needed if we implement interview recording transcription.

**Client does:**
1. Go to https://platform.openai.com/ → Sign up
2. Add payment method
3. Create API key → send it to me

---

## What I Configure (Developer Side)

Once you've created the accounts and given me access, I handle all of this:

| Service | What I Configure |
|---------|-----------------|
| Google Cloud | OAuth consent screen, OAuth credentials, redirect URIs, Drive API, Supabase provider connection |
| Azure | Redirect URI, client secret, API permissions, Supabase provider connection |
| Anthropic | Nothing — just plug the API key into `.env.local` |
| Resend | Domain verification DNS records, API key, email templates |
| Vercel | Project setup, env vars, domain, deployment pipeline |
| Supabase | Email templates, provider configs (already have access) |

---

## Credentials I'll Need From You

Summary of everything to send me once accounts are created:

| What | Format | How to send |
|------|--------|-------------|
| Google Cloud project access | Editor invite to my email | Via GCP IAM |
| Azure app registration access | Owner invite to my email | Via Azure portal |
| Anthropic API key | `sk-ant-api03-...` | Secure message (not email) |
| Resend team invite | Admin invite to my email | Via Resend dashboard |
| Domain registrar access | Collaborator or DNS credentials | Depends on registrar |
| OpenAI API key (if needed) | `sk-...` | Secure message |

**Never send API keys over plain email.** Use a secure channel (Signal, encrypted message, password manager shared vault, etc.)

---

## Environment Variables (Final State)

Once everything is set up, `apps/web/.env.local` will contain:

```
NEXT_PUBLIC_SUPABASE_URL=https://vfufxduwywrnwbjtwdjz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

Google/Microsoft OAuth credentials live in the Supabase dashboard (Authentication → Providers), not in env vars.
