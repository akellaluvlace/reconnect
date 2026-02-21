# Axil — Remaining Setup Items

Hi! We received the 4 API keys (Anthropic, Tavily, OpenAI, Resend) — all look good. Thanks!

Below is what we still need from your side. Once you provide the credentials, we handle all the technical configuration.

---

## 1. Microsoft Login (Azure AD)

Users need to be able to sign in with their Microsoft/Outlook accounts.

**What to do:**

1. Go to https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**
3. Set:
   - **Name:** `Axil`
   - **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:** We'll provide the exact URL once we're closer to deployment — just create the app for now
4. After creation, copy and send us:
   - **Application (client) ID**
   - **Directory (tenant) ID**
   - Go to **Certificates & secrets** → **New client secret** → copy the **secret value**

---

## 2. Google Login (Google OAuth)

Users need to be able to sign in with their Google accounts.

**What to do:**

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one) called `Axil`
3. Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External**
   - Fill in app name: `Axil`, your support email, and developer contact email
   - No scopes needed to add — defaults are fine for login
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Axil Web`
   - Leave redirect URIs empty for now — we'll provide them before deployment
5. Copy and send us:
   - **Client ID** (ends in `.apps.googleusercontent.com`)
   - **Client secret**

---

## 3. Google Workspace Account (for Interview Recording)

This is the most important item. Axil uses Google Meet to auto-record interviews. For this to work, we need a shared Google Workspace account that the platform uses to create Meet calls and store recordings.

**What to do:**

1. Go to https://workspace.google.com and sign up for a **Business Standard** plan (or higher)
   - This is the minimum tier that supports Meet recording
   - Cost: ~$12/user/month — you only need 1 user (the platform service account, e.g. `platform@reconnect.ie`)
2. Once the Workspace is active, sign in to the **Admin console** (https://admin.google.com):
   - Go to **Apps** → **Google Workspace** → **Google Meet** → **Meet settings**
   - Turn on: **"Recording"** — enable for the organization
   - Optionally turn on: **"Meetings are recorded by default"**
3. In the **same Google Cloud project** from Step 2 above (or a new one linked to this Workspace account):
   - Enable these 3 APIs (search for them in **APIs & Services** → **Library**):
     - **Google Drive API**
     - **Google Calendar API**
     - **Google Meet REST API**
   - Create another **OAuth client ID** (Web application) for the platform — we'll provide redirect URIs
4. Send us:
   - **Client ID** and **Client secret** for this OAuth client
   - The **email address** of the Workspace account (e.g. `platform@reconnect.ie`)
   - The **password** (we need to do a one-time OAuth authorization to connect the account)

After the initial authorization, we store refresh tokens securely and the password is no longer needed.

---

## 4. Domain Name

Point your domain's DNS to Vercel. We'll send you the exact DNS records (CNAME/A records) when we're ready to deploy.

If you're using a subdomain for the app (e.g. `app.reconnect.ie`), let us know the structure you prefer.

---

## Summary

| Item | Priority | Status |
|------|----------|--------|
| Microsoft Azure AD credentials | High | Needed |
| Google OAuth credentials (login) | High | Needed |
| Google Workspace Business Standard | High | Needed for recording |
| Domain DNS setup | Medium | Needed before go-live |

Once we have items 1-3, we can start integrating immediately. Item 4 can wait until we're ready for production deployment.

Feel free to reach out if any step is unclear!
