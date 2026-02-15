# Deep Research Prompt — Rec+onnect Landing Page Content

Use this prompt with an AI deep research tool (Claude, ChatGPT Deep Research, Perplexity, etc.) to generate comprehensive content and positioning for the Rec+onnect landing page.

---

## The Prompt

Copy everything below the line and paste into a deep research session:

---

I'm building **Rec+onnect** — an AI-powered Strategic Recruitment Operations Platform targeting **Irish SMEs** (50-500 employees). I need you to do deep research and then create comprehensive landing page content. Here's the context:

### What Rec+onnect Is

A SaaS platform that helps hiring managers and HR teams run structured, fair, and legally compliant recruitment processes. It replaces the chaos of spreadsheets, email threads, and gut-feel hiring with AI-powered "Playbooks" — step-by-step recruitment workflows that guide every hire from job description to final decision.

**Core features:**
- **AI Playbook Generation** — Input a role, and AI generates a complete recruitment playbook: job description, candidate profile, interview stages, focus areas, and suggested questions
- **Structured Interview Process** — Each interview stage has defined focus areas (2-3 per stage) with specific questions (3-5 per area), ensuring consistency across candidates
- **Blind Feedback Collection** — Interviewers submit structured ratings (1-4 scale) and notes independently, preventing groupthink and bias
- **AI Synthesis** — After feedback is collected, AI synthesizes all interviewer input into a clear candidate summary highlighting strengths, concerns, and patterns — but explicitly does NOT make hire/no-hire recommendations (human decides)
- **EU AI Act Compliant** — Text-only analysis, no emotion detection, no voice/biometric inference, mandatory human review disclaimers. Built for European regulatory reality.
- **Multi-tenant** — Each organization has isolated data, role-based access (admin, manager, interviewer)

**What it is NOT:**
- Not an ATS (Applicant Tracking System) — no job board posting, no resume parsing, no candidate sourcing
- Not a replacement for human judgment — AI assists and organizes, humans decide
- Not for enterprise (yet) — focused on SMEs who can't afford Greenhouse/Lever but need better than spreadsheets

### Target Market — Research These

1. **Irish SME recruitment landscape:**
   - How many SMEs in Ireland (50-500 employees)?
   - What do they currently use for recruitment? (likely: spreadsheets, email, maybe BambooHR/Recruitee)
   - Average cost-per-hire in Ireland?
   - Common pain points in Irish SME hiring?
   - Any Ireland-specific employment law considerations (Employment Equality Act, GDPR, WRC)?

2. **Competitor landscape (Ireland + UK + EU):**
   - Direct competitors: Structured hiring tools (BrightHire, Metaview, Pillar, Guide)
   - Adjacent competitors: ATS platforms with interview features (Greenhouse, Lever, Teamtailor, Recruitee)
   - Irish-specific: Any local recruitment tech players?
   - What do competitors charge? What's the price positioning opportunity?
   - What do competitors do poorly that we can exploit?

3. **AI in recruitment — current state:**
   - What AI recruitment tools exist and what do they do?
   - What's the public sentiment about AI in hiring? (concern vs. excitement)
   - EU AI Act implications for recruitment AI — what's banned, what's allowed?
   - How do we position "AI that assists but doesn't decide" as a feature, not a limitation?

### Landing Page Content I Need

Based on your research, create content for these landing page sections:

#### 1. Hero Section
- **Headline** (max 8 words) — punchy, benefit-focused, not generic
- **Subheadline** (1-2 sentences) — explain what the product does
- **CTA button text** — for early access / waitlist
- Give me 3-5 options for each, ranked by impact

#### 2. Problem Statement Section
- 3-4 pain points that Irish SME hiring managers feel viscerally
- Use specific, relatable language (not corporate jargon)
- Include a stat or data point for each if available
- Frame these as "The way you're hiring is broken" without being condescending

#### 3. Solution Section (How It Works)
- 3-4 step process showing the Rec+onnect workflow
- Each step needs: icon suggestion, title (3-5 words), description (1-2 sentences)
- The flow should be: Create Playbook → Run Interviews → Collect Feedback → AI Synthesis → Decide

#### 4. Key Features Grid
- 6 feature cards, each with: icon suggestion, title, description (2-3 sentences)
- Features to cover: AI Playbook Generation, Structured Interviews, Blind Feedback, AI Synthesis, EU Compliance, Team Collaboration
- For each feature, lead with the BENEFIT not the feature name

#### 5. Trust / Compliance Section
- EU AI Act compliance messaging
- GDPR compliance messaging
- "AI assists, humans decide" positioning
- Data sovereignty (EU-hosted infrastructure)
- Make compliance feel like a competitive advantage, not a checkbox

#### 6. Social Proof Section (placeholder strategy)
- Since we're pre-launch: what kind of social proof should we aim for?
- Suggested testimonial formats
- Stats we should track for "X% improvement in..." claims
- Beta program positioning

#### 7. Pricing Section
- Research competitor pricing
- Suggest 2-3 tier structure with names, prices, and feature lists
- Irish market price sensitivity — what would SMEs actually pay?
- Freemium vs. free trial vs. demo-only — what works best for this market?

#### 8. FAQ Section
- 8-10 questions that prospects would actually ask
- Include: "Will AI make the hiring decision?", "Is this GDPR compliant?", "How is this different from an ATS?"
- Answers should be concise (2-3 sentences each)

#### 9. Final CTA Section
- Urgency/scarcity angle for early access
- Email capture form copy
- What the user gets for signing up (early access, beta pricing, input on features)

#### 10. SEO & Meta
- Page title (60 chars max)
- Meta description (155 chars max)
- 10-15 target keywords for Irish recruitment tech market
- Open Graph text for social sharing

### Tone & Voice Guidelines

- **Professional but approachable** — not stuffy corporate, not Silicon Valley bro
- **Irish market aware** — reference Irish employment context where relevant (WRC, Employment Equality Act)
- **Confident but not arrogant** — we're solving a real problem, not claiming to revolutionize everything
- **AI-positive but realistic** — AI is a tool that makes humans better at their job, not a replacement
- Avoid: "revolutionary", "game-changing", "leverage", "synergy", "disrupting"
- Prefer: clear, specific, benefit-driven language

### Output Format

Structure your response with clear headers matching the sections above. For each section, provide:
1. The actual copy (ready to use)
2. Brief rationale for the approach
3. Any data/research that supports the messaging

---

## How to Use This Output

The AI research output goes to the development team who will implement `apps/landing` (Step 4 in the build plan). The landing page is a **static Next.js site** exported as HTML — no server-side rendering, no database, just content + an email capture form (connected to Resend).

The landing page sections map to React components that will be built in `apps/landing/src/components/`.
