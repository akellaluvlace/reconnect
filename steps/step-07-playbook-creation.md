# Step 7 — Playbook Creation Flow (Wizard + Persistence)

**Status:** NOT STARTED
**Week:** 2 (Day 4-5)
**Default Owners:** Frontend + UI Builder + Backend + QA

---

## Goal

Enable creation of a Playbook and storage of generated content.

---

## Deliverables

- Playbook wizard: basic info → role details → AI generation
- Zustand store for draft
- DB persistence for playbooks, draft/active states
- UX states: loading, error, retry, save, resume

---

## Definition of Done (Step Level)

- [ ] User can create a playbook and revisit it
- [ ] Generated content stored and reloadable
- [ ] Wizard handles all error states gracefully
- [ ] All micro steps complete

---

## Micro Steps

### 7.1 — Create Playbook List Page

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step07-1-playbook-list`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/page.tsx`
- `apps/web/src/components/playbooks/**`

**Tasks:**
- [ ] Create playbooks list page:
```tsx
// apps/web/src/app/(dashboard)/playbooks/page.tsx
import { createClient } from '@/lib/supabase/server';
import { PlaybookList } from '@/components/playbooks/playbook-list';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function PlaybooksPage() {
  const supabase = await createClient(); // ← MUST await (Next.js 15+)
  const { data: playbooks, error } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[playbooks] Failed to load:", error.message);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playbooks"
        description="Manage your hiring playbooks"
        action={
          <Link href="/playbooks/new">
            <Button>Create Playbook</Button>
          </Link>
        }
      />
      <PlaybookList playbooks={playbooks ?? []} />
    </div>
  );
}
```

- [ ] Create PlaybookCard component:
```tsx
// apps/web/src/components/playbooks/playbook-card.tsx
interface PlaybookCardProps {
  playbook: Playbook;
}

export function PlaybookCard({ playbook }: PlaybookCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{playbook.title}</CardTitle>
          <StatusBadge status={playbook.status} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Created {formatDate(playbook.created_at)}
        </p>
      </CardContent>
      <CardFooter>
        <Link href={`/playbooks/${playbook.id}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

- [ ] Create empty state for no playbooks
- [ ] Create loading skeleton

**Design Checklist:**
- [ ] Grid layout (3 columns, desktop-only min 1024px)
- [ ] Clear CTA for creating first playbook
- [ ] Status badges visible

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Navigate to /playbooks
```

**Output:** Playbooks list page with cards

---

### 7.2 — Create Playbook Wizard - Step 1 (Basic Info)

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step07-2-wizard-step1`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/new/page.tsx`
- `apps/web/src/components/playbooks/wizard/**`

**Tasks:**
- [ ] Create wizard container:
```tsx
// apps/web/src/app/(dashboard)/playbooks/new/page.tsx
'use client';

import { usePlaybookStore } from '@/stores/playbook-store';
import { WizardStep1 } from '@/components/playbooks/wizard/step-1';
import { WizardStep2 } from '@/components/playbooks/wizard/step-2';
import { WizardStep3 } from '@/components/playbooks/wizard/step-3';
import { WizardProgress } from '@/components/playbooks/wizard/progress';

export default function NewPlaybookPage() {
  const { draft } = usePlaybookStore();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <WizardProgress currentStep={draft.step} totalSteps={3} />

      {draft.step === 1 && <WizardStep1 />}
      {draft.step === 2 && <WizardStep2 />}
      {draft.step === 3 && <WizardStep3 />}
    </div>
  );
}
```

- [ ] Create Step 1 - Basic Info form:
```tsx
// apps/web/src/components/playbooks/wizard/step-1.tsx
const step1Schema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().optional(),
});

export function WizardStep1() {
  const { draft, updateBasicInfo, setStep } = usePlaybookStore();

  const form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: draft.basicInfo,
  });

  const onSubmit = (data: z.infer<typeof step1Schema>) => {
    updateBasicInfo(data);
    setStep(2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Start by naming your playbook
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Engineering" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

- [ ] Create WizardProgress component

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Navigate to /playbooks/new
```

**Output:** Wizard Step 1 working

---

### 7.3 — Create Playbook Wizard - Step 2 (Role Details)

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step07-3-wizard-step2`

**Allowed Paths:**
- `apps/web/src/components/playbooks/wizard/step-2.tsx`

**Tasks:**
- [ ] Create Step 2 - Role Details form:
```tsx
const step2Schema = z.object({
  level: z.string().min(1, 'Level is required'),
  skills: z.array(z.string()).min(1, 'At least one skill required'),
  industry: z.string().min(1, 'Industry is required'),
});

const levels = [
  { value: 'junior', label: 'Junior (0-2 years)' },
  { value: 'mid', label: 'Mid-Level (2-5 years)' },
  { value: 'senior', label: 'Senior (5-8 years)' },
  { value: 'lead', label: 'Lead (8+ years)' },
  { value: 'executive', label: 'Executive' },
];

const industries = [
  'Technology',
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Professional Services',
  'Other',
];

export function WizardStep2() {
  const { draft, updateRoleDetails, setStep } = usePlaybookStore();

  // Form with level select, skills multi-input, industry select
  // Back button to step 1
  // Continue button to step 3
}
```

- [ ] Create skills input component (tag-style input)
- [ ] Add validation messages
- [ ] Add back button functionality

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Wizard Step 2 working

---

### 7.4 — Create Playbook Wizard - Step 3 (AI Generation)

**Owner:** Frontend
**Supporting:** AI Engineer, UI Builder
**Status:** PENDING
**Branch:** `step07-4-wizard-step3`

**Allowed Paths:**
- `apps/web/src/components/playbooks/wizard/step-3.tsx`

**Tasks:**
- [ ] Create Step 3 - AI Generation:
```tsx
export function WizardStep3() {
  const { draft, setGeneratedContent, resetDraft } = usePlaybookStore();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Call AI endpoints
      const [jdResponse, insightsResponse] = await Promise.all([
        fetch('/api/ai/generate-jd', {
          method: 'POST',
          body: JSON.stringify({
            role: draft.basicInfo.title,
            level: draft.roleDetails.level,
            industry: draft.roleDetails.industry,
            style: 'formal',
          }),
        }),
        fetch('/api/ai/market-insights', {
          method: 'POST',
          body: JSON.stringify({
            role: draft.basicInfo.title,
            level: draft.roleDetails.level,
            industry: draft.roleDetails.industry,
          }),
        }),
      ]);

      if (!jdResponse.ok || !insightsResponse.ok) {
        throw new Error('AI generation failed');
      }

      const jdData = await jdResponse.json();
      const insightsData = await insightsResponse.json();

      setGeneratedContent({
        jobDescription: jdData.data,
        marketInsights: insightsData.data,
      });

      // Save to database
      const playbook = await savePlaybook();

      // Navigate to playbook
      router.push(`/playbooks/${playbook.id}/discovery`);
      resetDraft();
    } catch (err) {
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Content</CardTitle>
        <CardDescription>
          We'll use AI to generate market insights and a job description
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary of inputs */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="font-medium">{draft.basicInfo.title}</h4>
          <p className="text-sm text-muted-foreground">
            {draft.roleDetails.level} • {draft.roleDetails.industry}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {draft.roleDetails.skills.map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Generating content...</p>
            <Progress value={undefined} /> {/* Indeterminate */}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate & Create'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] Implement loading state with progress indication
- [ ] Implement error state with retry
- [ ] Save playbook to database after generation

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Complete wizard flow
```

**Output:** Wizard Step 3 with AI generation

---

### 7.5 — Create Playbook API Routes

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step07-5-playbook-api`

**Allowed Paths:**
- `apps/web/src/app/api/playbooks/**`

**Tasks:**
- [ ] Create playbooks CRUD routes:
```typescript
// apps/web/src/app/api/playbooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { JobDescription, MarketInsights, CandidateProfile } from '@reconnect/database';
import { z } from 'zod';

const createPlaybookSchema = z.object({
  title: z.string().min(1),
  department: z.string().optional(),
  job_description: z.record(z.unknown()).optional(), // Validated as JobDescription at runtime
  market_insights: z.record(z.unknown()).optional(), // Validated as MarketInsights at runtime
  candidate_profile: z.record(z.unknown()).optional(), // Validated as CandidateProfile at runtime
});

export async function GET() {
  const supabase = await createClient(); // ← MUST await (Next.js 15+)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("[playbooks/GET] Auth error:", authError.message);
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('playbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[playbooks/GET] Query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient(); // ← MUST await (Next.js 15+)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("[playbooks/POST] Auth error:", authError.message);
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createPlaybookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // Get user's org
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("[playbooks/POST] Profile fetch failed:", profileError.message);
    return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
  }

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('playbooks')
    .insert({
      ...parsed.data,
      organization_id: profile.organization_id,
      created_by: user.id,
      status: 'draft' as const,
    })
    .select()
    .single();

  if (error) {
    console.error("[playbooks/POST] Insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

- [ ] Create single playbook routes (GET, PATCH, DELETE)
- [ ] Create playbook stages routes

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test with Thunder Client
```

**Output:** Playbook API routes created

---

### 7.6 — Create Playbook Detail Page Shell

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step07-6-playbook-detail`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/**`
- `apps/web/src/components/playbooks/chapter-nav.tsx`

**Tasks:**
- [ ] Create playbook detail layout:
```tsx
// apps/web/src/app/(dashboard)/playbooks/[id]/layout.tsx
import { ChapterNav } from '@/components/playbooks/chapter-nav';

export default async function PlaybookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>; // ← Next.js 15+: params is a Promise
}) {
  const { id } = await params;
  // Validate UUID format before using
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ChapterNav playbookId={id} />
      {children}
    </div>
  );
}
```

- [ ] Create ChapterNav component:
```tsx
const chapters = [
  { id: 'discovery', name: 'Discovery', icon: Search },
  { id: 'process', name: 'Process', icon: ListChecks },
  { id: 'alignment', name: 'Alignment', icon: Users },
  { id: 'debrief', name: 'Debrief', icon: MessageSquare },
];

export function ChapterNav({ playbookId }: { playbookId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4 border-b">
      {chapters.map((chapter) => (
        <Link
          key={chapter.id}
          href={`/playbooks/${playbookId}/${chapter.id}`}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border-b-2 -mb-px',
            pathname.includes(chapter.id)
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <chapter.icon className="h-4 w-4" />
          {chapter.name}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] Create placeholder pages for each chapter

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Navigate to /playbooks/[id]
```

**Output:** Playbook detail shell with chapter navigation

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 7.1 Playbook List | UI Builder | PENDING | step07-1-playbook-list |
| 7.2 Wizard Step 1 | UI Builder | PENDING | step07-2-wizard-step1 |
| 7.3 Wizard Step 2 | UI Builder | PENDING | step07-3-wizard-step2 |
| 7.4 Wizard Step 3 | Frontend | PENDING | step07-4-wizard-step3 |
| 7.5 Playbook API | Backend | PENDING | step07-5-playbook-api |
| 7.6 Playbook Detail | UI Builder | PENDING | step07-6-playbook-detail |

---

## Dependencies

- **Blocks:** Step 8 (Chapters: Discovery + Process)
- **Blocked By:** Step 5 (Web App Shell), Step 6 (AI Platform)

---

## Notes

- 7.1, 7.5 can run in parallel
- 7.2, 7.3, 7.4 are sequential (wizard steps)
- 7.4 requires 7.5 and Step 6 (AI routes)
- 7.6 can run after 7.5
