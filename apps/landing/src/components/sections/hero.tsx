import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center hero-gradient bg-noise overflow-hidden">
      {/* Hero photo — spans most of section, seamlessly blended */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/illustrations/hero-interview.png"
          alt=""
          width={1200}
          height={800}
          className="absolute inset-0 w-full h-full object-cover object-[center_30%] brightness-[0.75] saturate-[0.85]"
          priority
          aria-hidden="true"
        />
        {/* Navy color blend over entire image */}
        <div className="absolute inset-0 bg-navy-950/10 mix-blend-multiply" />
        {/* Smooth fade — heavier on left for text readability, lighter on right to show image */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-navy-950)] via-[var(--color-navy-950)]/50 via-35% to-transparent" />
        {/* Bottom fade for wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-navy-950)] to-transparent" />
        {/* Top subtle fade for header area */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[var(--color-navy-950)]/40 to-transparent" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gold-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-32 h-32 border border-white/[0.04] rotate-45" />
      </div>

      <div className="relative z-10 pt-32 pb-24 pl-28 lg:pl-44 xl:pl-56">
        <div className="max-w-2xl">
          {/* Headline */}
          <h1 className="font-display text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Hire with{" "}
            <span className="text-gold-gradient">clarity</span>
            .
            <br />
            Not chaos.
          </h1>

          {/* Supporting Text */}
          <p className="mt-8 text-lg lg:text-xl text-white/50 max-w-xl leading-relaxed">
            Create comprehensive hiring playbooks with AI-generated market
            insights, structured interview planning, and seamless team
            coordination.
          </p>

          {/* CTAs */}
          <div className="mt-12 flex items-center gap-4">
            <Button href="#book-demo" variant="gold" size="xl">
              Book a Demo
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button href="#solution" variant="outline" size="xl">
              Learn More
            </Button>
          </div>

          {/* Trust Line */}
          <p className="mt-16 text-sm text-white/30">
            Built for the Irish market &middot; GDPR compliant &middot; EU AI Act ready
          </p>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="section-wave">
        <svg
          viewBox="0 0 1440 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 32C240 56 480 64 720 48C960 32 1200 8 1440 24V64H0V32Z"
            fill="var(--color-cream-50)"
          />
        </svg>
      </div>
    </section>
  );
}
