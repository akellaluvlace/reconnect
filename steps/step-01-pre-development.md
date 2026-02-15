# Step 1 — Pre-Development Setup

**Status:** NOT STARTED
**Week:** Pre-Kickoff
**Default Owners:** Lead/Architect + Release/DevOps

---

## Goal

Ensure project kickoff readiness: agreements, access, brand inputs, dev environment.

---

## Deliverables

- Client checklist complete (agreement, deposit, onboarding, domain, logo, colors)
- Developer environment prepared (Node, CLIs, VS Code extensions)
- Accounts ready (Supabase, Vercel, Anthropic, GA4, Resend, OpenAI, Google Cloud)

---

## Definition of Done (Step Level)

- [ ] All required accounts created and keys stored securely
- [ ] Repo created + initial README + project structure agreed
- [ ] All micro steps complete

---

## Micro Steps

### 1.1 — Verify Client Prerequisites

**Owner:** Architect
**Supporting:** None
**Status:** PENDING

**Allowed Paths:**
- `docs/`
- `README.md`

**Tasks:**
- [ ] Confirm signed Project Agreement received
- [ ] Confirm deposit paid (€6,150 inc VAT)
- [ ] Confirm Onboarding Questionnaire completed (minimum: branding, landing page, platform model sections)
- [ ] Confirm domain purchased/decided
- [ ] Confirm logo files received (SVG/PNG)
- [ ] Confirm brand colors (hex codes) documented

**DoD Commands:** Manual verification checklist

**Output:** Client readiness checklist (all green or blockers documented)

---

### 1.2 — Set Up Developer Environment

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING

**Allowed Paths:**
- `docs/setup.md`
- `.nvmrc`
- `.node-version`

**Tasks:**
- [ ] Verify Node.js 20.x installed
- [ ] Verify pnpm 8.x installed (or npm 10.x)
- [ ] Install global CLIs:
  ```bash
  pnpm add -g turbo supabase vercel
  ```
- [ ] Configure VS Code extensions:
  - dbaeumer.vscode-eslint
  - esbenp.prettier-vscode
  - bradlc.vscode-tailwindcss
  - prisma.prisma
  - eamodio.gitlens
  - rangav.vscode-thunder-client
- [ ] Document setup in `docs/setup.md`

**DoD Commands:**
```bash
node --version    # Expect 20.x
pnpm --version    # Expect 8.x+
turbo --version
supabase --version
vercel --version
```

**Output:** All CLI versions verified, setup docs created

---

### 1.3 — Create External Service Accounts

**Owner:** DevOps
**Supporting:** Security
**Status:** PENDING

**Allowed Paths:**
- `.env.example`
- `docs/accounts.md`

**Tasks (Week 1 Priority):**
| Service | URL | Purpose |
|---------|-----|---------|
| Supabase | supabase.com | Database, Auth, Storage |
| Vercel | vercel.com | Hosting |
| Anthropic | console.anthropic.com | Claude API |
| Google Analytics | analytics.google.com | Landing tracking |

- [ ] Create Supabase project
  - Region: **West EU (Ireland)** for GDPR compliance
  - Name: `reconnect-mvp`
  - Save database password securely
- [ ] Create Vercel account/team
- [ ] Create Anthropic account (Claude API)
- [ ] Create Google Analytics 4 property
- [ ] Document account credentials securely (password manager)
- [ ] Create `.env.example` with all required variables

**Tasks (Later Weeks):**
| Service | URL | Purpose | Week |
|---------|-----|---------|------|
| Resend | resend.com | Email | 3 |
| OpenAI | platform.openai.com | Whisper | 5 |
| Google Cloud | console.cloud.google.com | Drive API | 6 |

**Security Checklist:**
- [ ] All API keys stored in password manager (not in code)
- [ ] `.env.example` created with placeholder keys (no real values)
- [ ] `.env` added to `.gitignore`

**DoD Commands:** Manual API key validation

**Output:** All Week 1 accounts created, `.env.example` ready

---

### 1.4 — Initialize Git Repository

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING

**Allowed Paths:** All (initial repo setup)

**Tasks:**
- [ ] Initialize git repository:
  ```bash
  git init
  ```
- [ ] Create `.gitignore`:
  ```
  # Dependencies
  node_modules/
  .pnpm-store/

  # Next.js
  .next/
  out/

  # Vercel
  .vercel/

  # Environment
  .env
  .env.local
  .env.*.local

  # Supabase
  supabase/.branches/
  supabase/.temp/

  # IDE
  .idea/
  .vscode/*
  !.vscode/extensions.json
  !.vscode/settings.json

  # OS
  .DS_Store
  Thumbs.db

  # Build
  dist/
  build/

  # Logs
  *.log
  npm-debug.log*

  # Testing
  coverage/
  .playwright/
  ```
- [ ] Create initial `README.md` with project overview
- [ ] Create branch protection rules (if using GitHub):
  - Require PR reviews for `main`
  - Require status checks to pass
- [ ] Document branch naming convention

**Security Checklist:**
- [ ] `.gitignore` includes `.env`, `node_modules`, `.next`
- [ ] No secrets committed

**DoD Commands:**
```bash
git status
git log --oneline -1
```

**Output:** Git repo initialized with README and `.gitignore`

---

### 1.5 — Document Project Structure Agreement

**Owner:** Architect
**Supporting:** All agents (review)
**Status:** PENDING

**Allowed Paths:**
- `docs/architecture.md`
- `docs/PLAN.md`

**Tasks:**
- [ ] Document agreed directory structure:
  ```
  reconnect/
  ├── apps/
  │   ├── web/                    # Main application
  │   └── landing/                # Marketing site
  ├── packages/
  │   ├── ui/                     # Shared UI components
  │   ├── database/               # Supabase types & queries
  │   ├── ai/                     # Claude integration
  │   └── config/                 # Shared configuration
  ├── supabase/
  │   ├── migrations/             # Database migrations
  │   ├── functions/              # Edge functions
  │   └── seed.sql                # Test data
  ├── docs/                       # Documentation
  ├── steps/                      # Step breakdown files
  ├── .claude/                    # Agent definitions
  │   └── agents/
  ├── turbo.json
  ├── package.json
  └── .env.example
  ```
- [ ] Document technology choices and versions:
  | Technology | Version | Purpose |
  |------------|---------|---------|
  | Node.js | 20.x | Runtime |
  | React | 18.x | UI Framework |
  | Next.js | 14.x | App Framework |
  | TypeScript | 5.x | Language |
  | Tailwind CSS | 3.x | Styling |
  | Supabase | Latest | Backend |
  | Claude API | Opus/Sonnet | AI |
- [ ] Document naming conventions (from Tech Spec Appendix A)
- [ ] Get sign-off from all agent roles

**DoD Commands:** Document review complete

**Output:** `docs/architecture.md` created and agreed

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 1.1 Client Prerequisites | Architect | PENDING | - |
| 1.2 Dev Environment | DevOps | PENDING | - |
| 1.3 Service Accounts | DevOps | PENDING | - |
| 1.4 Git Repository | DevOps | PENDING | - |
| 1.5 Project Structure | Architect | PENDING | - |

---

## Dependencies

- **Blocks:** Step 2 (Monorepo Foundation)
- **Blocked By:** None (first step)

---

## Notes

- Steps 1.2, 1.3, 1.4 can run in parallel
- Step 1.1 should complete first to confirm client readiness
- Step 1.5 requires all other steps to be complete for final sign-off
