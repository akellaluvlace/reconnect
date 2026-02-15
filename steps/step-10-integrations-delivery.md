# Step 10 — Integrations, Hardening, Beta, Delivery

**Status:** NOT STARTED
**Week:** 7-8
**Default Owners:** DevOps + QA + Security + Architect

---

## Goal

Make it reliable + shippable: Drive export, performance, security, beta testing, handover.

---

## Deliverables

- Google Drive OAuth + upload/export flows
- Bug fixing + optimization (bundle, query speed, UX polish)
- Security checklist pass (auth on all routes, rate limiting AI, safe uploads, logs)
- Prod deployment + beta plan (5–10 testers)
- Documentation + handover checklist

---

## Definition of Done (Step Level)

- [ ] Production deployed with correct env vars and migrations
- [ ] Beta scenarios pass (playbook full loop, invites, recording, transcription, synthesis, share, export)
- [ ] Docs delivered + handover complete
- [ ] All micro steps complete

---

## Micro Steps

### 10.1 — Implement Google Drive OAuth

**Owner:** Backend
**Supporting:** Security
**Status:** PENDING
**Branch:** `step10-1-google-drive-oauth`

**Allowed Paths:**
- `apps/web/src/app/api/google-drive/**`
- `apps/web/src/lib/google-drive/**`

**Tasks:**
- [ ] Set up Google Cloud project:
  - Enable Google Drive API
  - Create OAuth 2.0 credentials
  - Configure consent screen
  - Add authorized redirect URIs

- [ ] Create OAuth flow:
```typescript
// apps/web/src/lib/google-drive/client.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent',
  });
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
```

- [ ] Create OAuth routes:
  - GET /api/google-drive/auth → Redirect to Google
  - GET /api/google-drive/callback → Handle callback, store tokens
  - GET /api/google-drive/status → Check connection status
  - POST /api/google-drive/disconnect → Revoke access

- [ ] Store refresh tokens securely in database

**Security Checklist:**
- [ ] Minimal scopes requested (drive.file only)
- [ ] Tokens encrypted at rest
- [ ] Revocation works
- [ ] No tokens exposed to client

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test OAuth flow
```

**Output:** Google Drive OAuth working

---

### 10.2 — Implement Drive Upload/Export

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step10-2-drive-upload`

**Allowed Paths:**
- `apps/web/src/app/api/google-drive/upload/route.ts`
- `apps/web/src/components/settings/google-drive-settings.tsx`

**Tasks:**
- [ ] Create upload route:
```typescript
// POST /api/google-drive/upload
export async function POST(req: NextRequest) {
  const { file_url, file_name, mime_type, folder_id } = await req.json();

  // Get user's Drive tokens
  // Download file from Supabase Storage
  // Upload to Google Drive
  // Return Drive file ID and URL
}
```

- [ ] Implement exports:
  - Save interview recordings to Drive
  - Export playbook as document to Drive
  - Export candidate summary to Drive
  - Create organized folder structure
  - NOTE: NO PDF export, NO CSV export (client decision — all stays in system)

- [ ] Create Google Drive settings UI:
  - Connect/disconnect button
  - Connection status
  - Default folder selection
  - Export buttons

**DoD Commands:**
```bash
# Test upload flow
```

**Output:** Drive upload/export working

---

### 10.3 — Bug Fixes & Optimization

**Owner:** Frontend + Backend
**Supporting:** QA
**Status:** PENDING
**Branch:** `step10-3-bugfixes-optimization`

**Tasks:**
- [ ] Review all reported issues
- [ ] Fix critical bugs first
- [ ] Test edge cases:
  - Empty states
  - Long text inputs
  - Network errors
  - Concurrent updates

- [ ] Performance optimization:
  - Analyze bundle size (target <200KB initial)
  - Implement code splitting
  - Optimize images (WebP, lazy loading)
  - Database query optimization
  - API response time audit (<500ms except AI)

- [ ] Cross-browser testing:
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Edge (latest)

- [ ] Desktop layout verification (min 1024px)

**DoD Commands:**
```bash
pnpm build
# Check bundle analyzer
# Run Lighthouse
```

**Output:** Bugs fixed, performance targets met

---

### 10.4 — Security Audit

**Owner:** Security
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step10-4-security-audit`

**Tasks:**
- [ ] Security checklist:
  - [ ] All API routes authenticated
  - [ ] RLS policies tested with multiple roles
  - [ ] No sensitive data in client logs
  - [ ] Environment variables secured
  - [ ] CORS configured correctly
  - [ ] Rate limiting on AI endpoints
  - [ ] Input validation on all forms
  - [ ] XSS prevention
  - [ ] CSRF protection
  - [ ] Secure file upload (type/size validation)
  - [ ] Audit logging for sensitive ops

- [ ] EU AI Act compliance verification:
  - [ ] No emotion inference
  - [ ] No voice analysis
  - [ ] No biometric processing
  - [ ] Human review disclaimers present
  - [ ] Recording consent implemented

- [ ] GDPR compliance verification:
  - [ ] Data retention awareness
  - [ ] Erasure path exists
  - [ ] Data export capability

**DoD Commands:**
```bash
# Manual security review
# Automated security scan (if available)
```

**Output:** Security audit passed

---

### 10.5 — Production Deployment

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step10-5-production-deploy`

**Tasks:**
- [ ] Deployment checklist:
  - [ ] Production environment variables set in Vercel
  - [ ] Database migrations applied to production
  - [ ] DNS configured for domains
  - [ ] SSL certificates active
  - [ ] Error monitoring set up (Sentry or similar)
  - [ ] Analytics verified
  - [ ] Backup strategy confirmed

- [ ] Production URLs:
  - Landing: `https://[domain]`
  - App: `https://app.[domain]`

- [ ] Verify deployment:
  - All pages load
  - Auth works
  - AI endpoints respond
  - Database queries work

**DoD Commands:**
```bash
vercel --prod
# Smoke test production
```

**Output:** Production deployed and live

---

### 10.6 — Beta Testing

**Owner:** QA
**Supporting:** All
**Status:** PENDING
**Branch:** `step10-6-beta-testing`

**Tasks:**
- [ ] Beta setup:
  - Client provides 5-10 beta testers
  - Create test accounts
  - Provide beta testing guide

- [ ] Test scenarios:
  1. Create organization and invite team member
  2. Create complete playbook (all 4 chapters)
  3. Invite collaborator to interview stage
  4. Record interview and view transcription
  5. Submit feedback and view AI synthesis
  6. Share playbook via link
  7. Export to Google Drive

- [ ] Feedback collection:
  - Set up feedback form or channel
  - Daily check-ins with client
  - Prioritize and fix reported issues

**DoD Commands:**
```bash
# Manual testing by beta users
# Track issues in GitHub/Linear
```

**Output:** Beta testing completed

---

### 10.7 — Documentation

**Owner:** Architect
**Supporting:** All
**Status:** PENDING
**Branch:** `step10-7-documentation`

**Tasks:**
- [ ] Create user documentation:
  - Getting started guide
  - Feature walkthrough
  - FAQ

- [ ] Create admin documentation:
  - User management
  - Organization settings
  - Integration setup (Google Drive)

- [ ] Create technical documentation:
  - Architecture overview
  - Environment variables reference
  - Database schema
  - API endpoints

- [ ] Create runbooks:
  - Deployment process
  - Rollback procedure
  - Common issues and fixes

**DoD Commands:**
```bash
# Review docs for completeness
```

**Output:** Documentation delivered

---

### 10.8 — Handover & Final Delivery

**Owner:** Architect + DevOps
**Supporting:** All
**Status:** PENDING
**Branch:** N/A (coordination step)

**Tasks:**
- [ ] Handover meeting with client:
  - Demo all features
  - Walk through admin functions
  - Answer questions

- [ ] Transfer ownership:
  - [ ] Vercel project ownership
  - [ ] Supabase project access
  - [ ] GitHub repository (if applicable)
  - [ ] Environment variables documentation
  - [ ] API keys and credentials

- [ ] Final invoice:
  - €2,500 + VAT = €3,075

- [ ] Warranty period begins:
  - 30 days bug fixes within scope
  - Does not include new features
  - Does not include client modifications

- [ ] Optional ongoing support discussion:
  - €150/month for basic maintenance

**DoD Commands:**
```bash
# Handover checklist complete
# Final invoice sent
# Client confirmation received
```

**Output:** Project delivered

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 10.1 Google Drive OAuth | Backend | PENDING | step10-1-google-drive-oauth |
| 10.2 Drive Upload/Export | Backend | PENDING | step10-2-drive-upload |
| 10.3 Bug Fixes | Frontend + Backend | PENDING | step10-3-bugfixes-optimization |
| 10.4 Security Audit | Security | PENDING | step10-4-security-audit |
| 10.5 Production Deploy | DevOps | PENDING | step10-5-production-deploy |
| 10.6 Beta Testing | QA | PENDING | step10-6-beta-testing |
| 10.7 Documentation | Architect | PENDING | step10-7-documentation |
| 10.8 Handover | Architect | PENDING | N/A |

---

## Dependencies

- **Blocks:** None (final step)
- **Blocked By:** Step 9 (Alignment + Debrief)

---

## Milestone

**End of Week 8: Final payment (€2,500 + VAT)**

---

## Post-Delivery

### 30-Day Warranty
- Bug fixes within delivered scope
- Does NOT include:
  - Client modifications
  - Third-party integration issues
  - Hosting/infrastructure problems
  - Feature requests

### Optional Ongoing Support (€150/month)
- Basic maintenance
- QA of code revisions
- Edge-case bug fixes
- Priority response
- Does NOT include new feature development

### Future Enhancement Opportunities
- Mobile apps (iOS/Android)
- Calendar integrations (Google Calendar, Outlook)
- ATS integrations (Greenhouse, Lever)
- Custom analytics dashboard
- Multi-language support
- Payment/billing system (Stripe)
