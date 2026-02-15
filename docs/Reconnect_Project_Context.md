# Rec+onnect MVP Project Context

## Project Overview
**Client:** Robert Coffey, Founder of Rec+onnect
**Developer:** Akella inMotion (Nikita Akella)
**Project:** AI-powered Strategic Recruitment Operations Platform for Irish market
**Status:** Agreement ready for signature, invoice prepared, awaiting deposit

---

## Commercial Terms

| Item | Amount |
|------|--------|
| Base MVP Development | €8,000 |
| AI Compliance Module | €1,000 |
| Landing Page Package | €500 |
| Google Drive Integration | €500 |
| **Total (ex-VAT)** | **€10,000** |
| VAT (23%) | €2,300 |
| **Total (inc-VAT)** | **€12,300** |

### Payment Schedule
- **Deposit (50%):** €5,000 + VAT = €6,150 — Before kickoff
- **Mid-project (25%):** €2,500 + VAT = €3,075 — End of Week 4
- **Final (25%):** €2,500 + VAT = €3,075 — After beta (Week 8)

### Invoice Details
- Invoice Number: AIM-004
- Payment terms: 14 days
- Bank: Bank of Ireland
- IBAN: IE53 BOFI 9000 1728 1759 96
- BIC: BOFIIE2DXXX

---

## Timeline (8 Weeks)

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation + Landing Page | Project setup, auth, database schema, landing page design & build, SEO, GA4 |
| 2 | UI & AI Setup | Application shell, playbook flow, Claude integration with JSON schemas |
| 3 | Discovery | Market insights engine, JD generator, style selector, rich-text editor |
| 4 | Process | Interview flow builder, discipline-specific stages, suggested questions |
| 5 | Alignment | Candidate profile, process summary, collaborator system, shareable links |
| 6 | Debrief | Recording, transcription, feedback forms, AI synthesis, compliance module |
| 7 | Google Drive + Polish | Google Drive integration, bug fixes, optimization, final touches |
| 8 | Beta Testing | Live testing with 5-10 clients, bug fixes, final delivery |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + TypeScript | Type-safe UI development |
| Styling | Tailwind CSS + Shadcn/ui | Utility-first styling |
| Backend/Database | Supabase (PostgreSQL) | Auth, DB, storage, real-time |
| Hosting | Vercel | Edge deployment, CI/CD |
| AI (Primary) | Claude API (Anthropic) | JD generation, insights, synthesis |
| AI Models | Claude Sonnet 4.5 (fast), Claude Opus 4.6 (deep research, full effort) | Different use cases |
| Transcription | Whisper API (OpenAI) | Interview audio to text |
| Email | Resend | Collaborator invites, notifications |
| Document Storage | Google Drive API | Interview saves, document storage |
| Landing Page | Next.js / Vercel | Static site with analytics |

### Infrastructure Costs (Client responsibility post-delivery)
- Supabase Pro: $25/mo
- Vercel Pro: $20/mo
- Claude API: $50-200/mo
- Whisper API: $10-50/mo
- Resend: $0-20/mo
- **Total: $105-315/mo** depending on usage

---

## Product Architecture

### Four Chapters

**Chapter 1: Discovery**
- AI Prompt Input (rich text with suggestions)
- Market Insights (salary, competition, time to hire, availability, skills, trends)
- JD Generator (AI-generated with style options: formal, creative, short/long/compact)
- Customization (logo, edit, format toggle)
- Claude Opus for deep market research, Sonnet for quick preliminary data

**Chapter 2: The Process**
- Stage List (vertical with badges, expandable)
- Discipline-Specific (auto-includes relevant assessments)
- Focus Areas (per-stage with questions)
- Customization (add/remove/edit stages)
- AI-generated interview stages with suggested questions

**Chapter 3: Alignment**
- Candidate Profile (experience, skills, industries)
- Process Summary (stages, timeline, stakeholders)
- Panel Guidelines (best practices)
- Collaborators (invite, assign to stages)
- Shareable Link (read-only with expiration)

**Chapter 4: Debrief**
- Candidate Cards (name, stage, status)
- Recording (in-app MediaRecorder)
- Transcription (Whisper API)
- Feedback Form (ratings, notes, recommendation)
- Compare Feedback (AI synthesis)
- Access Control (hiring manager + admin only for full access)

---

## Critical Legal Requirements

### EU AI Act Compliance (CRITICAL)

**BANNED under Article 5(1)(f) — effective February 2, 2025:**
- Voice hesitation analysis
- Confidence detection from audio
- Lie detection
- Video/body language analysis
- Any biometric emotion inference

**ALLOWED:**
- Comparing written interviewer notes
- Factual summaries
- Identifying consensus/disagreement patterns from TEXT only

**Platform Classification:** High-risk AI system (Annex III, Point 4)
**Full compliance deadline:** August 2, 2026

**Penalties:** Up to €35M for violations

### GDPR Requirements
- Article 22: Candidates cannot face decisions "based solely on automated processing"
- Must offer human review and explain AI influence
- Interview recording: Single-party consent applies in Ireland, but GDPR transparency requires informing candidates before recording
- Data retention for unsuccessful candidates: 6-12 months maximum
- Right to erasure must be implemented

### AI Compliance Module (Included in scope)
- Text-based analysis only
- Divergent Feedback Detection
- Vague Response Flagging
- Consensus Analysis
- NO biometric inference whatsoever

---

## Technical Decisions

### Database
- **Supabase PostgreSQL** with Row Level Security (RLS)
- Multi-tenant isolation via `tenant_id` in JWT claims
- RLS enabled on ALL tables from Day 1
- Never expose service_role keys in frontend

### Core Tables
- organizations (id, name, logo_url, settings, timestamps)
- users (id, organization_id, email, name, role, timestamps)
- playbooks (id, organization_id, created_by, title, status, job_description, market_insights, candidate_profile)
- interview_stages (id, playbook_id, order_index, name, type, duration_minutes, focus_areas, suggested_questions, assigned_interviewer_id)
- candidates (id, playbook_id, name, email, cv_url, salary_expectation, current_stage_id, status)
- interviews (id, candidate_id, stage_id, interviewer_id, scheduled_at, recording_url, transcript, status)
- feedback (id, interview_id, interviewer_id, ratings, notes, pros, cons, recommendation)
- ai_synthesis (id, candidate_id, synthesis_type, content, generated_at)

### AI Integration
- **Structured Outputs:** Use Zod JSON schema constraints for validated responses
- Temperature: 0.1-0.4 for consistency
- Include confidence fields in outputs
- Implement RAG for grounding market data
- Fallback logic: Claude Sonnet if Opus fails, graceful degradation if API unavailable
- Exponential backoff for rate limits

### Authentication
- Supabase Auth with email/password and magic link
- JWT sessions with secure refresh
- RBAC: Admin (full), Manager (playbooks/candidates), Interviewer (assigned stages only)
- Social logins: Google, Microsoft (NO LinkedIn — client decision)

### Security
- AES-256 encryption at rest
- TLS 1.3 in transit
- Supabase SOC 2 Type II compliant

---

## Landing Page Specifications

**Framework:** Next.js (static export)
**Hosting:** Vercel (separate project from main app)
**Domain:** Client to provide

### SEO Implementation
- Semantic HTML structure
- Meta tags (title, description, Open Graph, Twitter Cards)
- JSON-LD structured data
- XML sitemap
- robots.txt
- Canonical URLs

### Analytics
- Google Analytics 4 with enhanced measurement
- Event tracking for CTA clicks
- Conversion tracking setup

### Performance Targets
- Lighthouse Performance score: 90+
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

---

## What's Explicitly OUT of Scope

- Mobile apps (iOS/Android)
- Calendar integrations (Google Calendar, Outlook)
- ATS integrations (Greenhouse, Lever, Workday)
- Custom SSO/SAML authentication
- Multi-language support
- Real-time collaboration features
- Custom reporting/analytics dashboards
- Job board posting
- Video platform integration
- Background check automation
- Payment/billing system (Stripe)

---

## Client Requirements by Week

**Week 1 (Required for landing page):**
- Logo files (SVG/PNG)
- Brand colors (hex codes)
- Company name (exact spelling)
- Landing page content & preferences
- Domain registered

**Week 2:**
- User roles/permissions decisions
- CMS requirements

**Week 7-8:**
- 5-10 beta testers
- Production domain(s) purchased
- API accounts set up (Anthropic, OpenAI, Resend, Google Cloud)

---

## Accounts Client Needs to Set Up

| Service | Purpose | Priority |
|---------|---------|----------|
| Anthropic | Claude API | Week 1 |
| Supabase | Database, auth, storage | Week 1 |
| Vercel | Hosting | Week 1 |
| Google Analytics | Landing page tracking | Week 1 |
| Domain(s) | Web addresses | Week 1 |
| Resend | Email notifications | Week 3 |
| OpenAI | Whisper transcription | Week 5 |
| Google Cloud | Google Drive API | Week 6 |

**Note:** Development happens from Akella inMotion environment, ownership transfers at completion. No GitHub connection needed from client.

---

## Competitive Landscape

**Market Size:** €4.47B European HR Tech (projected €8.67B by 2033)

| Competitor | Focus | Pricing |
|------------|-------|---------|
| Metaview | Interview notetaking only | ~€50/user/month |
| BrightHire | Interview coaching | Enterprise |
| Textio | JD generation only | €15K-50K/year |
| HireVue | Video interviews | Enterprise |

**Rec+onnect Differentiation:**
- End-to-end strategic workflow (not point solution)
- Stakeholder coordination tools
- SMB-friendly pricing
- GDPR-native design
- Ireland-first market focus

---

## Known Technical Risks & Mitigations

### AI Bias
- Amazon's 2018 resume screener penalized female candidates
- Workday class action establishes vendor liability
- **Mitigation:** Explicit disclaimers requiring human review, gendered-language detection, never allow AI to reject candidates without human confirmation

### OpenAI API Reliability
- December 2024 outages (4+ hours, 9+ hours)
- June 2025 outage (12+ hours)
- **Mitigation:** Graceful degradation with fallback models, exponential backoff, cached responses

### Prompt Injection (OWASP #1 LLM vulnerability)
- Malicious candidates could embed instructions in resumes
- **Mitigation:** Never pass raw candidate text directly to prompts, validate outputs against schemas

### Audio Transcription Accuracy
- Whisper shows reduced accuracy for Irish/non-American accents
- **Mitigation:** Quality indicators, manual correction option

---

## Current Status

- [x] Technical analysis complete
- [x] Legal compliance research done
- [x] Proposal v3 finalized
- [x] Agreement v3 finalized
- [x] Technical Specifications v2 finalized
- [x] Onboarding Questionnaire v3 finalized
- [x] Account Setup Guide created
- [x] Invoice AIM-004 prepared (€6,150 inc VAT)
- [ ] Agreement signed by client
- [ ] Deposit received
- [ ] Kickoff call scheduled

**Client Note:** Robert's daughter is in hospital. He will complete actions by COB tomorrow (expected). No rush applied.

---

## Key Documents

1. **Reconnect_Project_Agreement_v3.pdf** — For signing
2. **Reconnect_MVP_Proposal_v3.pdf** — Scope & pricing
3. **Reconnect_Technical_Specifications_v2.pdf** — Architecture details
4. **Reconnect_Onboarding_Questionnaire_v3.pdf** — Client decisions needed
5. **Reconnect_Account_Setup_Guide.pdf** — How to set up required services
6. **Invoice_AIM-004_Reconnect.pdf** — 50% deposit invoice

---

## Developer Details

**Business:** Akella inMotion
**Registration:** No. 777616 (CRO Ireland)
**VAT:** IE1490567D
**Address:** Sobo House, Dublin, D02 RV00
**Contact:** nikita@akellainmotion.com | +353 89 467 8757
**Bank:** Bank of Ireland
**IBAN:** IE53 BOFI 9000 1728 1759 96
**BIC:** BOFIIE2DXXX
