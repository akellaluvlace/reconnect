"use client";

import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import {
  ShieldCheck,
  LockSimple,
  UserCircle,
  HardDrives,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

interface Badge {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

const badges: Badge[] = [
  {
    icon: ShieldCheck,
    title: "EU AI Act Ready",
    description:
      "High-risk compliant. Built for Article 14 human oversight from day one.",
  },
  {
    icon: LockSimple,
    title: "GDPR Compliant",
    description:
      "Full data subject rights. No sole automated decision-making under Article 22.",
  },
  {
    icon: UserCircle,
    title: "Human Oversight",
    description:
      "AI assists, humans decide. Always. No hire/no-hire recommendations, ever.",
  },
  {
    icon: HardDrives,
    title: "EU Data Residency",
    description:
      "Your data never leaves the EEA. Multi-tenant isolation at infrastructure level.",
  },
];

export function TrustSection() {
  return (
    <section className="relative py-20 bg-cream-100 overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />

      <Container size="wide" className="relative z-10">
        {/* Header — matches problem/solution style */}
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold font-display tracking-[0.15em] uppercase text-teal-600">
              Built for European Rules
            </span>
            <h2 className="mt-3 font-display text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-teal-950 tracking-[-0.025em] leading-[1.1]">
              Your competitors will be scrambling
              by August 2026. You won&apos;t.
            </h2>
          </div>
        </AnimateOnScroll>

        {/* Badge strip with teal dividers */}
        <div className="grid grid-cols-4 gap-0">
          {badges.map((badge, i) => {
            const Icon = badge.icon;
            const isLast = i === badges.length - 1;
            return (
              <AnimateOnScroll
                key={badge.title}
                delay={(i + 1) as 1 | 2 | 3 | 4}
              >
                <div
                  className={`text-center px-6 py-4 ${
                    !isLast ? "border-r border-teal-600/10" : ""
                  }`}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-teal-600">
                    <Icon size={40} weight="duotone" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-teal-950 tracking-[-0.01em]">
                    {badge.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>

        {/* Ireland tagline */}
        <AnimateOnScroll>
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-400">
              Made in Ireland{" "}
              <span className="inline-block text-lg" aria-label="Irish flag">
                &#127470;&#127466;
              </span>
              {" "}&middot; Designed for the European talent market
            </p>
          </div>
        </AnimateOnScroll>
      </Container>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
    </section>
  );
}
