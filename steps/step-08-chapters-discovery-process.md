# Step 8 — Chapters: Discovery + Process

**Status:** NOT STARTED
**Week:** 3-4
**Default Owners:** Frontend + UI Builder + AI Engineer + Backend + QA

---

## Goal

Ship the first half of the core product loop.

---

## Deliverables

**Discovery:**
- Market Insights (two-phase: quick + deep research)
- JD Generator (styles + Tiptap editing + regenerate sections)
- Save results to playbook

**Process:**
- Stage generator API + discipline templates
- Stage management UI (drag/drop, edit, assign interviewer, total timeline)
- Question suggestions + question bank foundation

---

## Definition of Done (Step Level)

- [ ] User can complete Discovery + Process end-to-end for a playbook
- [ ] Data saved and reloadable
- [ ] Basic tests added for key flows
- [ ] All micro steps complete

---

## Micro Steps

### 8.1 — Build Market Insights UI

**Owner:** UI Builder
**Supporting:** AI Engineer
**Status:** PENDING
**Branch:** `step08-1-market-insights-ui`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/discovery/page.tsx`
- `apps/web/src/components/discovery/**`

**Tasks:**
- [ ] Create Discovery page layout
- [ ] Create Market Insights dashboard cards:
  - Salary range visualization (min/max/median bar)
  - Competition indicator (companies hiring, saturation level)
  - Time to hire card (average days, range)
  - Candidate availability indicator
  - Key skills section (required, emerging, declining tags)
  - Market trends list
- [ ] Create loading skeleton for insights
- [ ] Create "Regenerate Insights" button
- [ ] Display AI metadata (generated_at, confidence)

**Design Checklist:**
- [ ] Clear visual hierarchy
- [ ] Data visualizations readable
- [ ] Loading state doesn't jump layout
- [ ] Desktop layout (min 1024px)

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Market Insights UI complete

---

### 8.2 — Implement Two-Phase Market Insights

**Owner:** AI Engineer
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step08-2-two-phase-insights`

**Allowed Paths:**
- `apps/web/src/app/api/ai/market-insights/**`
- `supabase/functions/ai-deep-insights/**`

**Tasks:**
- [ ] Phase 1 (Immediate): Claude Sonnet returns preliminary data
- [ ] Phase 2 (Background): Claude Opus performs deep research
- [ ] Implement polling mechanism for Phase 2 completion
- [ ] Store insights with phase indicator in database
- [ ] Update UI when Phase 2 completes

```typescript
// Two-phase response structure
interface MarketInsightsResponse {
  data: MarketInsights;
  phase: 'quick' | 'deep';
  deep_research_pending?: boolean;
  deep_research_id?: string;
}
```

**DoD Commands:**
```bash
pnpm test -- market-insights
```

**Output:** Two-phase generation working

---

### 8.3 — Build JD Generator UI

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step08-3-jd-generator-ui`

**Allowed Paths:**
- `apps/web/src/components/discovery/jd-generator.tsx`
- `apps/web/src/components/discovery/jd-editor.tsx`
- `apps/web/src/components/discovery/style-selector.tsx`

**Tasks:**
- [ ] Create JD Generator component:
  - Style selector (formal, creative, concise)
  - Length options (short, standard, detailed)
  - Generate button
  - Preview panel
- [ ] Implement style selector UI
- [ ] Create JD preview with sections

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** JD Generator UI complete

---

### 8.4 — Integrate Tiptap Editor

**Owner:** Frontend
**Supporting:** UI Builder
**Status:** PENDING
**Branch:** `step08-4-tiptap-editor`

**Allowed Paths:**
- `apps/web/src/components/discovery/jd-editor.tsx`
- `apps/web/src/components/ui/editor/**`

**Tasks:**
- [ ] Install Tiptap:
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link
```

- [ ] Create JD Editor component:
```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface JDEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export function JDEditor({ content, onChange, editable = true }: JDEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border rounded-lg">
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[300px]"
      />
    </div>
  );
}
```

- [ ] Create EditorToolbar with formatting buttons
- [ ] Handle save/autosave

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Test editor functionality
```

**Output:** Tiptap editor integrated

---

### 8.5 — Build Interview Stage Generator API

**Owner:** AI Engineer
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step08-5-stage-generator`

**Allowed Paths:**
- `apps/web/src/app/api/ai/generate-stages/route.ts`
- `packages/ai/src/prompts/stage-generation.ts`

**Tasks:**
- [ ] Create stage generation prompt with discipline awareness:
```typescript
const disciplineTemplates = {
  'software-engineering': ['HR Screen', 'Technical Assessment', 'Coding Exercise', 'System Design', 'Cultural Fit', 'Reference Check'],
  'sales': ['HR Screen', 'Role Play', 'Presentation', 'Manager Interview', 'Cultural Fit', 'Reference Check'],
  'marketing': ['HR Screen', 'Portfolio Review', 'Case Study', 'Cultural Fit', 'Reference Check'],
  'finance': ['HR Screen', 'Technical Questions', 'Case Study', 'Cultural Fit', 'Reference Check'],
  'general': ['HR Screen', 'Behavioral', 'Cultural Fit', 'Reference Check'],
};
// Default stages: HR Screen + Reference Check (both removable per client)
// All industries supported (client: "All")
// Global regions (client: "Global")
```

- [ ] Create generate-stages API route
- [ ] Include suggested questions per stage
- [ ] Enforce: **2-3 focus areas per interview stage** (client requirement)
- [ ] Enforce: **3-5 questions per focus area** (client requirement)
- [ ] Include focus areas with weights (1-4 scale)
- [ ] Competitor company names shown in market data (don't need to be actively hiring)

**DoD Commands:**
```bash
pnpm test -- generate-stages
```

**Output:** Stage generator API working

---

### 8.6 — Build Stage Management UI

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step08-6-stage-management-ui`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/process/page.tsx`
- `apps/web/src/components/process/**`

**Tasks:**
- [ ] Create Process page layout
- [ ] Install dnd-kit:
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] Create StageList with drag-and-drop
- [ ] Create StageCard component (expandable):
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

- [ ] Create Add Stage button/modal
- [ ] Create Edit Stage modal
- [ ] Show total timeline at bottom
- [ ] Implement stage reordering via drag

**Design Checklist:**
- [ ] Drag handles visible
- [ ] Drop zones clear during drag
- [ ] Desktop-only layout verified

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Stage management UI complete

---

### 8.7 — Build Question Bank

**Owner:** Frontend
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step08-7-question-bank`

**Allowed Paths:**
- `apps/web/src/components/process/question-bank.tsx`

**Tasks:**
- [ ] `cms_questions` table already exists (migration #8). Wire up the UI:


- [ ] Create QuestionBank component:
  - View AI-suggested questions
  - Add custom questions
  - Save to organization's bank
  - Reuse across playbooks

**DoD Commands:**
```bash
supabase db reset
cd apps/web && pnpm dev
```

**Output:** Question bank foundation

---

### 8.8 — Create Stage API Routes

**Owner:** Backend
**Supporting:** None
**Status:** PENDING
**Branch:** `step08-8-stage-api`

**Allowed Paths:**
- `apps/web/src/app/api/playbooks/[id]/stages/**`

**Tasks:**
- [ ] Create stages CRUD routes
- [ ] Create reorder route:
```typescript
// POST /api/playbooks/[id]/stages/reorder
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Next.js 15+: params is Promise
) {
  const { id } = await params;
  // Validate UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid playbook ID' }, { status: 400 });
  }

  const supabase = await createClient(); // ← MUST await
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) console.error("[stages/reorder] Auth error:", authError.message);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Receive array of { id, order_index }
  const body = await req.json();
  // Update all stages — Supabase doesn't support transactions in JS client,
  // so update one by one with error collection
  for (const stage of body.stages) {
    const { error } = await supabase
      .from('interview_stages')
      .update({ order_index: stage.order_index })
      .eq('id', stage.id)
      .eq('playbook_id', id);
    if (error) {
      console.error("[stages/reorder] Update failed:", error.message);
      return NextResponse.json({ error: 'Reorder failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Stage API routes created

---

### 8.9 — Add Tests for Discovery & Process

**Owner:** QA
**Supporting:** All
**Status:** PENDING
**Branch:** `step08-9-tests`

**Allowed Paths:**
- `apps/web/src/**/*.test.ts`

**Tasks:**
- [ ] Test Market Insights component rendering
- [ ] Test JD Editor content handling
- [ ] Test Stage drag-and-drop logic
- [ ] Test AI response validation
- [ ] Test stage reorder API

**DoD Commands:**
```bash
pnpm test
```

**Output:** Tests passing

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 8.1 Market Insights UI | UI Builder | PENDING | step08-1-market-insights-ui |
| 8.2 Two-Phase Insights | AI Engineer | PENDING | step08-2-two-phase-insights |
| 8.3 JD Generator UI | UI Builder | PENDING | step08-3-jd-generator-ui |
| 8.4 Tiptap Editor | Frontend | PENDING | step08-4-tiptap-editor |
| 8.5 Stage Generator API | AI Engineer | PENDING | step08-5-stage-generator |
| 8.6 Stage Management UI | UI Builder | PENDING | step08-6-stage-management-ui |
| 8.7 Question Bank | Frontend | PENDING | step08-7-question-bank |
| 8.8 Stage API | Backend | PENDING | step08-8-stage-api |
| 8.9 Tests | QA | PENDING | step08-9-tests |

---

## Dependencies

- **Blocks:** Step 9 (Alignment + Debrief)
- **Blocked By:** Step 7 (Playbook Creation)

---

## Milestone

**End of Week 4: Mid-project payment (€2,500 + VAT)**
