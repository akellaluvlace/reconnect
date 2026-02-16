import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ArrowRight, Check } from "lucide-react";

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
      className="relative py-24 lg:py-32 hero-gradient bg-noise overflow-hidden"
    >
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gold-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-16 w-40 h-40 border border-white/[0.03] rotate-12 rounded-3xl" />
        <div className="absolute top-16 left-16 w-24 h-24 border border-white/[0.04] -rotate-12 rounded-2xl" />
      </div>

      <Container size="narrow" className="relative z-10">
        <AnimateOnScroll>
          <div className="text-center">
            {/* Scarcity badge */}
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
              Limited to 50 founding companies
            </span>

            <h2 className="font-display text-3xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              Join the founding 50
            </h2>
            <p className="mt-6 text-lg text-white/50 max-w-lg mx-auto leading-relaxed">
              We&apos;re opening Rec+onnect to 50 Irish companies for our
              founding beta. Shape the product. Lock in early pricing.
              Permanently.
            </p>

            {/* Perks */}
            <div className="mt-10 flex flex-col items-center gap-3">
              {perks.map((perk) => (
                <div key={perk} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gold-500/20">
                    <Check className="w-3 h-3 text-gold-400" />
                  </div>
                  <span className="text-sm text-white/60">{perk}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Button href="#contact" variant="gold" size="xl">
                Claim Your Spot
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/25">
              No credit card &middot; No commitment &middot; Beta launches Q2 2026
            </p>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
