# Rec+onnect MVP Development Roadmap

## Executive Summary

**Project:** Rec+onnect — AI-powered Strategic Recruitment Operations Platform
**Duration:** 8 weeks
**Budget:** €10,000 (ex-VAT)
**Start Date:** Upon deposit receipt
**Target Market:** Ireland (initial), EU expansion planned

This roadmap provides detailed week-by-week execution plan including technical tasks, decisions, dependencies, and deliverables.

---

## Pre-Kickoff Checklist

### From Client (Robert)
- [ ] Signed Project Agreement returned
- [ ] Deposit paid (€6,150 inc VAT)
- [ ] Onboarding Questionnaire completed (at minimum: branding, landing page, platform model sections)
- [ ] Domain purchased (or decision on domain name)

### From Developer (Nikita)
- [ ] Development environment configured
- [ ] GitHub repository initialized
- [ ] Supabase project created (dev environment)
- [ ] Vercel projects created (app + landing page)
- [ ] Project management workspace set up (Notion/Linear)

---

## Week 1: Foundation + Landing Page

### Objectives
- Complete project infrastructure setup
- Design and build landing page
- Establish database schema and authentication

### Day 1-2: Project Setup

**Tasks:**
- [ ] Initialize monorepo structure (Turborepo recommended)
  ```
  /apps
    /web (main application)
    /landing (marketing site)
  /packages
    /ui (shared components)
    /database (Supabase types)
    /ai (Claude integration)
  ```
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Tailwind CSS + Shadcn/ui
- [ ] Configure environment variables structure
- [ ] Set up CI/CD pipeline (Vercel)

**Technical Decisions:**
- Monorepo vs separate repos → **Monorepo** (shared types, easier deployment)
- State management → **Zustand** (lightweight, TypeScript-native)
- Form handling → **React Hook Form + Zod** (validation consistency with AI schemas)

### Day 2-3: Database Schema & Auth

**Supabase Setup:**
- [ ] Create production project (West EU - Ireland region)
- [ ] Design and implement core tables:

```sql
-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'interviewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbooks
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  job_description JSONB,
  market_insights JSONB,
  candidate_profile JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview Stages
CREATE TABLE interview_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  duration_minutes INTEGER,
  focus_areas JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  assigned_interviewer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cv_url TEXT,
  linkedin_url TEXT,
  salary_expectation JSONB,
  current_stage_id UUID REFERENCES interview_stages(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hired', 'rejected', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES interview_stages(id),
  interviewer_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recording_url TEXT,
  transcript TEXT,
  transcript_metadata JSONB,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES users(id) NOT NULL,
  ratings JSONB NOT NULL,
  notes TEXT,
  pros TEXT,
  cons TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'neutral', 'no', 'strong_no')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Synthesis
CREATE TABLE ai_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  synthesis_type TEXT NOT NULL,
  content JSONB NOT NULL,
  model_used TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Row Level Security (CRITICAL):**
```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Example policy: Users can only see their organization's data
CREATE POLICY "Users can view own organization" ON users
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Playbooks policy
CREATE POLICY "Users can view own org playbooks" ON playbooks
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

> **Note:** The above RLS examples are simplified for quick reference. For comprehensive RLS policies including helper functions (`get_user_org_id()`, `get_user_role()`, `is_org_admin()`), role-based policies, and blind feedback rules, see `MASTER_IMPLEMENTATION_PLAN.md` Section 3.2 (Task 2.3).

**Authentication Setup:**
- [ ] Configure Supabase Auth
- [ ] Email/password authentication
- [ ] Magic link authentication
- [ ] OAuth providers (Google, LinkedIn, Microsoft) — configure but can enable later based on questionnaire
- [ ] Email templates customization

### Day 3-5: Landing Page

**Design & Build:**
- [ ] Review client's design preferences from questionnaire
- [ ] Create wireframe/mockup (Figma or direct code)
- [ ] Implement responsive landing page:

**Page Structure:**
```
- Hero Section
  - Headline + subheadline
  - Primary CTA (Book Demo / Sign Up)
  - Hero image or product screenshot
  
- Problem/Solution Section
  - Pain points in recruitment
  - How Rec+onnect solves them
  
- Features Section
  - Discovery (AI market insights)
  - Process (Smart interview planning)
  - Alignment (Team coordination)
  - Debrief (AI-powered synthesis)
  
- How It Works
  - Step-by-step visual flow
  
- Social Proof (if available)
  - Testimonials
  - Client logos
  
- Pricing (if decided)
  - Or "Contact for pricing"
  
- CTA Section
  - Final call to action
  
- Footer
  - Links, contact, legal
```

**SEO Implementation:**
- [ ] Meta tags (title, description)
- [ ] Open Graph tags for social sharing
- [ ] Twitter Card tags
- [ ] JSON-LD structured data (Organization, Product)
- [ ] XML sitemap generation
- [ ] robots.txt
- [ ] Canonical URLs

**Analytics:**
- [ ] Google Analytics 4 setup
- [ ] Event tracking for:
  - CTA clicks
  - Scroll depth
  - Time on page
  - Form submissions (if contact form)
- [ ] Conversion goals configured

**Performance:**
- [ ] Image optimization (WebP, lazy loading)
- [ ] Font optimization (subset, preload)
- [ ] Code splitting
- [ ] Verify Lighthouse score 90+

### Week 1 Deliverables
- [ ] Landing page live on staging URL
- [ ] Database schema implemented with RLS
- [ ] Authentication flow working
- [ ] Development environment fully configured
- [ ] Weekly progress report to client

---

## Week 2: UI & AI Setup

### Objectives
- Build application shell and navigation
- Implement Claude integration with structured outputs
- Create playbook creation flow

### Day 1-2: Application Shell

**Layout Components:**
- [ ] Main layout with sidebar navigation
- [ ] Header with user menu, notifications
- [ ] Responsive design (mobile sidebar → hamburger)
- [ ] Loading states and skeletons

**Navigation Structure:**
```
Dashboard
├── Overview (stats, recent activity)
├── Playbooks
│   ├── All Playbooks
│   ├── Create New
│   └── [Playbook Detail]
│       ├── Discovery
│       ├── Process
│       ├── Alignment
│       └── Debrief
├── Candidates
│   ├── All Candidates
│   └── [Candidate Detail]
├── Team
│   ├── Members
│   └── Invitations
└── Settings
    ├── Organization
    ├── Profile
    └── Integrations
```

**UI Components to Build:**
- [ ] Button variants (primary, secondary, ghost, destructive)
- [ ] Input fields with validation states
- [ ] Select/dropdown with search
- [ ] Modal/dialog system
- [ ] Toast notifications
- [ ] Data tables with sorting, filtering
- [ ] Cards and card grids
- [ ] Tabs component
- [ ] Accordion/collapsible
- [ ] Badge/tag components
- [ ] Avatar with fallback
- [ ] Empty states
- [ ] Error boundaries

### Day 2-4: Claude Integration

**AI Service Architecture:**
```typescript
// /packages/ai/src/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Structured output schema example
const JobDescriptionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
  benefits: z.array(z.string()),
  salary_range: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string(),
  }).optional(),
  confidence: z.number().min(0).max(1),
});

export async function generateJobDescription(input: {
  role: string;
  level: string;
  industry: string;
  company_context?: string;
  style: 'formal' | 'creative' | 'concise';
}) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: buildJDPrompt(input),
    }],
  });
  
  // Parse and validate response
  const content = response.content[0];
  if (content.type === 'text') {
    const parsed = JSON.parse(content.text);
    return JobDescriptionSchema.parse(parsed);
  }
  throw new Error('Unexpected response format');
}
```

**AI Features to Implement:**
- [ ] Job Description Generator
- [ ] Market Insights Generator (Sonnet for quick, Opus for deep)
- [ ] Interview Questions Generator
- [ ] Feedback Synthesis
- [ ] Error handling and fallback logic
- [ ] Rate limiting and retry logic
- [ ] Response caching strategy

**Prompt Engineering:**
- [ ] Create prompt templates for each AI feature
- [ ] Version control prompts (store in database or config)
- [ ] Include output format instructions
- [ ] Add safety guardrails (no personal opinions, cite uncertainty)

### Day 4-5: Playbook Creation Flow

**Playbook Wizard:**
- [ ] Step 1: Basic Info (title, role, department)
- [ ] Step 2: Role Details (level, skills, industry)
- [ ] Step 3: AI Generation trigger
- [ ] Progress indicator
- [ ] Save draft functionality
- [ ] Validation at each step

**State Management:**
```typescript
// Playbook creation store
interface PlaybookDraft {
  step: number;
  basicInfo: {
    title: string;
    department: string;
  };
  roleDetails: {
    level: string;
    skills: string[];
    industry: string;
  };
  generatedContent: {
    jobDescription?: JDOutput;
    marketInsights?: MarketInsightsOutput;
    interviewStages?: StageOutput[];
  };
}
```

### Week 2 Deliverables
- [ ] Application shell with navigation
- [ ] Claude integration working
- [ ] Playbook creation wizard (basic flow)
- [ ] Component library established
- [ ] Weekly progress report

---

## Week 3: Discovery Chapter

### Objectives
- Build Market Insights engine
- Implement JD Generator with editor
- Create Discovery chapter UI

### Day 1-2: Market Insights Engine

**Data Structure:**
```typescript
interface MarketInsights {
  salary: {
    min: number;
    max: number;
    median: number;
    currency: string;
    source: string;
    confidence: number;
  };
  competition: {
    companies_hiring: string[];
    job_postings_count: number;
    market_saturation: 'low' | 'medium' | 'high';
  };
  time_to_hire: {
    average_days: number;
    range: { min: number; max: number };
  };
  candidate_availability: {
    level: 'scarce' | 'limited' | 'moderate' | 'abundant';
    description: string;
  };
  key_skills: {
    required: string[];
    emerging: string[];
    declining: string[];
  };
  trends: string[];
  generated_at: string;
  model_used: string;
}
```

**Two-Phase Generation:**
- [ ] Phase 1 (Immediate): Claude Sonnet returns preliminary data
- [ ] Phase 2 (Background): Claude Opus performs deep research
- [ ] Polling mechanism for Phase 2 completion
- [ ] UI shows Phase 1 immediately, updates when Phase 2 ready

**Implementation:**
- [ ] Supabase Edge Function for AI orchestration
- [ ] Background job queue (Supabase pg_cron or external)
- [ ] WebSocket or polling for real-time updates
- [ ] Caching layer for repeated queries

### Day 2-4: JD Generator

**Features:**
- [ ] AI-generated job description from inputs
- [ ] Style selector (formal, creative, concise, detailed)
- [ ] Rich text editor for manual editing (Tiptap recommended)
- [ ] Section reordering
- [ ] Regenerate individual sections
- [ ] Copy to clipboard
- [ ] Export to different formats

**Editor Implementation:**
```typescript
// Using Tiptap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const JDEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  
  return (
    <div className="border rounded-lg">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
```

### Day 4-5: Discovery Chapter UI

**Layout:**
```
Discovery Chapter
├── Header (chapter title, navigation)
├── Input Panel (left or top)
│   ├── Role details form
│   ├── Style selector
│   └── Generate button
├── Results Panel (right or bottom)
│   ├── Market Insights Card
│   │   ├── Salary range visualization
│   │   ├── Competition overview
│   │   ├── Time to hire
│   │   ├── Availability indicator
│   │   ├── Key skills tags
│   │   └── Trends list
│   └── Job Description Card
│       ├── Style tabs
│       ├── Rich text editor
│       └── Actions (copy, export, regenerate)
└── Footer (save, next chapter)
```

**Components:**
- [ ] Market Insights dashboard cards
- [ ] Salary range visualization (bar or range chart)
- [ ] Skills tag cloud
- [ ] Competition indicator
- [ ] JD editor with toolbar
- [ ] Loading states for AI generation

### Week 3 Deliverables
- [ ] Market Insights generation working
- [ ] JD Generator with editor
- [ ] Discovery chapter fully functional
- [ ] Weekly progress report

---

## Week 4: Process Chapter

### Objectives
- Build interview stage generator
- Create stage management UI
- Implement question suggestions

### Day 1-2: Interview Stage Generator

**AI Generation:**
```typescript
interface InterviewStage {
  name: string;
  type: 'screening' | 'technical' | 'behavioral' | 'cultural' | 'final' | 'custom';
  duration_minutes: number;
  description: string;
  focus_areas: {
    name: string;
    weight: number; // importance 1-4
  }[];
  suggested_questions: {
    question: string;
    purpose: string;
    look_for: string[];
  }[];
  assessments?: {
    type: string;
    description: string;
  }[];
}
```

**Discipline-Specific Logic:**
- [ ] Software Engineering → Technical assessment, coding exercise
- [ ] Sales → Role play, presentation
- [ ] Marketing → Portfolio review, case study
- [ ] Finance → Technical questions, case study
- [ ] General → Behavioral, cultural fit
- [ ] Configurable templates per discipline

### Day 2-4: Stage Management UI

**Features:**
- [ ] Vertical stage list with drag-and-drop reorder
- [ ] Expandable stage cards
- [ ] Add custom stage
- [ ] Edit stage details
- [ ] Remove stage (with confirmation)
- [ ] Assign interviewer to stage
- [ ] Duration estimates with total timeline

**Stage Card Component:**
```
┌─────────────────────────────────────────┐
│ 1. Phone Screening          [30 min] ▼  │
├─────────────────────────────────────────┤
│ Focus Areas:                            │
│ • Communication skills                  │
│ • Role motivation                       │
│ • Salary expectations                   │
│                                         │
│ Suggested Questions:                    │
│ • "Tell me about your experience..."    │
│ • "What interests you about..."         │
│                                         │
│ Assigned: [Select interviewer ▼]        │
│                                         │
│ [Edit] [Remove]                         │
└─────────────────────────────────────────┘
```

### Day 4-5: Question Bank & Customization

**Features:**
- [ ] AI-suggested questions per stage
- [ ] Question purpose and what to look for
- [ ] Add custom questions
- [ ] Save questions to organization's question bank
- [ ] Reuse questions across playbooks
- [ ] Question categories/tags

### Week 4 Deliverables
- [ ] Interview stage generator working
- [ ] Stage management UI complete
- [ ] Question suggestions implemented
- [ ] Mid-project milestone reached
- [ ] Invoice #2 sent (€2,500 + VAT)
- [ ] Weekly progress report

---

## Week 5: Alignment Chapter

### Objectives
- Build candidate profile builder
- Create process summary view
- Implement collaborator system
- Build shareable links

### Day 1-2: Candidate Profile Builder

**Profile Structure:**
```typescript
interface CandidateProfile {
  experience: {
    min_years: number;
    max_years: number;
    level: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  };
  skills: {
    required: string[];
    preferred: string[];
    nice_to_have: string[];
  };
  industries: {
    preferred: string[];
    excluded: string[];
  };
  education: {
    level?: string;
    fields?: string[];
    required: boolean;
  };
  other_requirements: string[];
}
```

**UI Components:**
- [ ] Experience level selector (visual slider or dropdown)
- [ ] Skills input with autocomplete
- [ ] Industry multi-select
- [ ] Education requirements (optional)
- [ ] Custom requirements text field
- [ ] AI suggestions based on role

### Day 2-3: Process Summary View

**Dashboard showing:**
- [ ] Total stages count
- [ ] Estimated timeline (sum of durations + buffer)
- [ ] Interviewers involved
- [ ] Key focus areas across all stages
- [ ] Stage timeline visualization
- [ ] Print-friendly view

### Day 3-4: Collaborator System

**Features:**
- [ ] Invite collaborators by email
- [ ] Role assignment (interviewer for specific stages)
- [ ] Magic link invitations (no account required for basic access)
- [ ] Pending invitations list
- [ ] Resend invitation
- [ ] Revoke access

**Email Integration (Resend):**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCollaboratorInvite(params: {
  email: string;
  inviterName: string;
  playbookTitle: string;
  stageName: string;
  magicLink: string;
}) {
  await resend.emails.send({
    from: 'Rec+onnect <noreply@reconnect.io>',
    to: params.email,
    subject: `You've been invited to interview for ${params.playbookTitle}`,
    html: renderInviteEmail(params),
  });
}
```

### Day 4-5: Shareable Links

**Features:**
- [ ] Generate read-only shareable link
- [ ] Link expiration (7 days, 30 days, custom)
- [ ] Optional password protection
- [ ] View counter
- [ ] Revoke link
- [ ] Public view (no auth required) with limited info

**Link Structure:**
```
https://app.reconnect.io/share/[unique-token]
```

### Week 5 Deliverables
- [ ] Candidate profile builder complete
- [ ] Process summary view
- [ ] Collaborator invitation system
- [ ] Shareable links working
- [ ] Weekly progress report

---

## Week 6: Debrief Chapter

### Objectives
- Implement interview recording
- Build transcription pipeline
- Create feedback forms
- Implement AI synthesis

### Day 1-2: Interview Recording

**Browser Recording (MediaRecorder API):**
```typescript
const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    
    mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.current.onstop = () => {
      setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
    };
    
    mediaRecorder.current.start();
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };
  
  return { isRecording, audioBlob, startRecording, stopRecording };
};
```

**Features:**
- [ ] Start/stop recording controls
- [ ] Recording timer
- [ ] Audio level visualization
- [ ] Pause/resume (if supported)
- [ ] Upload to Supabase Storage
- [ ] Alternative: Upload external recording

### Day 2-3: Transcription Pipeline

**Whisper Integration:**
```typescript
// Supabase Edge Function
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

export async function transcribeAudio(audioUrl: string): Promise<string> {
  // Download audio from Supabase Storage
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();
  
  // Send to Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audioBlob,
    model: 'whisper-1',
    language: 'en',
    response_format: 'text',
  });
  
  return transcription;
}
```

**Pipeline:**
1. Audio uploaded to Supabase Storage
2. Edge Function triggered
3. Audio sent to Whisper API
4. Transcript stored in database
5. UI updated via real-time subscription

**Considerations:**
- [ ] Handle large files (chunking if needed)
- [ ] Progress indicator during transcription
- [ ] Error handling for failed transcriptions
- [ ] Manual transcript editing capability

### Day 3-4: Feedback Forms

**Feedback Structure:**
```typescript
interface InterviewFeedback {
  interview_id: string;
  interviewer_id: string;
  ratings: {
    category: string;
    score: number; // 1-4
    notes?: string;
  }[];
  overall_notes: string;
  pros: string[];          // JSONB array of strengths
  cons: string[];          // JSONB array of concerns
  focus_areas_confirmed: boolean; // Required: confirm focus areas discussed
  // NO recommendation field — human decides (client decision)
}
```

**UI Components:**
- [ ] Rating scales 1-4 (numbers)
- [ ] Structured feedback sections (per focus area)
- [ ] Pros/cons input (JSONB arrays)
- [ ] Focus areas confirmation checkbox (required)
- [ ] Rich text notes
- [ ] Submit confirmation
- [ ] Edit submitted feedback (within time limit)
- NOTE: NO recommendation selector — human decides

**Access Control:**
- [ ] Blind feedback: Interviewers can't see others' feedback until submitted
- [ ] Reveal after submission
- [ ] Hiring manager sees all immediately

### Day 4-5: AI Feedback Synthesis

**CRITICAL: EU AI Act Compliance**
- NO emotion detection
- NO voice analysis
- NO biometric inference
- TEXT-BASED ONLY

**Synthesis Features:**
```typescript
interface FeedbackSynthesis {
  summary: string;
  consensus: {
    areas_of_agreement: string[];
    areas_of_disagreement: string[];
  };
  key_strengths: string[];
  key_concerns: string[];
  discussion_points: string[];
  rating_overview: {
    scale: '1-4';
    average_by_category: Record<string, number>;
    score_distribution: Record<string, number>;
  };
  // NO recommendation_breakdown — human decides (client decision)
  disclaimer: string; // Always include AI disclaimer
}
```

**Implementation:**
- [ ] Collect all feedback for a candidate
- [ ] Send to Claude for synthesis (text only)
- [ ] Generate structured comparison
- [ ] Highlight divergent opinions
- [ ] Flag vague or missing feedback
- [ ] Display with clear AI disclaimer

### Week 6 Deliverables
- [ ] Recording functionality working
- [ ] Transcription pipeline complete
- [ ] Feedback forms implemented
- [ ] AI synthesis working (compliant)
- [ ] Debrief chapter complete
- [ ] Weekly progress report

---

## Week 7: Google Drive + Polish

### Objectives
- Implement Google Drive integration
- Bug fixes and optimization
- Security audit
- Performance optimization

### Day 1-3: Google Drive Integration

**Features:**
- [ ] OAuth flow for Google Drive authorization
- [ ] Save recordings to user's Google Drive
- [ ] Save/export playbooks as documents
- [ ] Export candidate summaries
- [ ] Folder organization in Drive
- [ ] Revoke access option

**Implementation:**
```typescript
// Google Drive service
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function uploadToDrive(params: {
  accessToken: string;
  file: Buffer;
  fileName: string;
  mimeType: string;
  folderId?: string;
}) {
  oauth2Client.setCredentials({ access_token: params.accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  const response = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: params.folderId ? [params.folderId] : undefined,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.file),
    },
  });
  
  return response.data;
}
```

### Day 3-4: Bug Fixes & Optimization

**Bug Fixing:**
- [ ] Review all reported issues
- [ ] Fix critical bugs first
- [ ] Test edge cases
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Desktop layout verification (min 1024px)

**Performance Optimization:**
- [ ] Analyze bundle size (target < 200KB initial)
- [ ] Implement code splitting
- [ ] Optimize images
- [ ] Add service worker for caching
- [ ] Database query optimization
- [ ] API response time audit

### Day 4-5: Security Audit

**Checklist:**
- [ ] All API routes authenticated
- [ ] RLS policies tested thoroughly
- [ ] No sensitive data in client logs
- [ ] Environment variables secured
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] SQL injection prevention (Supabase handles, but verify)
- [ ] Secure file upload (type validation, size limits)
- [ ] Audit logging for sensitive operations

### Week 7 Deliverables
- [ ] Google Drive integration complete
- [ ] All known bugs fixed
- [ ] Security audit passed
- [ ] Performance targets met
- [ ] Ready for beta
- [ ] Weekly progress report

---

## Week 8: Beta Testing

### Objectives
- Deploy to production
- Beta testing with real users
- Bug fixes from beta feedback
- Final delivery

### Day 1: Production Deployment

**Deployment Checklist:**
- [ ] Production environment variables set
- [ ] Database migrations applied
- [ ] DNS configured for domains
- [ ] SSL certificates active
- [ ] Error monitoring set up (Sentry)
- [ ] Analytics verified
- [ ] Backup strategy confirmed

**URLs:**
- Landing page: https://reconnect.io (or client domain)
- Application: https://app.reconnect.io (or client domain)

### Day 2-4: Beta Testing

**Beta Process:**
- [ ] Robert provides 5-10 beta testers
- [ ] Create test accounts for beta users
- [ ] Provide beta testing guide/scenarios
- [ ] Set up feedback collection (form or direct channel)
- [ ] Daily check-ins with Robert
- [ ] Prioritize and fix reported issues

**Test Scenarios:**
1. Create organization and invite team member
2. Create complete playbook (all 4 chapters)
3. Invite collaborator to interview stage
4. Record interview and view transcription
5. Submit feedback and view AI synthesis
6. Share playbook via link
7. Export to Google Drive

### Day 4-5: Final Fixes & Handover

**Final Deliverables:**
- [ ] All critical beta bugs fixed
- [ ] Documentation completed
  - [ ] User guide
  - [ ] Admin guide
  - [ ] API documentation (if applicable)
- [ ] Handover meeting with Robert
- [ ] Transfer ownership of:
  - [ ] GitHub repository (if applicable)
  - [ ] Vercel projects
  - [ ] Environment variables documentation
- [ ] Transition plan for ongoing support

### Week 8 Deliverables
- [ ] Production deployed and live
- [ ] Beta testing completed
- [ ] All critical bugs fixed
- [ ] Documentation delivered
- [ ] Project handover complete
- [ ] Final invoice sent (€2,500 + VAT)
- [ ] 30-day warranty period begins

---

## Post-Delivery

### 30-Day Warranty Period
- Bug fixes within delivered scope at no cost
- Does not include:
  - Client modifications
  - Third-party integration issues
  - Hosting/infrastructure problems
  - Feature requests

### Ongoing Support (Optional - €150/month)
- Basic maintenance
- QA of code revisions
- Edge-case bug fixes
- Priority response
- Does not include new feature development

### Future Enhancement Opportunities
- Mobile app (iOS/Android)
- Calendar integrations
- ATS integrations
- Custom analytics dashboard
- Multi-language support
- Payment/billing system

---

## Appendix: Technical Reference

### Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Resend
RESEND_API_KEY=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- GitLens
- Thunder Client (API testing)

### Useful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check

# Database
npx supabase db push      # Push schema changes
npx supabase gen types    # Generate TypeScript types

# Deployment
vercel --prod        # Deploy to production
```

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Prepared by: Akella inMotion*
