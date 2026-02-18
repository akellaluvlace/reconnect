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
        <div className="glow-orb-teal w-[400px] h-[350px] bottom-[10%] right-[15%]" />
      </div>

      <Container size="wide" className="relative z-10">
        <div className="grid grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left — CTA content */}
          <div className="col-span-12 lg:col-span-6">
            <AnimateOnScroll>
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

          {/* Right — Blob + Image */}
          <div className="col-span-12 lg:col-span-6 flex items-center justify-center">
            <AnimateOnScroll>
              <div className="relative w-[400px] h-[400px] lg:w-[460px] lg:h-[460px]">
                {/* Moon — behind hand, teal-tinted, faded edges */}
                <div
                  className="absolute -inset-[25%] flex items-center justify-center opacity-[0.35] animate-[moon-drift_20s_ease-in-out_infinite]"
                  style={{
                    maskImage:
                      "radial-gradient(circle, #000 30%, transparent 68%)",
                    WebkitMaskImage:
                      "radial-gradient(circle, #000 30%, transparent 68%)",
                  }}
                >
                  <Image
                    src="/illustrations/mike-petrucci-uIf6H1or1nE-unsplash.png"
                    alt=""
                    width={560}
                    height={560}
                    className="w-full h-full object-contain"
                    style={{
                      filter: "brightness(0.5) saturate(0.2) sepia(0.5) hue-rotate(130deg)",
                    }}
                    aria-hidden="true"
                  />
                </div>

                {/* Image — with radial fade mask on bottom-right corner */}
                <div
                  className="absolute inset-[5%]"
                  style={{
                    maskImage:
                      "radial-gradient(ellipse 85% 85% at 38% 32%, #000 40%, transparent 72%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse 85% 85% at 38% 32%, #000 40%, transparent 72%)",
                  }}
                >
                  {/* Contour glow — duplicate image, blurred + teal-tinted, pulsing */}
                  <div
                    className="absolute inset-0 animate-[glow-pulse_5s_ease-in-out_infinite]"
                    style={{
                      filter: "blur(6px) brightness(1.3) sepia(1) hue-rotate(120deg) saturate(1.5)",
                    }}
                  >
                    <Image
                      src="/illustrations/diego-ph-fIq0tET6llw-unsplash.png"
                      alt=""
                      width={460}
                      height={460}
                      className="w-full h-full object-contain"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Actual image on top */}
                  <Image
                    src="/illustrations/diego-ph-fIq0tET6llw-unsplash.png"
                    alt="Innovation — hand holding lightbulb"
                    width={460}
                    height={460}
                    className="relative z-10 w-full h-full object-contain"
                  />
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </Container>
    </section>
  );
}
