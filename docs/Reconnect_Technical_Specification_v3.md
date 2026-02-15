  
**REC+ONNECT MVP**

Technical Specification Document

Version 4.0 | February 2026

Prepared by Akella inMotion

| Document Information |  |
| :---- | :---- |
| Client | Robert Coffey, Rec+onnect |
| Developer | Nikita Akella, Akella inMotion |
| Project Duration | 8 Weeks |
| Total Investment | €10,000 (ex-VAT) |
| Document Status | Final |

# **1\. Executive Summary**

Rec+onnect is an AI-powered Strategic Recruitment Operations Platform designed for the Irish market. The platform automates the creation of comprehensive hiring playbooks, provides AI-generated market insights, structures interview processes, and delivers compliant feedback synthesis.

This document provides complete technical specifications including architecture decisions, directory structure, database schemas, API design, and integration patterns required for implementation.

# **2\. Technology Stack**

## **2.1 Core Technologies**

| Layer | Technology | Version | Purpose |
| :---- | :---- | :---- | :---- |
| Frontend Framework | React | 18.x | Component-based UI |
| Language | TypeScript | 5.x | Type-safe development |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| UI Components | Shadcn/ui | Latest | Accessible components |
| State Management | Zustand | 4.x | Lightweight state |
| Form Handling | React Hook Form \+ Zod | 7.x / 3.x | Validation |
| Backend/Database | Supabase | Latest | PostgreSQL, Auth, Storage |
| Hosting | Vercel | Latest | Edge deployment, CI/CD |
| Monorepo | Turborepo | Latest | Build orchestration |

## **2.2 AI & External Services**

| Service | Provider | Use Case | Est. Monthly Cost |
| :---- | :---- | :---- | :---- |
| Primary AI | Claude Opus 4.6 (Anthropic) | Deep market research, playbook generation, complex analysis | $20-100 |
| Playbook AI | Claude Opus 4.6 (Anthropic) | Multi-call playbook generation pipeline | $30-150 |
| Fast AI | Claude Sonnet 4.5 (Anthropic) | JD generation, quick operations | $30-100 |
| Feedback AI | Claude Opus 4.6 (Anthropic) | Compliant feedback synthesis, full effort | $20-80 |
| Transcription | Whisper API (OpenAI) | Interview audio to text | $10-50 |
| Email | Resend | Notifications, collaborator invites | $0-20 |
| Document Storage | Google Drive API | Interview saves, recording backup | Free |
| Microsoft OAuth | Microsoft | Enterprise SSO login | Free |
| Analytics | Google Analytics 4 | Landing page tracking | Free |

# **3\. Architecture Overview**

## **3.1 System Architecture**

The application follows a modern JAMstack architecture with clear separation of concerns:

* Client Layer: React SPA deployed on Vercel edge network with global CDN

* API Layer: Supabase Edge Functions for business logic and AI orchestration

* Data Layer: PostgreSQL with Row Level Security for multi-tenant isolation

* Storage Layer: Supabase Storage for CVs, recordings, and media files

* Landing Page: Separate static site deployment on Vercel

## **3.2 Multi-Tenancy Model**

The platform uses a single-database multi-tenant architecture with tenant isolation enforced at the database level via Row Level Security (RLS). Each organization is a tenant with complete data isolation.

* All tables include organization\_id foreign key

* JWT claims contain tenant\_id for RLS policy evaluation

* Service role keys never exposed to frontend

* Cross-tenant data access impossible at database level

* Optional white-label branding per organization (custom logo, colors, company name)

# **4\. Directory Structure**

The project uses a Turborepo monorepo structure with shared packages and separate applications.

## **4.1 Root Structure**

reconnect/

├── apps/

│   ├── web/                    \# Main application

│   └── landing/                \# Marketing site

├── packages/

│   ├── ui/                     \# Shared UI components

│   ├── database/               \# Supabase types & queries

│   ├── ai/                     \# Claude integration

│   └── config/                 \# Shared configuration

├── supabase/

│   ├── migrations/             \# Database migrations

│   ├── functions/              \# Edge functions

│   └── seed.sql                \# Test data

├── turbo.json

├── package.json

└── .env.example

## **4.2 Main Application (apps/web)**

apps/web/

├── public/

│   ├── favicon.ico

│   └── robots.txt

├── src/

│   ├── app/                    \# Next.js App Router

│   │   ├── (auth)/

│   │   │   ├── login/

│   │   │   │   └── page.tsx

│   │   │   ├── register/

│   │   │   │   └── page.tsx

│   │   │   ├── forgot-password/

│   │   │   │   └── page.tsx

│   │   │   └── layout.tsx

│   │   ├── (dashboard)/

│   │   │   ├── layout.tsx

│   │   │   ├── page.tsx                    \# Dashboard home

│   │   │   ├── playbooks/

│   │   │   │   ├── page.tsx                \# List all

│   │   │   │   ├── new/

│   │   │   │   │   └── page.tsx            \# Create

│   │   │   │   └── \[id\]/

│   │   │   │       ├── page.tsx            \# Overview

│   │   │   │       ├── discovery/

│   │   │   │       │   └── page.tsx

│   │   │   │       ├── process/

│   │   │   │       │   └── page.tsx

│   │   │   │       ├── alignment/

│   │   │   │       │   └── page.tsx

│   │   │   │       └── debrief/

│   │   │   │           └── page.tsx

│   │   │   ├── candidates/

│   │   │   │   ├── page.tsx

│   │   │   │   └── \[id\]/

│   │   │   │       └── page.tsx

│   │   │   ├── team/

│   │   │   │   ├── page.tsx

│   │   │   │   └── invitations/

│   │   │   │       └── page.tsx

│   │   │   └── settings/

│   │   │       ├── page.tsx

│   │   │       ├── organization/

│   │   │       │   └── page.tsx

│   │   │       ├── profile/

│   │   │       │   └── page.tsx

│   │   │       └── integrations/

│   │   │           └── page.tsx

│   │   ├── api/

│   │   │   ├── ai/

│   │   │   │   ├── market-insights/

│   │   │   │   │   └── route.ts

│   │   │   │   ├── generate-jd/

│   │   │   │   │   └── route.ts

│   │   │   │   ├── generate-stages/

│   │   │   │   │   └── route.ts

│   │   │   │   └── synthesize-feedback/

│   │   │   │       └── route.ts

│   │   │   ├── transcription/

│   │   │   │   └── route.ts

│   │   │   ├── google-drive/

│   │   │   │   ├── auth/

│   │   │   │   │   └── route.ts

│   │   │   │   ├── callback/

│   │   │   │   │   └── route.ts

│   │   │   │   └── upload/

│   │   │   │       └── route.ts

│   │   │   └── webhooks/

│   │   │       └── supabase/

│   │   │           └── route.ts

│   │   ├── share/

│   │   │   └── \[token\]/

│   │   │       └── page.tsx              \# Public playbook view

│   │   ├── layout.tsx

│   │   ├── not-found.tsx

│   │   └── error.tsx

│   ├── components/

│   │   ├── auth/

│   │   │   ├── login-form.tsx

│   │   │   ├── register-form.tsx

│   │   │   └── social-auth-buttons.tsx

│   │   ├── dashboard/

│   │   │   ├── sidebar.tsx

│   │   │   ├── header.tsx

│   │   │   ├── stats-cards.tsx

│   │   │   └── recent-activity.tsx

│   │   ├── playbooks/

│   │   │   ├── playbook-card.tsx

│   │   │   ├── playbook-list.tsx

│   │   │   ├── chapter-nav.tsx

│   │   │   └── status-badge.tsx

│   │   ├── discovery/

│   │   │   ├── ai-prompt-input.tsx

│   │   │   ├── market-insights-panel.tsx

│   │   │   ├── jd-generator.tsx

│   │   │   ├── jd-editor.tsx

│   │   │   └── style-selector.tsx

│   │   ├── process/

│   │   │   ├── stage-list.tsx

│   │   │   ├── stage-card.tsx

│   │   │   ├── stage-editor.tsx

│   │   │   ├── focus-areas.tsx

│   │   │   └── question-bank.tsx

│   │   ├── alignment/

│   │   │   ├── candidate-profile-builder.tsx

│   │   │   ├── process-summary.tsx

│   │   │   ├── collaborator-manager.tsx

│   │   │   ├── collaborator-invite.tsx

│   │   │   └── shareable-link.tsx

│   │   ├── debrief/

│   │   │   ├── candidate-cards.tsx

│   │   │   ├── audio-recorder.tsx

│   │   │   ├── transcription-viewer.tsx

│   │   │   ├── feedback-form.tsx

│   │   │   ├── feedback-comparison.tsx

│   │   │   └── ai-synthesis-panel.tsx

│   │   ├── candidates/

│   │   │   ├── candidate-list.tsx

│   │   │   ├── candidate-detail.tsx

│   │   │   ├── cv-upload.tsx

│   │   │   └── timeline.tsx

│   │   ├── team/

│   │   │   ├── member-list.tsx

│   │   │   ├── invite-form.tsx

│   │   │   └── role-selector.tsx

│   │   └── ui/                          \# Shadcn components

│   │       ├── button.tsx

│   │       ├── input.tsx

│   │       ├── card.tsx

│   │       ├── dialog.tsx

│   │       ├── dropdown-menu.tsx

│   │       ├── form.tsx

│   │       ├── select.tsx

│   │       ├── table.tsx

│   │       ├── tabs.tsx

│   │       ├── toast.tsx

│   │       └── ...

│   ├── hooks/

│   │   ├── use-auth.ts

│   │   ├── use-playbook.ts

│   │   ├── use-candidates.ts

│   │   ├── use-feedback.ts

│   │   ├── use-audio-recorder.ts

│   │   ├── use-ai-generation.ts

│   │   └── use-google-drive.ts

│   ├── lib/

│   │   ├── supabase/

│   │   │   ├── client.ts

│   │   │   ├── server.ts

│   │   │   └── middleware.ts

│   │   ├── ai/

│   │   │   ├── claude.ts

│   │   │   ├── prompts/

│   │   │   │   ├── market-insights.ts

│   │   │   │   ├── jd-generation.ts

│   │   │   │   ├── stage-generation.ts

│   │   │   │   └── feedback-synthesis.ts

│   │   │   └── schemas/

│   │   │       ├── market-insights.ts

│   │   │       ├── job-description.ts

│   │   │       ├── interview-stage.ts

│   │   │       └── feedback-synthesis.ts

│   │   ├── utils/

│   │   │   ├── cn.ts

│   │   │   ├── format.ts

│   │   │   └── validation.ts

│   │   └── constants.ts

│   ├── stores/

│   │   ├── auth-store.ts

│   │   ├── playbook-store.ts

│   │   └── ui-store.ts

│   ├── types/

│   │   ├── database.ts                  \# Generated from Supabase

│   │   ├── api.ts

│   │   └── ai.ts

│   └── styles/

│       └── globals.css

├── next.config.js

├── tailwind.config.js

├── tsconfig.json

└── package.json

## **4.3 Landing Page (apps/landing)**

apps/landing/

├── public/

│   ├── images/

│   │   ├── hero.webp

│   │   ├── features/

│   │   └── logo.svg

│   ├── favicon.ico

│   └── robots.txt

├── src/

│   ├── app/

│   │   ├── page.tsx                     \# Homepage

│   │   ├── layout.tsx

│   │   └── sitemap.ts

│   ├── components/

│   │   ├── header.tsx

│   │   ├── footer.tsx

│   │   ├── hero-section.tsx

│   │   ├── features-section.tsx

│   │   ├── how-it-works.tsx

│   │   ├── pricing-section.tsx

│   │   ├── testimonials.tsx

│   │   ├── cta-section.tsx

│   │   └── contact-form.tsx

│   └── lib/

│       └── analytics.ts

├── next.config.js

├── tailwind.config.js

└── package.json

## **4.4 Shared Packages**

packages/

├── ui/                                  \# Shared UI components

│   ├── src/

│   │   ├── components/

│   │   └── index.ts

│   ├── package.json

│   └── tsconfig.json

├── database/                            \# Database types & helpers

│   ├── src/

│   │   ├── types.ts                     \# Generated types

│   │   ├── queries/

│   │   │   ├── organizations.ts

│   │   │   ├── playbooks.ts

│   │   │   ├── candidates.ts

│   │   │   ├── interviews.ts

│   │   │   └── feedback.ts

│   │   └── index.ts

│   ├── package.json

│   └── tsconfig.json

├── ai/                                  \# AI integration

│   ├── src/

│   │   ├── client.ts

│   │   ├── prompts/

│   │   ├── schemas/

│   │   └── index.ts

│   ├── package.json

│   └── tsconfig.json

└── config/                              \# Shared config

    ├── eslint/

    ├── typescript/

    └── tailwind/

## **4.5 Supabase Directory**

supabase/

├── migrations/

│   ├── 20260201000000\_initial\_schema.sql

│   ├── 20260201000001\_rls\_policies.sql

│   ├── 20260201000002\_functions.sql

│   └── 20260201000003\_triggers.sql

├── functions/

│   ├── ai-market-insights/

│   │   └── index.ts

│   ├── ai-generate-jd/

│   │   └── index.ts

│   ├── ai-synthesize-feedback/

│   │   └── index.ts

│   ├── transcribe-audio/

│   │   └── index.ts

│   └── send-email/

│       └── index.ts

├── seed.sql

└── config.toml

# **5\. Database Schema**

All tables use UUID primary keys, timestamps, and include organization\_id for multi-tenant isolation.

## **5.1 organizations**

Root tenant table. Each company using Rec+onnect is an organization.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| name | TEXT | NOT NULL | Company name |
| slug | TEXT | UNIQUE, NOT NULL | URL-friendly identifier |
| logo\_url | TEXT | NULLABLE | Company logo storage path |
| settings | JSONB | DEFAULT '{}' | Organization preferences |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated\_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Settings JSONB structure:**

{ default\_currency: 'EUR', timezone: 'Europe/Dublin', white\_label: { enabled: false, primary\_color: null, logo\_url: null, company\_name: null }, branding: {...} }

## **5.2 users**

User accounts linked to Supabase Auth. Each user belongs to one organization.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, REFERENCES auth.users(id) | Links to Supabase Auth |
| organization\_id | UUID | FK → organizations(id) | Tenant reference |
| email | TEXT | NOT NULL | User email |
| name | TEXT | NOT NULL | Display name |
| role | TEXT | NOT NULL, CHECK IN ('admin','manager','interviewer') | RBAC role |
| avatar\_url | TEXT | NULLABLE | Profile picture |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation |

## **5.3 playbooks**

Core entity representing a hiring workflow for a specific role.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| organization\_id | UUID | FK → organizations(id), NOT NULL | Tenant reference |
| created\_by | UUID | FK → users(id), NOT NULL | Creator |
| title | TEXT | NOT NULL | Role title (e.g., 'Senior Engineer') |
| status | TEXT | DEFAULT 'draft', CHECK IN ('draft','active','archived') | Workflow state |
| job\_description | JSONB | NULLABLE | Generated JD data |
| market\_insights | JSONB | NULLABLE | AI market research |
| candidate\_profile | JSONB | NULLABLE | Desired candidate spec |
| settings | JSONB | DEFAULT '{}' | Playbook-specific settings |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated\_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**job\_description JSONB structure:**

{ content: 'HTML string', style: 'formal|creative', length: 'short|standard|long', generated\_at: 'ISO date' }

**market\_insights JSONB structure:**

{ salary: { min, max, currency }, skills: \[...\], competitors: \[...\], time\_to\_fill: '...', availability: '...', trends: \[...\] }

**candidate\_profile JSONB structure:**

{ experience\_level: '...', required\_skills: \[...\], preferred\_skills: \[...\], industries: \[...\], education: '...' }

## **5.4 interview\_stages**

Ordered interview steps within a playbook.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| playbook\_id | UUID | FK → playbooks(id) ON DELETE CASCADE | Parent playbook |
| order\_index | INTEGER | NOT NULL | Display order (0-based) |
| name | TEXT | NOT NULL | Stage name (e.g., 'Technical Interview') |
| type | TEXT | NULLABLE | Stage type (phone, video, onsite, etc.) |
| duration\_minutes | INTEGER | NULLABLE | Expected duration |
| focus\_areas | JSONB | DEFAULT '\[\]' | What to assess |
| suggested\_questions | JSONB | DEFAULT '\[\]' | AI-generated questions |
| assigned\_interviewer\_id | UUID | FK → users(id), NULLABLE | Default interviewer |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**focus\_areas JSONB structure:**

\[{ area: 'Technical Skills', weight: 0.4, criteria: \[...\] }, ...\]

**suggested\_questions JSONB structure:**

\[{ question: '...', category: '...', difficulty: 'easy|medium|hard' }, ...\]

## **5.5 candidates**

Job applicants being evaluated through a playbook.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| playbook\_id | UUID | FK → playbooks(id) ON DELETE CASCADE | Associated playbook |
| name | TEXT | NOT NULL | Candidate full name |
| email | TEXT | NULLABLE | Contact email |
| phone | TEXT | NULLABLE | Contact phone |
| cv\_url | TEXT | NULLABLE | Resume storage path |
| linkedin\_url | TEXT | NULLABLE | LinkedIn profile |
| salary\_expectation | JSONB | NULLABLE | Salary expectations. **Visibility: Managers and Admin only** (restricted via RLS) |
| current\_stage\_id | UUID | FK → interview\_stages(id), NULLABLE | Current position |
| status | TEXT | DEFAULT 'active', CHECK IN ('active','hired','rejected','withdrawn') | Pipeline status |
| notes | TEXT | NULLABLE | General notes |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Added timestamp |
| updated\_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**salary\_expectation JSONB structure:**

{ amount: 75000, currency: 'EUR', period: 'annual', negotiable: true }

## **5.6 interviews**

Individual interview sessions with candidates.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| candidate\_id | UUID | FK → candidates(id) ON DELETE CASCADE | Candidate |
| stage\_id | UUID | FK → interview\_stages(id) | Interview stage |
| interviewer\_id | UUID | FK → users(id) | Interviewer |
| scheduled\_at | TIMESTAMPTZ | NULLABLE | Scheduled time |
| completed\_at | TIMESTAMPTZ | NULLABLE | Completion time |
| recording\_url | TEXT | NULLABLE | Audio recording path |
| transcript | TEXT | NULLABLE | Whisper transcription |
| transcript\_metadata | JSONB | NULLABLE | Transcription details |
| status | TEXT | DEFAULT 'scheduled', CHECK IN ('scheduled','completed','cancelled','no\_show') | Interview state |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**transcript\_metadata JSONB structure:**

{ duration\_seconds: 1800, word\_count: 3500, language: 'en', confidence: 0.94 }

## **5.7 feedback**

Interviewer feedback on candidates (one per interview per interviewer).

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| interview\_id | UUID | FK → interviews(id) ON DELETE CASCADE | Parent interview |
| interviewer\_id | UUID | FK → users(id), NOT NULL | Feedback author |
| ratings | JSONB | NOT NULL | Structured ratings |
| notes | TEXT | NULLABLE | Detailed notes |
| pros | TEXT | NULLABLE | Strengths observed |
| cons | TEXT | NULLABLE | Concerns observed |
| focus\_areas\_confirmed | BOOLEAN | DEFAULT false | Confirmation that all focus areas were discussed |
| recommendation | TEXT | CHECK IN ('strong\_yes','yes','neutral','no','strong\_no') | Hire recommendation |
| submitted\_at | TIMESTAMPTZ | DEFAULT NOW() | Submission time |

**ratings JSONB structure (1-4 scale):**

{ technical\_skills: 4, communication: 3, culture\_fit: 4, problem\_solving: 2 }

**Rating scale:** Numbers 1-4 (can include descriptive guide per rating level)

## **5.8 ai\_synthesis**

AI-generated analysis and summaries (EU AI Act compliant, text-based only).

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| candidate\_id | UUID | FK → candidates(id) ON DELETE CASCADE | Subject candidate |
| synthesis\_type | TEXT | NOT NULL | Type: feedback\_comparison, stage\_summary, etc. |
| content | JSONB | NOT NULL | Synthesis content |
| model\_used | TEXT | NULLABLE | Claude model version |
| prompt\_version | TEXT | NULLABLE | Prompt template version |
| generated\_at | TIMESTAMPTZ | DEFAULT NOW() | Generation timestamp |

**content JSONB structure (feedback\_comparison):**

{ summary: '...', consensus: { agreement: \[...\], disagreement: \[...\] }, strengths: \[...\], concerns: \[...\], discussion\_points: \[...\], disclaimer: '...' }

**COMPLIANCE NOTE:** AI synthesis MUST NOT include hire/no-hire recommendations. Synthesis highlights discussion points and aggregates human feedback only. Human decision is paramount.

## **5.9 collaborators**

External collaborators invited to specific playbooks (magic link access).

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| playbook\_id | UUID | FK → playbooks(id) ON DELETE CASCADE | Associated playbook |
| email | TEXT | NOT NULL | Collaborator email |
| name | TEXT | NULLABLE | Display name |
| role | TEXT | DEFAULT 'viewer', CHECK IN ('viewer','interviewer') | Access level |
| assigned\_stages | UUID\[\] | NULLABLE | Stages they can access |
| invite\_token | TEXT | UNIQUE | Magic link token |
| invited\_by | UUID | FK → users(id) | Inviter |
| accepted\_at | TIMESTAMPTZ | NULLABLE | When accepted |
| expires\_at | TIMESTAMPTZ | NOT NULL | Token expiration |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Invitation sent |

## **5.10 share\_links**

Public read-only links for sharing playbooks externally.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| playbook\_id | UUID | FK → playbooks(id) ON DELETE CASCADE | Shared playbook |
| token | TEXT | UNIQUE, NOT NULL | URL token |
| created\_by | UUID | FK → users(id) | Creator |
| expires\_at | TIMESTAMPTZ | NULLABLE | Optional expiration |
| view\_count | INTEGER | DEFAULT 0 | Access counter |
| is\_active | BOOLEAN | DEFAULT true | Active state |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.11 audit\_logs**

Audit trail for sensitive operations (GDPR compliance).

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, DEFAULT gen\_random\_uuid() | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| user\_id | UUID | FK → users(id), NULLABLE | Actor (null for system) |
| action | TEXT | NOT NULL | Action type |
| entity\_type | TEXT | NOT NULL | Affected entity type |
| entity\_id | UUID | NULLABLE | Affected entity ID |
| metadata | JSONB | DEFAULT '{}' | Additional context |
| ip\_address | INET | NULLABLE | Request IP |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp |

## **5.12 skills\_taxonomy**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| name | TEXT | NOT NULL | Skill name |
| category | TEXT | NULLABLE | Skill category |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.13 industry\_categories**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| name | TEXT | NOT NULL | Industry name |
| parent\_id | UUID | FK → industry\_categories(id) NULLABLE | Parent category |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.14 job\_levels**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| name | TEXT | NOT NULL | Level name |
| order\_index | INTEGER | NOT NULL | Display order |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.15 stage\_templates**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| name | TEXT | NOT NULL | Template name |
| stages | JSONB | NOT NULL | Stage configuration |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.16 question\_bank**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| question | TEXT | NOT NULL | Question text |
| category | TEXT | NULLABLE | Question category |
| tags | JSONB | DEFAULT '\[\]' | Tags for filtering |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.17 jd\_templates**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| name | TEXT | NOT NULL | Template name |
| content | JSONB | NOT NULL | Template content |
| style | TEXT | NULLABLE | Default style |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.18 email\_templates**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| organization\_id | UUID | FK → organizations(id) | Tenant |
| type | TEXT | NOT NULL | Template type (invite, reminder, etc.) |
| subject | TEXT | NOT NULL | Email subject |
| body | TEXT | NOT NULL | Email body (HTML) |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.19 notification\_preferences**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| user\_id | UUID | FK → users(id) | User |
| type | TEXT | NOT NULL | Notification type |
| email\_enabled | BOOLEAN | DEFAULT true | Email notification on/off |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

## **5.20 gdpr\_consent\_outreach**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Primary key |
| candidate\_id | UUID | FK → candidates(id) | Candidate |
| outreach\_date | TIMESTAMPTZ | NOT NULL | When outreach was sent |
| response | TEXT | NULLABLE, CHECK IN ('opt\_in','opt\_out') | Candidate response |
| responded\_at | TIMESTAMPTZ | NULLABLE | When responded |
| created\_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

# **6\. Row Level Security Policies**

RLS enforces tenant isolation at the database level. All policies use the authenticated user's organization\_id from JWT claims.

## **6.1 Policy Patterns**

| Policy Name | Table | Operation | Rule |
| :---- | :---- | :---- | :---- |
| org\_isolation | All tables | ALL | organization\_id \= auth.jwt() → org\_id |
| users\_own\_org | users | SELECT | User can view members of same org |
| playbooks\_org | playbooks | ALL | CRUD within own organization |
| admin\_full\_access | All tables | ALL | Admins have full CRUD in their org |
| manager\_playbooks | playbooks | INSERT, UPDATE | Managers can create/edit playbooks |
| interviewer\_assigned | interviews | SELECT, UPDATE | Interviewers see only assigned |
| feedback\_blind | feedback | SELECT | Hide others' feedback until submitted |

## **6.2 Key RLS Functions**

Helper functions for RLS policy evaluation:

* get\_user\_org\_id(): Returns organization\_id from auth.users for current user

* get\_user\_role(): Returns role (admin/manager/interviewer) for current user

* is\_org\_admin(): Boolean check if current user is org admin

* can\_access\_playbook(playbook\_id): Check user has access to specific playbook

* can\_view\_feedback(interview\_id): Check if feedback should be visible

# **7\. API Routes**

## **7.1 Authentication Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| POST | /api/auth/register | Create account \+ organization | Public |
| POST | /api/auth/login | Email/password login | Public |
| POST | /api/auth/magic-link | Send magic link email | Public |
| POST | /api/auth/logout | End session | Required |
| GET | /api/auth/session | Get current session | Required |
| POST | /api/auth/refresh | Refresh JWT token | Required |

## **7.2 Organization Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/organization | Get current org details | Required |
| PATCH | /api/organization | Update org settings | Admin |
| POST | /api/organization/logo | Upload org logo | Admin |
| GET | /api/organization/members | List org members | Required |
| POST | /api/organization/invite | Invite new member | Admin |
| DELETE | /api/organization/members/:id | Remove member | Admin |

## **7.3 Playbook Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/playbooks | List all playbooks | Required |
| POST | /api/playbooks | Create playbook | Manager+ |
| GET | /api/playbooks/:id | Get playbook details | Required |
| PATCH | /api/playbooks/:id | Update playbook | Manager+ |
| DELETE | /api/playbooks/:id | Delete playbook | Admin |
| POST | /api/playbooks/:id/duplicate | Clone playbook | Manager+ |
| GET | /api/playbooks/:id/stages | List interview stages | Required |
| POST | /api/playbooks/:id/stages | Add stage | Manager+ |
| PATCH | /api/playbooks/:id/stages/:stageId | Update stage | Manager+ |
| DELETE | /api/playbooks/:id/stages/:stageId | Remove stage | Manager+ |
| POST | /api/playbooks/:id/stages/reorder | Reorder stages | Manager+ |

## **7.4 AI Routes**

| Method | Path | Description | Model |
| :---- | :---- | :---- | :---- |
| POST | /api/ai/market-insights | Generate market research | Claude Opus (async) |
| GET | /api/ai/market-insights/:id/status | Poll research status | \- |
| POST | /api/ai/generate-jd | Generate job description | Claude Sonnet |
| POST | /api/ai/generate-stages | Generate interview stages | Claude Sonnet |
| POST | /api/ai/generate-questions | Generate interview questions | Claude Sonnet |
| POST | /api/ai/synthesize-feedback | Synthesize candidate feedback | Claude Sonnet |

## **7.5 Candidate Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/candidates | List candidates (filterable) | Required |
| POST | /api/candidates | Add candidate | Manager+ |
| GET | /api/candidates/:id | Get candidate details | Required |
| PATCH | /api/candidates/:id | Update candidate | Manager+ |
| DELETE | /api/candidates/:id | Remove candidate | Manager+ |
| POST | /api/candidates/:id/cv | Upload CV | Manager+ |
| POST | /api/candidates/:id/advance | Move to next stage | Manager+ |

## **7.6 Interview & Feedback Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/interviews | List interviews | Required |
| POST | /api/interviews | Schedule interview | Manager+ |
| PATCH | /api/interviews/:id | Update interview | Assigned+ |
| POST | /api/interviews/:id/recording | Upload recording | Assigned |
| POST | /api/interviews/:id/transcribe | Trigger transcription | Assigned |
| GET | /api/interviews/:id/transcript | Get transcript | Assigned+ |
| POST | /api/interviews/:id/feedback | Submit feedback | Assigned |
| GET | /api/interviews/:id/feedback | Get all feedback | Manager+ |
| PATCH | /api/feedback/:id | Edit feedback (time-limited) | Owner |

## **7.7 Collaboration Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| POST | /api/collaborators/invite | Send collaborator invite | Manager+ |
| GET | /api/collaborators | List collaborators | Required |
| DELETE | /api/collaborators/:id | Revoke access | Manager+ |
| POST | /api/share-links | Create share link | Manager+ |
| DELETE | /api/share-links/:id | Revoke share link | Manager+ |
| GET | /api/share/:token | Access shared playbook | Public |

## **7.8 Google Drive Routes**

| Method | Path | Description | Auth |
| :---- | :---- | :---- | :---- |
| GET | /api/google-drive/auth | Start OAuth flow | Required |
| GET | /api/google-drive/callback | OAuth callback | Required |
| POST | /api/google-drive/upload | Upload file to Drive | Required |
| GET | /api/google-drive/status | Check connection status | Required |
| POST | /api/google-drive/disconnect | Revoke access | Required |

# **8\. AI Integration Architecture**

## **8.1 Model Selection**

| Use Case | Model | Temperature | Max Tokens | Rationale |
| :---- | :---- | :---- | :---- | :---- |
| Market Insights | Claude Opus 4.6 | 0.3 | 4096 | Deep research, full effort, async processing |
| JD Generation | Claude Sonnet 4.5 | 0.4 | 2048 | Creative but consistent |
| Stage Generation | Claude Sonnet 4.5 | 0.2 | 1024 | Structured, predictable |
| Question Generation | Claude Sonnet 4.5 | 0.3 | 1024 | Varied but relevant |
| Feedback Synthesis | Claude Opus 4.6 | 0.1 | 2048 | Compliant synthesis, full effort, no recommendation |

## **8.2 Structured Output Schemas (Zod)**

All AI responses are validated against Zod schemas to ensure type safety and predictable structure.

**MarketInsightsSchema:**

{ salary: { min: number, max: number, median: number, currency: string },

  skills: \[{ name: string, importance: 'required'|'preferred', trend: 'growing'|'stable'|'declining' }\],

  competitors: \[{ name: string, hiring: boolean }\],

  time\_to\_fill: string, availability: string, trends: string\[\], confidence: number }

**JobDescriptionSchema:**

{ title: string, content: string (HTML), sections: { overview, responsibilities, requirements, benefits },

  metadata: { word\_count: number, reading\_time: string, style: string } }

**FeedbackSynthesisSchema:**

{ summary: string, consensus: { agreement: string\[\], disagreement: string\[\] },

  strengths: string\[\], concerns: string\[\], discussion\_points: string\[\],

  recommendation\_breakdown: { strong\_yes, yes, neutral, no, strong\_no },

  disclaimer: string }

## **8.3 Prompt Management**

* Prompts stored in /lib/ai/prompts/ with version control

* Each prompt has a unique version identifier for audit trail

* System prompts include EU AI Act compliance instructions

* User inputs sanitized before inclusion in prompts

* Output schema included in prompt for structured responses

## **8.4 Error Handling & Fallbacks**

| Error Type | Handling Strategy |
| :---- | :---- |
| Rate limit (429) | Exponential backoff: 1s, 2s, 4s, 8s, 16s |
| Timeout | Retry up to 3 times, then queue for later |
| Invalid response | Retry with stricter prompt, then return partial |
| API down | Return cached data if available, show error state |
| Schema validation fail | Log error, attempt repair, fallback to raw text |

# **9\. Authentication & Authorization**

## **9.1 Authentication Methods**

| Method | Implementation | Use Case |
| :---- | :---- | :---- |
| Email/Password | Supabase Auth | Primary login |
| Magic Link | Supabase Auth \+ Resend | Passwordless option |
| Google OAuth | Supabase Auth | Social login (optional) |
| ~~LinkedIn OAuth~~ | ~~Supabase Auth~~ | REMOVED — Client decision: no LinkedIn login |
| Microsoft OAuth | Supabase Auth | Enterprise (optional) |

## **9.2 Role-Based Access Control (RBAC)**

| Role | Playbooks | Candidates | Team | Settings | Feedback |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Admin | Full CRUD | Full CRUD | Manage all | Full access | View all |
| Manager | Create/Edit own | Full CRUD | View only | Limited | View all |
| Interviewer | View assigned | View assigned | View only | None | Own only |

## **9.3 Session Management**

* JWT tokens with 1-hour expiry

* Refresh tokens with 7-day expiry

* Secure, httpOnly cookies for token storage

* Automatic token refresh on API calls

* Logout invalidates all sessions

# **10\. Environment Variables**

| Variable | Required | Description |
| :---- | :---- | :---- |
| NEXT\_PUBLIC\_SUPABASE\_URL | Yes | Supabase project URL |
| NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY | Yes | Supabase anonymous key |
| SUPABASE\_SERVICE\_ROLE\_KEY | Yes | Supabase service role (server only) |
| ANTHROPIC\_API\_KEY | Yes | Claude API key |
| OPENAI\_API\_KEY | Yes | Whisper API key |
| RESEND\_API\_KEY | Yes | Email service key |
| GOOGLE\_CLIENT\_ID | Yes | Google OAuth client ID |
| GOOGLE\_CLIENT\_SECRET | Yes | Google OAuth secret |
| GOOGLE\_REDIRECT\_URI | Yes | OAuth callback URL |
| NEXT\_PUBLIC\_APP\_URL | Yes | Application base URL |
| NEXT\_PUBLIC\_GA\_MEASUREMENT\_ID | Landing | Google Analytics ID |

# **11\. Compliance Requirements**

## **11.1 EU AI Act Compliance**

Rec+onnect is classified as a high-risk AI system under Annex III, Point 4\. The following are BANNED under Article 5(1)(f), effective February 2, 2025:

* Voice hesitation analysis

* Confidence detection from audio

* Lie detection

* Video/body language analysis

* Any biometric emotion inference

**All AI analysis is TEXT-BASED ONLY. Penalties for violations: up to €35M.**

## **11.2 GDPR Requirements**

* Article 22: No decisions based solely on automated processing

* Human review required for all AI-assisted decisions

* Candidates must be informed before interview recording

* Data retention: 6-12 months maximum for unsuccessful candidates

* Right to erasure: Implemented via data deletion flow

* Data export: Available on request

# **Appendix A: File Naming Conventions**

| Type | Convention | Example |
| :---- | :---- | :---- |
| Components | kebab-case.tsx | playbook-card.tsx |
| Hooks | use-\[name\].ts | use-playbook.ts |
| Types | lowercase.ts | database.ts |
| API Routes | route.ts in folders | api/playbooks/route.ts |
| Utilities | lowercase.ts | format.ts |
| Constants | SCREAMING\_SNAKE | MAX\_FILE\_SIZE |
| Database tables | snake\_case | interview\_stages |
| Database columns | snake\_case | created\_at |

# **Appendix B: Git Branch Strategy**

| Branch | Purpose | Deploys To |
| :---- | :---- | :---- |
| main | Production code | Production |
| staging | Pre-production testing | Staging |
| develop | Integration branch | Development |
| feature/\* | New features | \- |
| fix/\* | Bug fixes | \- |
| hotfix/\* | Production fixes | \- |

*— End of Document —*