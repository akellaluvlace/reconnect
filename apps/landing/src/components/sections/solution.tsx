"use client";

import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

interface Feature {
  number: string;
  label: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    number: "01",
    label: "Discovery",
    title: "AI Market Insights",
    description:
      "Real-time salary benchmarks, competition analysis, and candidate availability for the Irish market. Know what you're competing against before you write the job spec.",
  },
  {
    number: "02",
    label: "Process",
    title: "Smart Interview Planning",
    description:
      "AI-generated stages with discipline-specific focus areas and role-relevant questions. Every interviewer knows what to ask and what to evaluate.",
  },
  {
    number: "03",
    label: "Alignment",
    title: "Team Coordination",
    description:
      "Invite collaborators, assign stages, keep everyone aligned. One link, zero email threads.",
  },
  {
    number: "04",
    label: "Debrief",
    title: "AI-Powered Synthesis",
    description:
      "Automatic transcription. Cross-team feedback comparison. See where you agree — and where you don't.",
  },
];

function FeatureCell({ feature }: { feature: Feature }) {
  return (
    <div className="relative">
      <span className="font-display text-[6rem] lg:text-[7.5rem] font-[800] leading-none select-none text-teal-950/[0.04] absolute -top-10 -left-1 pointer-events-none">
        {feature.number}
      </span>
      <div className="relative pt-6">
        <span className="text-[11px] font-semibold font-display tracking-[0.2em] uppercase text-teal-500 mb-3 block">
          {feature.label}
        </span>
        <h3 className="font-display text-[clamp(1.5rem,2.5vw,2rem)] font-bold text-teal-950 tracking-[-0.02em] leading-[1.15]">
          {feature.title}
        </h3>
        <p className="mt-4 text-[15px] text-slate-500 leading-[1.75] max-w-[420px]">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

export function SolutionSection() {
  return (
    <section
      id="solution"
      className="relative py-32 lg:py-44 bg-cream-50 overflow-hidden"
    >
      {/* Geometric: concentric circles — top right */}
      <div className="absolute -top-16 -right-16 w-[300px] h-[300px] rounded-full border border-teal-600/[0.08] pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-[300px] h-[300px] rounded-full border border-teal-600/[0.04] pointer-events-none scale-[1.25]" />

      {/* Geometric: small circle — bottom left */}
      <div className="absolute bottom-[15%] left-[4%] w-[140px] h-[140px] rounded-full border border-teal-500/[0.07] pointer-events-none" />

      {/* Geometric: diagonal lines — top left */}
      <div className="absolute top-[12%] left-[8%] w-[160px] h-px bg-gradient-to-r from-transparent via-teal-600/15 to-transparent rotate-[-30deg] pointer-events-none" />
      <div className="absolute top-[15%] left-[10%] w-[110px] h-px bg-gradient-to-r from-transparent via-teal-600/10 to-transparent rotate-[-30deg] pointer-events-none" />

      {/* Geometric: diagonal line — bottom right */}
      <div className="absolute bottom-[20%] right-[7%] w-[130px] h-px bg-gradient-to-r from-transparent via-teal-500/12 to-transparent rotate-[25deg] pointer-events-none" />

      {/* Geometric: scattered dots */}
      <div className="absolute top-[25%] right-[12%] w-2 h-2 rounded-full bg-teal-500/12 pointer-events-none" />
      <div className="absolute bottom-[30%] left-[15%] w-1.5 h-1.5 rounded-full bg-teal-500/10 pointer-events-none" />
      <div className="absolute top-[60%] right-[5%] w-2 h-2 rounded-full bg-teal-500/10 pointer-events-none" />

      <Container size="wide" className="relative z-10">
        {/* ── Section header ── */}
        <div className="grid grid-cols-12 gap-8 lg:gap-16 mb-20 lg:mb-28 items-end">
          <div className="col-span-12 lg:col-span-5">
            <AnimateOnScroll>
              <span className="block text-[11px] font-semibold font-display tracking-[0.15em] uppercase text-teal-600 mb-3">
                02 — The Platform
              </span>
              <h2 className="font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-bold text-teal-950 tracking-[-0.03em] leading-[1.08]">
                Four steps. Zero guesswork.
              </h2>
            </AnimateOnScroll>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <AnimateOnScroll delay={1}>
              <p className="text-[15px] text-slate-500 leading-[1.7] max-w-xl">
                From job spec to hiring decision — one playbook, a structured
                process that makes every interview count.
              </p>
            </AnimateOnScroll>
          </div>
        </div>

        {/* ── Row 1: Steps 01 + 02 ── */}
        <div className="border-t border-teal-900/[0.07]">
          <AnimateOnScroll>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 py-14 lg:py-20">
              <FeatureCell feature={features[0]} />
              <FeatureCell feature={features[1]} />
            </div>
          </AnimateOnScroll>
        </div>

        {/* ── Row 2: Steps 03 + 04 ── */}
        <div className="border-t border-teal-900/[0.07]">
          <AnimateOnScroll>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 py-14 lg:py-20 border-b border-teal-900/[0.07]">
              <FeatureCell feature={features[2]} />
              <FeatureCell feature={features[3]} />
            </div>
          </AnimateOnScroll>
        </div>
      </Container>
    </section>
  );
}
