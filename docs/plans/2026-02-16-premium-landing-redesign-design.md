# Premium Landing Page Redesign — Design Document

**Date:** 2026-02-16
**Goal:** Transform the landing page from "AI template" to "€50k agency build"
**Approach:** Stripe's warmth + Linear's depth + Vercel's spacing confidence

---

## Design Philosophy

Three rules that guide every decision:

1. **Restraint with gold** — Gold appears in exactly 5 places per viewport: CTA button, one gradient headline word, hover states, accent badge, focus rings. Everything else is navy/white/cream. Restraint IS premium.
2. **Asymmetry everywhere** — No 50/50 splits. No 3-equal-cards. Every grid uses 7/5 or 8/4 ratios. Every section breaks its own pattern.
3. **Surface hierarchy, not flat color** — Dark sections use 3-level surfaces (navy-950 → navy-900 → navy-800). Light sections use cream-50 → white → cream-100. Cards float above their surface through layered shadows, not borders.

---

## Asset Stack (All Free)

| Category | Primary | Package/Source |
|----------|---------|----------------|
| Icons | Phosphor Icons (duotone) | `@phosphor-icons/react` — navy stroke, gold fill |
| Illustrations | Storyset "Bro" style | storyset.com — gold primary, navy secondary, SVG download |
| Decorative SVGs | fffuel generators | nnnoise, ooorganize (dot grid), sssurf (waves) |
| Photography | Existing Unsplash + new pulls | amy-hirschi, brooke-cagle, linkedin-sales-solutions |
| Grain texture | CSS feTurbulence inline | Zero file size, mix-blend-mode: overlay |
| Animation | CSS scroll-driven + custom keyframes | No external library for MVP |

---

## Global CSS Overhaul

### Typography
```
Hero headline:    clamp(3.5rem, 7vw, 5.5rem), weight 800, line-height 1.02, letter-spacing -0.04em
Section headings: clamp(2rem, 4vw, 3.5rem), weight 700, line-height 1.1, letter-spacing -0.025em
Card titles:      clamp(1.25rem, 2vw, 1.5rem), weight 700, line-height 1.2, letter-spacing -0.015em
Body:             1rem (16px), weight 400, line-height 1.65, letter-spacing -0.005em
Overlines:        0.75rem (12px), weight 600, letter-spacing 0.15em, uppercase
```

All headings: `text-wrap: balance`
All paragraphs: `text-wrap: pretty`

### Section Padding Rhythm (Breathing Pattern)
```
Hero:     pt-36 pb-28  (massive room for presence)
Problem:  py-28        (tighter = more urgent)
Solution: py-36        (opens up for feature showcase)
Trust:    py-20        (compact authority strip)
FAQ:      py-28        (comfortable reading)
CTA:      py-32        (focused closer)
Contact:  py-28        (warm but not sprawling)
Footer:   py-20        (dignified close)
```

### Card System (3 tiers)
```css
/* Tier 1: Dark surface card (Solution section) */
.card-dark {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.2),
    0 24px 48px rgba(0, 0, 0, 0.1);
}

/* Tier 2: Light surface card (Problem, FAQ) */
.card-light {
  background: white;
  border: 1px solid rgba(10, 22, 40, 0.06);
  border-radius: 20px;
  box-shadow:
    0 1px 2px rgba(10, 22, 40, 0.04),
    0 4px 12px rgba(10, 22, 40, 0.03),
    0 16px 40px rgba(10, 22, 40, 0.02);
}

/* Tier 3: Featured card (highlighted items) */
.card-featured {
  /* Gradient border via mask-composite */
  position: relative;
}
.card-featured::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 20px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, rgba(232,168,73,0.4), transparent 60%) border-box;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}
```

### Noise Texture (Improved)
```css
.bg-noise::after {
  mix-blend-mode: overlay;  /* KEY CHANGE from current */
  opacity: 0.025;
  background-size: 200px 200px;  /* Finer grain */
}
```

### 3-Layer Dark Section Formula
Every dark section stacks these 3 layers:
1. Mesh gradient (radial-gradient blobs for color depth)
2. Dot grid pattern with center fade mask
3. Noise overlay with mix-blend-mode: overlay

### Interactive Components
- **SpotlightCard**: Cursor-following gold radial glow on dark cards
- **TiltCard**: Subtle 3D perspective tilt (±5deg) on feature cards
- **MagneticButton**: Primary CTAs follow cursor slightly on hover
- **AnimatedCounter**: Stat numbers count up on scroll with tabular-nums

### Button Refinements
- `:active` state: `scale(0.97)` with 50ms transition
- Gold CTA: add subtle `box-shadow: 0 0 20px rgba(232,168,73,0.15)` always-on glow
- Ghost/outline buttons: animated underline grow on hover

### Nav Links
- Underline-grow-from-left on hover via `::after` pseudo-element with `scaleX` transform

---

## Section-by-Section Spec

### 1. HERO — "Cinematic Authority"

**Layout:** Full-bleed dark, 90vh. Text left-aligned at ~40% width.

**Photo treatment (AGGRESSIVE):**
- Use `brooke-cagle` photo (warm, authentic, diverse group — NOT the sterile formal interview)
- Photo occupies RIGHT 65% of section, visible through layered treatment:
  - `brightness(0.35) saturate(0.5)` base treatment
  - Navy gradient from left: solid navy → 40% → transparent
  - Bottom fade to navy-950
  - REDUCE overlay darkness vs current (let more photo through on right side)
- Add animated radial gradient spotlight behind headline area: `radial-gradient(500px at 25% 50%, rgba(232,168,73,0.06), transparent)`

**Text:**
- Overline: Remove the "AI-Powered" badge entirely — it screams template
- Headline: `Hire with` **`clarity`** `.` — "clarity" gets animated gold shimmer gradient
- Push to 5.5rem / weight 800 / -0.04em tracking / line-height 1.02
- Subtext: Muted at `white/40` (not white/50 — slightly more contrast)
- CTA: Gold pill button (already pill from rounded-full, good). Add magnetic hover effect.
- Second CTA: Simple text link with arrow, NOT an outline button (outline buttons = template)

**Background layers:**
1. Photo (right 65%)
2. Animated gradient shift (slow 20s cycle, subtle navy hue shifts)
3. Noise overlay

**Trust line:**
- Instead of plain text, show 3 tiny shield/badge icons inline (Phosphor duotone): GDPR shield, EU flag, AI Act icon
- Text in `white/25` between them

---

### 2. PROBLEM — "Visceral Pain Points"

**Layout:** Cream background with subtle warm noise. ASYMMETRIC grid.

**Structure:**
- Section header: LEFT-ALIGNED (not centered — breaks template pattern), max-width 560px
- Overline "Sound Familiar?" stays
- Grid: First card spans full width as a **feature card** with background photo.
  Then 2 cards below in **7fr / 5fr** split.

**Card 1 (Full-Width Hero Card — "The spreadsheet spiral"):**
- Background: the `dylan-gillis` meeting photo, navy-tinted to ~15% opacity
- Overlaid with cream gradient from left
- Stat "44 days" at 4rem+ gold gradient text, positioned prominently
- Source citation in small muted text
- This card is TWICE the height of the others — creates dramatic size contrast

**Cards 2 & 3:**
- Clean white with 3-layer shadow (card-light system)
- Gold left accent stripe (3px, rounded, NOT red — red = off-brand)
- Phosphor duotone icons (32px) instead of Lucide
- Stats: gold gradient text, animated counter on scroll
- Description in muted text below

**Bottom banner:**
- Remove the current flat banner. Instead: a single elegant line of text centered below the cards with a thin gold horizontal rule above it.

---

### 3. SOLUTION — "Spotlight Bento Grid"

**Layout:** Full dark section (navy-950) with 3-layer background.

**Background:**
1. Radial gradient mesh: gold glow (0.04 opacity) top-right + blue glow (0.2) bottom-left
2. Dot grid: gold dots at 0.08 opacity, 32px spacing, center-fade mask
3. Noise: overlay blend, 0.025 opacity

**Section header:** Center-aligned (this section earns it — it's the showpiece)

**Bento grid (12-column, ASYMMETRIC):**
```
Row 1: [  8-col card with illustration  ] [ 4-col stat card ]
Row 2: [ 4-col differentiator ] [   8-col card with illustration    ]
Row 3: [  6-col card  ] [  6-col card  ]
```

**Each capability card (01-04):**
- SpotlightCard component: cursor-following gold radial glow
- Storyset "Bro" illustration (color-matched to gold/navy) taking up ~40% of card area
- Number badge, label, title, description below
- Inset top-highlight on border
- The larger 8-col cards get MORE illustration space, less text density

**Differentiator cards (Kill Groupthink, Same Bar):**
- Glass card with gold-tinted background
- Gradient border via mask-composite (gold shimmer on top edge)
- Phosphor duotone icons (larger, 40px)
- On hover: border brightens, slight TiltCard effect

**Connector elements:**
- Thin gold dashed line connecting cards vertically (from card 01 → 02 → 03 → 04) to imply progression
- Line rendered as absolute-positioned SVG behind the grid

---

### 4. TRUST — "Authority Band"

**Layout:** Narrow band section (py-20). NOT full-width cards — a horizontal strip.

**Background:** Navy-950 at 100% (full dark — this creates contrast between the light Problem section and light FAQ section). Top and bottom: 1px gold gradient divider lines.

**Structure:**
- Section header: Center, white text, smaller than other sections (this is a support section, not a feature)
- 4 badges in a horizontal row with gold connecting line between them
- Each badge:
  - Large Phosphor duotone icon (40px) — gold fill, white stroke
  - White title (font-display, 18px, bold)
  - Muted description (white/40, 14px)
  - Vertical gold dividers between badges (not card borders)
- Made in Ireland: standalone centered line below badges with flag emoji

---

### 5. FAQ — "Editorial Sidebar"

**Layout:** Two-column, ASYMMETRIC (5fr content / 7fr accordion, or 4fr / 8fr).

**Left column (sticky):**
- Section overline + heading, LEFT-ALIGNED
- Below heading: a Storyset illustration (person with question mark, gold/navy) — ~200px wide
- This column is sticky (position: sticky, top: 120px) as user scrolls through FAQ items

**Right column (accordion):**
- FAQ items with refined styling:
  - Open state: gold 3px left border, cream-100 background, shadow-sm
  - Closed state: no border, cream-50/50 background
  - Question text: font-display 18px semibold
  - Answer: 16px body, max-width constrained for readability
  - ChevronDown: smoother rotation, gold color
  - Transition: 400ms cubic-bezier(0.16, 1, 0.3, 1)

---

### 6. CTA — "The Closer"

**Layout:** Full dark section, center-aligned. Generous py-32.

**Background (AGGRESSIVE):**
1. Animated mesh gradient: 4 radial-gradient blobs that slowly drift (20s cycle)
   - Gold blob (0.06 opacity) drifts upper-right
   - Navy-700 blob (0.3) drifts lower-left
   - Navy-600 blob (0.2) drifts center
   - Subtle gold blob (0.03) drifts upper-left
2. Dot grid with center fade
3. Noise overlay

**Scarcity badge:**
- "Limited to 50 founding companies"
- Rotating conic gradient border (subtle gold sweep, 6s cycle)
- Pulse dot animation

**Text:**
- "Join the founding 50" — gradient text effect (white → gold)
- Push to 3.5rem
- Subtext: `white/45`

**Perks list:**
- Horizontal layout (not vertical) — 2x2 grid of checkmarks
- Gold Phosphor Check icons instead of Lucide

**CTA button:**
- MagneticButton wrapper
- Gold pill, larger than other buttons
- Persistent subtle gold glow shadow
- `:active` scale(0.97)

---

### 7. CONTACT — "Warm Conversation"

**Layout:** Cream background. Two-column: 5fr info + 7fr form.

**Left column:**
- Section overline + heading
- Description text
- Email info with Phosphor duotone envelope icon
- **NEW:** Below the email, add one of the unused Unsplash photos (`linkedin-sales-solutions-VtKoSy_XzNU` — woman on video call) in a **rounded-2xl frame with gold ring border** (2px gold-500/30 border, 8px padding creating a "Polaroid" effect)
- Photo: ~280px wide, aspect-ratio constrained

**Right column — Form card:**
- card-light system (3-layer shadow)
- Inner padding 40px
- Input styling:
  - h-14 (taller inputs = more premium)
  - rounded-xl (16px)
  - Border: `cream-200` → focus: `gold-500` with smooth 300ms transition
  - Focus: bg transitions from cream-50 to white
  - Label: font-display, weight 500
- Submit button: full-width gold pill
- After submission: confetti-style gold particle burst (CSS animation, no library)

---

### 8. HEADER — "Floating Glass"

**Scrolled state improvements:**
- `backdrop-filter: blur(20px) saturate(180%)`
- Border: `rgba(10, 22, 40, 0.06)` (warmer than cream-200)
- Shadow: `0 1px 3px rgba(10,22,40,0.04), 0 4px 12px rgba(10,22,40,0.02)` (layered)
- Nav links: underline-grow-from-left on hover

**Logo:**
- On scroll, the `+` gets a subtle gold glow (`text-shadow: 0 0 8px rgba(232,168,73,0.4)`)

---

### 9. FOOTER — "Dignified Close"

- Top: 1px gradient divider (transparent → gold-500/30 → transparent)
- Brand description: slightly warmer (`white/50` → `white/55`)
- Link hover: gold-500 color with underline-grow effect
- Bottom bar: Irish flag emoji bigger, centered pride placement
- Add a subtle dot grid pattern at very low opacity on the background

---

## Priority Order for Implementation

### Phase 1: Global CSS (Biggest Impact, Lowest Effort)
1. Letter-spacing tightening across all headings
2. Line-height hierarchy
3. Section padding rhythm (variable, not uniform)
4. Noise texture: mix-blend-mode change
5. Card system (3-tier shadows)
6. Button :active states
7. text-wrap: balance/pretty
8. Nav link underline-grow

### Phase 2: Interactive Components
1. SpotlightCard component
2. AnimatedCounter component (improve existing)
3. MagneticButton wrapper
4. Improved scroll animation (80ms stagger, better easing)

### Phase 3: Section Rebuilds (biggest visual impact)
1. Hero — photo treatment, remove badge, spotlight glow
2. Problem — asymmetric grid, photo card, gold accents
3. Solution — bento with illustrations, dot grid, spotlight cards
4. Trust — dark band with gold dividers
5. CTA — animated mesh, conic badge, magnetic button
6. FAQ — editorial 2-column with sticky sidebar
7. Contact — photo frame, refined form
8. Header/Footer — glass effect, gradient dividers

### Phase 4: Assets
1. Install Phosphor Icons, replace all Lucide usage
2. Download Storyset illustrations (4-6 for Solution, 1 for FAQ, 1 for Problem)
3. Generate fffuel dot grid SVG and wave dividers
4. Optimize all images (Next.js Image component already handles this)

---

## What NOT to Do

- No Framer Motion / GSAP — CSS is enough for a landing page, keep bundle tiny
- No Lottie animations — overkill, adds weight
- No custom cursor — gimmicky for a B2B recruitment product
- No parallax scrolling — dated technique
- No video backgrounds — slow, distracting
- No 3D transforms beyond subtle tilt — we're premium, not a gaming site
