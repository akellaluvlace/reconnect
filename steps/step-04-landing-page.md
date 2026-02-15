# Step 4 — Landing Page (Marketing Site)

**Status:** NOT STARTED
**Week:** 1 (Day 3-5)
**Default Owners:** UI Builder + Frontend + DevOps

---

## Goal

Ship a production-grade landing page with SEO + GA4 tracking.

---

## Deliverables

- Landing sections (Solution, How it Works, Book a Demo, Sign In)
- SEO: meta tags, OG/Twitter, JSON-LD, sitemap, robots, canonical
- GA4: basic events (CTA clicks, scroll depth) + conversion goals
- Performance targets (Lighthouse 90+)
- Design inspiration: ta.guru (style/layout)

---

## Definition of Done (Step Level)

- [ ] Landing deployed on staging
- [ ] Lighthouse Performance score 90+
- [ ] Lighthouse Accessibility score 90+
- [ ] GA4 events visible in dashboard
- [ ] All micro steps complete

---

## Micro Steps

### 4.1 — Create Landing Page Structure

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step04-1-landing-structure`

**Allowed Paths:**
- `apps/landing/src/app/**`
- `apps/landing/src/components/**`

**Tasks:**
- [ ] Create component structure:
```
apps/landing/src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   ├── sitemap.ts            # XML sitemap generator
│   └── robots.ts             # robots.txt generator
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── footer.tsx
│   ├── sections/
│   │   ├── hero-section.tsx
│   │   ├── solution-section.tsx
│   │   ├── how-it-works.tsx
│   │   ├── book-demo-section.tsx
│   │   └── contact-section.tsx
│   └── ui/
│       ├── button.tsx
│       └── container.tsx
└── lib/
    └── analytics.ts
```

- [ ] Create root layout with fonts and global styles
- [ ] Create Header component with navigation (Solution – How it works – Book a demo – Sign in)
- [ ] Create Footer component with links + email link
- [ ] Create Container component for consistent max-width

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
# Verify structure renders
```

**Output:** Landing page structure created

---

### 4.2 — Build Hero Section

**Owner:** UI Builder
**Supporting:** None
**Status:** PENDING
**Branch:** `step04-2-hero-section`

**Allowed Paths:**
- `apps/landing/src/components/sections/hero-section.tsx`

**Tasks:**
- [ ] Create Hero section with:
  - Tagline: "Hire with clarity. Not chaos."
  - Supporting text: "We help you hire with confidence"
  - Primary CTA button: "Book a Demo"
  - Secondary CTA: "Learn More"
  - Hero image or product screenshot placeholder
  - Background styling (gradient or subtle pattern)
  - Design inspired by ta.guru style/layout

```tsx
export function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Hire with clarity. Not chaos.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            We help you hire with confidence. Create comprehensive hiring
            playbooks with AI-generated market insights, interview planning,
            and team coordination.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg">Book a Demo</Button>
            <Button variant="outline" size="lg">Learn More</Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
```

**Design Checklist:**
- [ ] Clear visual hierarchy
- [ ] One obvious primary CTA ("Book a Demo")
- [ ] Tagline prominent and impactful
- [ ] Accessible button labels

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
# Visual verification in browser
```

**Output:** Hero section implemented

---

### 4.3 — Build Features Section (4 Chapters)

**Owner:** UI Builder
**Supporting:** None
**Status:** PENDING
**Branch:** `step04-3-features-section`

**Allowed Paths:**
- `apps/landing/src/components/sections/solution-section.tsx`

**Tasks:**
- [ ] Create Solution section showcasing 4 chapters:

| Chapter | Icon | Title | Description |
|---------|------|-------|-------------|
| Discovery | Search | AI Market Insights | Get salary data, competition analysis, and candidate availability |
| Process | ListChecks | Smart Interview Planning | AI-generated interview stages with suggested questions |
| Alignment | Users | Team Coordination | Invite collaborators, assign interviewers, share playbooks |
| Debrief | MessageSquare | AI-Powered Synthesis | Record interviews, get transcriptions, compare feedback |

```tsx
const features = [
  {
    icon: Search,
    title: 'Discovery',
    subtitle: 'AI Market Insights',
    description: 'Get real-time salary data, competition analysis, and candidate availability for the Irish market.',
  },
  {
    icon: ListChecks,
    title: 'Process',
    subtitle: 'Smart Interview Planning',
    description: 'AI-generated interview stages tailored to your role, with discipline-specific questions.',
  },
  {
    icon: Users,
    title: 'Alignment',
    subtitle: 'Team Coordination',
    description: 'Invite collaborators, assign interviewers to stages, and share playbooks with stakeholders.',
  },
  {
    icon: MessageSquare,
    title: 'Debrief',
    subtitle: 'AI-Powered Synthesis',
    description: 'Record interviews, get automatic transcriptions, and compare feedback across your team.',
  },
];
```

- [ ] Grid layout (2x2 on desktop, stack on mobile)
- [ ] Icon + title + description for each
- [ ] Consistent card styling

**Design Checklist:**
- [ ] Clear visual separation between features
- [ ] Icons are meaningful
- [ ] Responsive grid

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
```

**Output:** Solution section implemented

---

### 4.4 — Build Supporting Sections

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step04-4-supporting-sections`

**Allowed Paths:**
- `apps/landing/src/components/sections/*.tsx`

**Tasks:**
- [ ] **How It Works Section:**
  - Step 1: Create a playbook
  - Step 2: Get AI insights
  - Step 3: Build your process
  - Step 4: Collaborate and hire
  - Visual flow or numbered steps

- [ ] **Book a Demo / CTA Section:**
  - Compelling headline
  - Primary action button: "Book a Demo"
  - Trust indicators (if available)

- [ ] **Contact Section:**
  - Contact form (name, email, message)
  - Email link (direct contact option)
  - Both methods available as per client decision

- [ ] **Sign In link** in header navigation (links to app login)

**Design Checklist:**
- [ ] Consistent section spacing
- [ ] Clear visual flow
- [ ] Sections match client spec: Solution – How it works – Book a demo – Sign in

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
```

**Output:** All supporting sections implemented

---

### 4.5 — Implement SEO

**Owner:** Frontend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step04-5-seo`

**Allowed Paths:**
- `apps/landing/src/app/layout.tsx`
- `apps/landing/src/app/sitemap.ts`
- `apps/landing/src/app/robots.ts`

**Tasks:**
- [ ] Add metadata to layout:
```tsx
// apps/landing/src/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rec+onnect | Hire with clarity. Not chaos.',
  description: 'We help you hire with confidence. Create comprehensive hiring playbooks with AI-generated market insights, interview planning, and team coordination.',
  keywords: ['recruitment', 'hiring', 'AI', 'Ireland', 'HR tech', 'interview'],
  authors: [{ name: 'Rec+onnect' }],
  openGraph: {
    title: 'Rec+onnect | Hire with clarity. Not chaos.',
    description: 'We help you hire with confidence. Create comprehensive hiring playbooks with AI-generated market insights.',
    url: 'https://reconnect.io',
    siteName: 'Rec+onnect',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rec+onnect - Hire with clarity. Not chaos.',
      },
    ],
    locale: 'en_IE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rec+onnect | Hire with clarity. Not chaos.',
    description: 'We help you hire with confidence. Create comprehensive hiring playbooks with AI-generated market insights.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

- [ ] Create sitemap generator:
```tsx
// apps/landing/src/app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://reconnect.io',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
```

- [ ] Create robots.txt:
```tsx
// apps/landing/src/app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://reconnect.io/sitemap.xml',
  };
}
```

- [ ] Add JSON-LD structured data:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Rec+onnect',
      applicationCategory: 'BusinessApplication',
      description: 'AI-powered strategic recruitment platform',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
    }),
  }}
/>
```

**DoD Commands:**
```bash
cd apps/landing && pnpm build
# Check for SEO warnings
```

**Output:** SEO fully implemented

---

### 4.6 — Implement Analytics (GA4)

**Owner:** Frontend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step04-6-analytics`

**Allowed Paths:**
- `apps/landing/src/lib/analytics.ts`
- `apps/landing/src/app/layout.tsx`
- `apps/landing/src/components/**/*.tsx`

**Tasks:**
- [ ] Create analytics utility:
```tsx
// apps/landing/src/lib/analytics.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
```

- [ ] Add GA4 script to layout:
```tsx
// In layout.tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  `}
</Script>
```

- [ ] Add event tracking to CTAs:
```tsx
<Button
  onClick={() => event({
    action: 'click',
    category: 'CTA',
    label: 'hero_book_demo',
  })}
>
  Book a Demo
</Button>
```

- [ ] Configure GA4 dashboard:
  - Create conversion goals
  - Set up event tracking
  - Configure enhanced measurement

**DoD Commands:**
```bash
cd apps/landing && pnpm dev
# Verify events in GA4 debug view
```

**Output:** GA4 analytics implemented

---

### 4.7 — Performance Optimization

**Owner:** Frontend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step04-7-performance`

**Allowed Paths:**
- `apps/landing/**`

**Tasks:**
- [ ] Optimize images:
  - Use WebP format
  - Add proper dimensions
  - Implement lazy loading
  - Use Next.js Image component

- [ ] Optimize fonts:
  - Use next/font for automatic optimization
  - Subset fonts if possible
  - Preload critical fonts

- [ ] Verify Core Web Vitals:
  - First Contentful Paint (FCP): < 1.5s
  - Largest Contentful Paint (LCP): < 2.5s
  - Cumulative Layout Shift (CLS): < 0.1

- [ ] Run Lighthouse audit:
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

**DoD Commands:**
```bash
cd apps/landing && pnpm build
# Run Lighthouse in Chrome DevTools
# Or: npx lighthouse https://staging-url --view
```

**Output:** Performance targets met

---

### 4.8 — Deploy Landing to Staging

**Owner:** DevOps
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step04-8-deploy-staging`

**Allowed Paths:**
- `apps/landing/vercel.json`
- `.github/workflows/**`

**Tasks:**
- [ ] Configure Vercel project for landing:
```json
// apps/landing/vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "out",
  "framework": "nextjs"
}
```

- [ ] Set environment variables in Vercel:
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - `NEXT_PUBLIC_SITE_URL`

- [ ] Deploy to staging:
```bash
vercel --cwd apps/landing
```

- [ ] Verify deployment:
  - All pages load
  - SEO meta tags present
  - Analytics tracking
  - Performance acceptable

**DoD Commands:**
```bash
vercel --cwd apps/landing
# Get staging URL and verify
```

**Output:** Landing deployed to staging

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 4.1 Landing Structure | UI Builder | PENDING | step04-1-landing-structure |
| 4.2 Hero Section | UI Builder | PENDING | step04-2-hero-section |
| 4.3 Solution Section | UI Builder | PENDING | step04-3-features-section |
| 4.4 Supporting Sections | UI Builder | PENDING | step04-4-supporting-sections |
| 4.5 SEO | Frontend | PENDING | step04-5-seo |
| 4.6 Analytics | Frontend | PENDING | step04-6-analytics |
| 4.7 Performance | Frontend | PENDING | step04-7-performance |
| 4.8 Deploy Staging | DevOps | PENDING | step04-8-deploy-staging |

---

## Dependencies

- **Blocks:** Step 10 (Final Delivery)
- **Blocked By:** Step 2 (Monorepo Foundation)

---

## Notes

- 4.1-4.4 are sequential (build up the page)
- 4.5 and 4.6 can run parallel after 4.4
- 4.7 depends on 4.5, 4.6
- 4.8 depends on all previous steps
- Client must provide: logo, brand colors, domain for final deployment
- Design inspiration: ta.guru (style/layout)
- Key taglines: "Hire with clarity. Not chaos." / "We help you hire with confidence"
