"use client";

import Image from "next/image";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";

const perks = [
  "Free access throughout the beta programme",
  "40% off for life when we launch",
  "Direct input on features and roadmap",
  "Priority onboarding and support",
];

export function CtaSection() {
  return (
    <section
      id="book-demo"
      className="relative py-16 lg:py-20 bg-teal-950 overflow-hidden"
    >
      {/* Layer 1: Animated mesh gradient */}
      <div className="absolute inset-0 hero-gradient-animated" />

      {/* Layer 2: Dot grid */}
      <div className="bg-dot-grid" />

      {/* Layer 3: Noise */}
      <div className="bg-noise absolute inset-0 pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="glow-orb-teal w-[600px] h-[400px] top-1/4 left-1/3" />
        <div className="glow-orb-blue w-[400px] h-[350px] bottom-[10%] right-[15%]" />
      </div>

      <Container size="wide" className="relative z-10">
        <div className="grid grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Left — Illustration watermark */}
          <div className="col-span-12 lg:col-span-5 flex items-center justify-center">
            <AnimateOnScroll>
              <div className="w-[360px] h-[360px] lg:w-[400px] lg:h-[400px]">
                <Image
                  src="/illus/Development-Beta-Testing--Streamline-Bruxelles.svg"
                  alt="Productive team collaboration"
                  width={540}
                  height={540}
                  className="w-full h-full object-contain opacity-[0.12]"
                />
              </div>
            </AnimateOnScroll>
          </div>

          {/* Right — CTA content */}
          <div className="col-span-12 lg:col-span-7 lg:col-start-7">
            <AnimateOnScroll delay={1}>
              <div>
                {/* Scarcity badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/20 bg-teal-900/40 mb-8">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-sm font-medium text-teal-300">
                    Limited to 50 founding companies
                  </span>
                </div>

                <h2 className="font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-bold text-white tracking-[-0.03em] leading-[1.08]">
                  Join the founding 50
                </h2>
                <p className="mt-5 text-[15px] text-white/50 leading-[1.7] max-w-lg">
                  Shape the product. Lock in 40% off. Permanently.
                </p>

                {/* Perks */}
                <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 max-w-lg">
                  {perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={20}
                        weight="duotone"
                        className="text-teal-400 flex-shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-white/55 leading-snug">
                        {perk}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex items-center gap-6">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 h-13 px-9 rounded-full bg-white text-teal-950 font-display font-semibold text-lg tracking-tight hover:bg-cream-100 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_28px_rgba(255,255,255,0.18)] active:scale-[0.97]"
                  >
                    Claim Your Spot
                    <ArrowRight size={20} weight="bold" />
                  </a>
                  <p className="text-xs text-white/30">
                    No credit card &middot; No commitment
                    <br />
                    Beta launches Q2 2026
                  </p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </Container>
    </section>
  );
}
