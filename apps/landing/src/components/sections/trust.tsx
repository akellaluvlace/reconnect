import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ShieldCheck, Lock, User, Server } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface Badge {
  icon: LucideIcon;
  title: string;
  description: string;
}

const badges: Badge[] = [
  {
    icon: ShieldCheck,
    title: "EU AI Act Ready",
    description: "High-risk compliant. Built for Article 14 human oversight from day one.",
  },
  {
    icon: Lock,
    title: "GDPR Compliant",
    description: "Full data subject rights. No sole automated decision-making under Article 22.",
  },
  {
    icon: User,
    title: "Human Oversight",
    description: "AI assists, humans decide. Always. No hire/no-hire recommendations, ever.",
  },
  {
    icon: Server,
    title: "EU Data Residency",
    description: "Your data never leaves the EEA. Multi-tenant isolation at infrastructure level.",
  },
];

export function TrustSection() {
  return (
    <section className="py-20 lg:py-24 bg-navy-950 overflow-hidden relative">
      {/* Texture */}
      <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />

      <Container size="wide" className="relative z-10">
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-500">
              Built for European Rules
            </span>
            <h2 className="mt-4 font-display text-2xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              Designed for human judgment
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {badges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <AnimateOnScroll
                key={badge.title}
                delay={(i + 1) as 1 | 2 | 3 | 4}
              >
                <div className="group text-center p-6 lg:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-gold-500/20 transition-all duration-300">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 text-gold-500 group-hover:bg-gold-500 group-hover:text-navy-950 transition-colors duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-white tracking-tight">
                    {badge.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/40 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
