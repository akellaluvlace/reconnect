# Step 5 — Web App Shell + Core UI Library

**Status:** COMPLETE + REVIEWED
**Week:** 2 (Day 1-2)
**Default Owners:** Frontend + UI Builder + Architect

---

## Goal

Create the app skeleton and reusable UI patterns for the dashboard experience.

---

## Deliverables

- App Router structure with auth routes + dashboard routes
- Layout: sidebar nav, header, desktop-only
- Core UI components: forms, modals, toasts, tables, empty/loading states, error boundaries

---

## Definition of Done (Step Level)

- [ ] User can authenticate and access dashboard shell
- [ ] Navigation + placeholder pages exist for playbooks/candidates/team/settings
- [ ] Core UI components documented and working
- [ ] All micro steps complete

---

## Micro Steps

### 5.1 — Create Auth Routes

**Owner:** Frontend
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step05-1-auth-routes`

**Allowed Paths:**
- `apps/web/src/app/(auth)/**`
- `apps/web/src/components/auth/**`

**Tasks:**
- [ ] Create auth layout:
```
apps/web/src/app/(auth)/
├── layout.tsx           # Centered card layout
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
├── forgot-password/
│   └── page.tsx
└── verify/
    └── page.tsx         # Email verification
```

- [ ] Create auth components:
  - `login-form.tsx` (email/password)
  - `register-form.tsx` (email/password/name)
  - `forgot-password-form.tsx`
  - `social-auth-buttons.tsx` (Google, Microsoft)

- [ ] Implement auth flows:
  - Login with email/password
  - Login with magic link
  - Register with email/password
  - Forgot password flow
  - Session management

```tsx
// Example login form
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      form.setError('root', { message: error.message });
    }
  };

  // ... render form
}
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
cd apps/web && pnpm dev
# Test login flow
```

**Output:** Auth routes and forms implemented

---

### 5.2 — Create Dashboard Layout

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step05-2-dashboard-layout`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/components/dashboard/**`

**Tasks:**
- [ ] Create dashboard layout:
```tsx
// apps/web/src/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] Create Sidebar component:
  - Logo at top
  - Navigation links with icons
  - Active state highlighting
  - Desktop-only (no mobile hamburger needed)
  - User menu at bottom

- [ ] Create Header component:
  - Page title (dynamic)
  - Search (placeholder)
  - Notifications (placeholder)
  - User avatar + dropdown

- [ ] Navigation structure:
```tsx
const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Playbooks', href: '/playbooks', icon: BookOpen },
  { name: 'Candidates', href: '/candidates', icon: Users },
  { name: 'Team', href: '/team', icon: UserPlus },
  { name: 'Settings', href: '/settings', icon: Settings },
];
```

**Design Checklist:**
- [ ] Sidebar 256px on desktop
- [ ] Desktop-only layout (min-width: 1024px)
- [ ] Active nav item highlighted
- [ ] Consistent spacing

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Verify layout on desktop
```

**Output:** Dashboard layout with sidebar and header

---

### 5.3 — Create Dashboard Routes

**Owner:** Frontend
**Supporting:** UI Builder
**Status:** PENDING
**Branch:** `step05-3-dashboard-routes`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/**`

**Tasks:**
- [ ] Create route structure:
```
apps/web/src/app/(dashboard)/
├── page.tsx                      # Dashboard home
├── playbooks/
│   ├── page.tsx                  # List playbooks
│   ├── new/
│   │   └── page.tsx              # Create playbook wizard
│   └── [id]/
│       ├── page.tsx              # Playbook overview
│       ├── discovery/
│       │   └── page.tsx
│       ├── process/
│       │   └── page.tsx
│       ├── alignment/
│       │   └── page.tsx
│       └── debrief/
│           └── page.tsx
├── candidates/
│   ├── page.tsx                  # List candidates
│   └── [id]/
│       └── page.tsx              # Candidate detail
├── team/
│   ├── page.tsx                  # Team members
│   └── invitations/
│       └── page.tsx              # Pending invitations
└── settings/
    ├── page.tsx                  # Settings overview
    ├── organization/
    │   └── page.tsx
    ├── profile/
    │   └── page.tsx
    ├── integrations/
    │   └── page.tsx
    └── admin/                    # CMS Admin Controls (admin only)
        ├── skills/page.tsx       # Skills taxonomy
        ├── industries/page.tsx   # Industry categories
        ├── levels/page.tsx       # Job level definitions
        ├── templates/page.tsx    # Stage templates
        ├── questions/page.tsx    # Question bank
        ├── jd-templates/page.tsx # JD templates
        └── emails/page.tsx       # Email templates
```

- [ ] Create placeholder pages with:
  - Page title
  - Description
  - "Coming soon" or basic content
  - Proper loading states

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Navigate through all routes
```

**Output:** All dashboard routes created with placeholders

---

### 5.4 — Create Core UI Components

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step05-4-ui-components`

**Allowed Paths:**
- `apps/web/src/components/ui/**`

**Tasks:**
- [ ] Initialize shadcn/ui:
```bash
npx shadcn-ui@latest init
```

- [ ] Add core components:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
```

- [ ] Create custom components:
  - `page-header.tsx` (title + description + actions)
  - `empty-state.tsx` (icon + message + CTA)
  - `loading-state.tsx` (skeleton patterns)
  - `error-boundary.tsx` (error display)
  - `data-table.tsx` (sortable, filterable table)

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** UI component library ready

---

### 5.5 — Create Middleware & Auth Guards

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step05-5-middleware`

**Allowed Paths:**
- `apps/web/src/middleware.ts`
- `apps/web/src/lib/auth/**`

**Tasks:**
- [ ] Create middleware:
```tsx
// apps/web/src/middleware.ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] Create auth guards:
```tsx
// apps/web/src/lib/auth/require-auth.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

export async function requireRole(roles: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !roles.includes(profile.role)) {
    redirect('/unauthorized');
  }

  return { user, role: profile.role };
}
```

- [ ] Protect dashboard routes:
```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import { requireAuth } from '@/lib/auth/require-auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  // ... layout
}
```

**Security Checklist:**
- [ ] All dashboard routes protected
- [ ] Session refresh working
- [ ] Redirect to login if unauthenticated

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Test access without login (should redirect)
# Test access with login (should work)
```

**Output:** Middleware and auth guards implemented

---

### 5.6 — Create Zustand Stores

**Owner:** Frontend
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step05-6-zustand-stores`

**Allowed Paths:**
- `apps/web/src/stores/**`

**Tasks:**
- [ ] Create auth store:
```tsx
// apps/web/src/stores/auth-store.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

- [ ] Create UI store:
```tsx
// apps/web/src/stores/ui-store.ts
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
```

- [ ] Create playbook store (for wizard):
```tsx
// apps/web/src/stores/playbook-store.ts
import { create } from 'zustand';

interface PlaybookDraft {
  step: number;
  basicInfo: { title: string; department: string };
  roleDetails: { level: string; skills: string[]; industry: string };
  generatedContent: {
    jobDescription?: any;
    marketInsights?: any;
    interviewStages?: any[];
  };
}

interface PlaybookStore {
  draft: PlaybookDraft;
  setStep: (step: number) => void;
  updateBasicInfo: (info: Partial<PlaybookDraft['basicInfo']>) => void;
  updateRoleDetails: (details: Partial<PlaybookDraft['roleDetails']>) => void;
  setGeneratedContent: (content: Partial<PlaybookDraft['generatedContent']>) => void;
  resetDraft: () => void;
}

const initialDraft: PlaybookDraft = {
  step: 1,
  basicInfo: { title: '', department: '' },
  roleDetails: { level: '', skills: [], industry: '' },
  generatedContent: {},
};

export const usePlaybookStore = create<PlaybookStore>((set) => ({
  draft: initialDraft,
  setStep: (step) => set((state) => ({ draft: { ...state.draft, step } })),
  updateBasicInfo: (info) => set((state) => ({
    draft: { ...state.draft, basicInfo: { ...state.draft.basicInfo, ...info } }
  })),
  updateRoleDetails: (details) => set((state) => ({
    draft: { ...state.draft, roleDetails: { ...state.draft.roleDetails, ...details } }
  })),
  setGeneratedContent: (content) => set((state) => ({
    draft: { ...state.draft, generatedContent: { ...state.draft.generatedContent, ...content } }
  })),
  resetDraft: () => set({ draft: initialDraft }),
}));
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Zustand stores created

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 5.1 Auth Routes | Frontend | PENDING | step05-1-auth-routes |
| 5.2 Dashboard Layout | UI Builder | PENDING | step05-2-dashboard-layout |
| 5.3 Dashboard Routes | Frontend | PENDING | step05-3-dashboard-routes |
| 5.4 UI Components | UI Builder | PENDING | step05-4-ui-components |
| 5.5 Middleware | Backend | PENDING | step05-5-middleware |
| 5.6 Zustand Stores | Frontend | PENDING | step05-6-zustand-stores |

---

## Dependencies

- **Blocks:** Step 7 (Playbook Creation), Step 8 (Chapters)
- **Blocked By:** Step 2 (Monorepo), Step 3 (Supabase Core)

---

## Notes

- 5.1 and 5.4 can run in parallel
- 5.2 depends on 5.4 (uses UI components)
- 5.3 depends on 5.2 (uses layout)
- 5.5 can run parallel after 5.1
- 5.6 can run parallel after 5.3
