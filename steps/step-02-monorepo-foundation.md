# Step 2 — Monorepo Foundation

**Status:** COMPLETE
**Week:** 1 (Day 1-2)
**Default Owners:** DevOps + Architect

---

## Goal

Create a stable Turborepo foundation for app + landing + shared packages.

---

## Deliverables

- Monorepo structure: `apps/web`, `apps/landing`, `packages/*`, `supabase/*`
- Root scripts (`dev`, `build`, `lint`, `type-check`, db helpers)
- Turbo pipeline configured

---

## Definition of Done (Step Level)

- [ ] `pnpm install` works without errors
- [ ] `turbo run dev` starts both apps
- [ ] `turbo run lint` passes
- [ ] `turbo run type-check` passes
- [ ] All micro steps complete

---

## Micro Steps

### 2.1 — Create Directory Structure

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step02-1-directory-structure`

**Allowed Paths:** All root directories

**Tasks:**
```bash
# Create directory structure
mkdir -p apps/web apps/landing
mkdir -p packages/ui packages/database packages/ai packages/config
mkdir -p supabase/migrations supabase/functions
mkdir -p docs
```

- [ ] Create `apps/web/` directory
- [ ] Create `apps/landing/` directory
- [ ] Create `packages/ui/` directory
- [ ] Create `packages/database/` directory
- [ ] Create `packages/ai/` directory
- [ ] Create `packages/config/` directory
- [ ] Create `supabase/migrations/` directory
- [ ] Create `supabase/functions/` directory

**DoD Commands:**
```bash
ls -la apps/
ls -la packages/
ls -la supabase/
```

**Output:** Directory structure created

---

### 2.2 — Create Root Package.json

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step02-2-root-package`

**Allowed Paths:**
- `package.json`
- `pnpm-workspace.yaml` (if using pnpm)

**Tasks:**
- [ ] Create root `package.json`:
```json
{
  "name": "reconnect",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > packages/database/src/types.ts"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

- [ ] Create `pnpm-workspace.yaml` (if using pnpm):
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**DoD Commands:**
```bash
cat package.json
pnpm install  # or npm install
```

**Output:** Root package.json created, dependencies installable

---

### 2.3 — Configure Turborepo

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step02-3-turbo-config`

**Allowed Paths:**
- `turbo.json`

**Tasks:**
- [ ] Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**DoD Commands:**
```bash
turbo --version
cat turbo.json
```

**Output:** Turbo pipeline configured

---

### 2.4 — Initialize Main App (apps/web)

**Owner:** Frontend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step02-4-init-web-app`

**Allowed Paths:**
- `apps/web/**`

**Tasks:**
```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] Initialize Next.js app with:
  - TypeScript
  - Tailwind CSS
  - ESLint
  - App Router
  - src directory
  - Import alias `@/*`

- [ ] Install core dependencies:
```bash
# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# State & Forms
pnpm add zustand zod react-hook-form @hookform/resolvers

# UI (Radix primitives for shadcn)
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast \
  @radix-ui/react-tooltip @radix-ui/react-accordion @radix-ui/react-avatar \
  @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-popover \
  @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch

# Utilities
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add date-fns nanoid

# AI
pnpm add @anthropic-ai/sdk openai

# Email
pnpm add resend
```

- [ ] Update `apps/web/package.json` with workspace name:
```json
{
  "name": "@reconnect/web",
  ...
}
```

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Should start on localhost:3000
```

**Output:** Web app initialized and running

---

### 2.5 — Initialize Landing Page (apps/landing)

**Owner:** Frontend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step02-5-init-landing`

**Allowed Paths:**
- `apps/landing/**`

**Tasks:**
```bash
cd apps/landing
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] Initialize Next.js app (same options as web)
- [ ] Install minimal dependencies:
```bash
pnpm add clsx tailwind-merge lucide-react
```

- [ ] Configure for static export in `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

- [ ] Update `apps/landing/package.json`:
```json
{
  "name": "@reconnect/landing",
  ...
}
```

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
# Should start on localhost:3001
```

**Output:** Landing app initialized and running

---

### 2.6 — Initialize Shared Packages

**Owner:** Architect
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step02-6-shared-packages`

**Allowed Paths:**
- `packages/ui/**`
- `packages/database/**`
- `packages/ai/**`
- `packages/config/**`

**Tasks:**

**packages/ui:**
```json
// packages/ui/package.json
{
  "name": "@reconnect/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```
```typescript
// packages/ui/src/index.ts
export * from './components';
```

**packages/database:**
```json
// packages/database/package.json
{
  "name": "@reconnect/database",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  }
}
```
```typescript
// packages/database/src/index.ts
export * from './types';
export * from './queries';
```

**packages/ai:**
```json
// packages/ai/package.json
{
  "name": "@reconnect/ai",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "zod": "^3.22.0"
  }
}
```

**packages/config:**
```json
// packages/config/package.json
{
  "name": "@reconnect/config",
  "version": "0.0.0",
  "private": true
}
```

- [ ] Create `packages/ui/package.json` and `src/index.ts`
- [ ] Create `packages/database/package.json` and `src/index.ts`
- [ ] Create `packages/ai/package.json` and `src/index.ts`
- [ ] Create `packages/config/package.json`
- [ ] Create `tsconfig.json` for each package

**DoD Commands:**
```bash
pnpm install
turbo run typecheck
```

**Output:** All packages initialized with proper exports

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 2.1 Directory Structure | DevOps | PENDING | step02-1-directory-structure |
| 2.2 Root Package.json | DevOps | PENDING | step02-2-root-package |
| 2.3 Turborepo Config | DevOps | PENDING | step02-3-turbo-config |
| 2.4 Init Web App | Frontend | PENDING | step02-4-init-web-app |
| 2.5 Init Landing | Frontend | PENDING | step02-5-init-landing |
| 2.6 Shared Packages | Architect | PENDING | step02-6-shared-packages |

---

## Dependencies

- **Blocks:** Step 3 (Supabase Core), Step 4 (Landing Page), Step 5 (Web App Shell)
- **Blocked By:** Step 1 (Pre-Development Setup)

---

## Notes

- 2.1, 2.2, 2.3 should be done sequentially
- 2.4 and 2.5 can run in parallel after 2.3
- 2.6 can start after 2.3 and run parallel with 2.4/2.5
- Final verification requires all steps complete
