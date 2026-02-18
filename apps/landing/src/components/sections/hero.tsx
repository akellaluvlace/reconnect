"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Bank, MapPin } from "@phosphor-icons/react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cream-50">
      {/* ── Background noise — calming subtle texture ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.022]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── Faint teal glow — top left ── */}
      <div className="absolute left-[-5%] top-[15%] w-[500px] h-[500px] rounded-full bg-teal-400/[0.03] blur-[140px] pointer-events-none" />

      {/* ── Faint teal glow — bottom right ── */}
      <div className="absolute right-[5%] bottom-[10%] w-[400px] h-[400px] rounded-full bg-teal-500/[0.025] blur-[120px] pointer-events-none" />

      {/* ── Geometric: subtle dot grid behind images ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(4,47,46,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 40% 50% at 72% 50%, #000 10%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 40% 50% at 72% 50%, #000 10%, transparent 70%)",
        }}
      />

      {/* ── Geometric: large circle outlines — top right ── */}
      <div className="absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full border border-teal-600/[0.12] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full border border-teal-600/[0.06] pointer-events-none scale-[1.2]" />

      {/* ── Geometric: medium circle — bottom left ── */}
      <div className="absolute bottom-[8%] left-[6%] w-[220px] h-[220px] rounded-full border border-teal-500/[0.1] pointer-events-none" />
      <div className="absolute bottom-[8%] left-[6%] w-[220px] h-[220px] rounded-full border border-teal-500/[0.05] pointer-events-none scale-[1.25]" />

      {/* ── Geometric: small circle — mid left ── */}
      <div className="absolute top-[42%] left-[2%] w-[80px] h-[80px] rounded-full border border-teal-500/[0.1] pointer-events-none" />

      {/* ── Geometric: diagonal lines — layered pair top right ── */}
      <div className="absolute top-[14%] right-[9%] w-[200px] h-px bg-gradient-to-r from-transparent via-teal-600/20 to-transparent rotate-[-35deg] pointer-events-none" />
      <div className="absolute top-[18%] right-[12%] w-[140px] h-px bg-gradient-to-r from-transparent via-teal-600/12 to-transparent rotate-[-35deg] pointer-events-none" />

      {/* ── Geometric: diagonal line — bottom center ── */}
      <div className="absolute bottom-[22%] left-[40%] w-[160px] h-px bg-gradient-to-r from-transparent via-teal-500/15 to-transparent rotate-[22deg] pointer-events-none" />

      {/* ── Geometric: cross marks ── */}
      <div className="absolute top-[28%] left-[5%] pointer-events-none">
        <div className="w-5 h-px bg-teal-600/20 rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-5 h-px bg-teal-600/20 -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="absolute bottom-[32%] right-[5%] pointer-events-none">
        <div className="w-4 h-px bg-teal-500/15 rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-4 h-px bg-teal-500/15 -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="absolute top-[65%] left-[35%] pointer-events-none">
        <div className="w-3 h-px bg-teal-500/10 rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-3 h-px bg-teal-500/10 -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ── Geometric: scattered dots ── */}
      <div className="absolute top-[20%] left-[14%] w-2 h-2 rounded-full bg-teal-500/15 pointer-events-none" />
      <div className="absolute top-[55%] left-[2.5%] w-2 h-2 rounded-full bg-teal-500/12 pointer-events-none" />
      <div className="absolute bottom-[14%] right-[14%] w-2.5 h-2.5 rounded-full bg-teal-500/12 pointer-events-none" />
      <div className="absolute top-[75%] left-[18%] w-1.5 h-1.5 rounded-full bg-teal-600/10 pointer-events-none" />

      {/* ── Geometric: corner bracket — top left ── */}
      <div className="absolute top-[13%] left-[3.5%] pointer-events-none">
        <div className="w-10 h-px bg-teal-600/15" />
        <div className="w-px h-10 bg-teal-600/15" />
      </div>

      {/* ── Geometric: corner bracket — bottom right (mirrored) ── */}
      <div className="absolute bottom-[13%] right-[3.5%] pointer-events-none rotate-180">
        <div className="w-10 h-px bg-teal-600/12" />
        <div className="w-px h-10 bg-teal-600/12" />
      </div>

      {/* ── Geometric: rotated squares ── */}
      <div className="absolute top-[48%] right-[3%] w-6 h-6 border border-teal-500/12 rotate-45 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[28%] w-4 h-4 border border-teal-500/10 rotate-12 pointer-events-none" />

      {/* ── Content — two column ── */}
      <div className="relative z-10 w-full pt-28 pb-20 px-8 lg:px-16 xl:px-24">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">
          {/* ── Left — Text + CTAs ── */}
          <AnimateOnScroll>
          <div className="relative">
            {/* Frame around text */}
            <div className="absolute -inset-6 rounded-2xl border border-teal-500/[0.07] pointer-events-none" />

            {/* Corner brackets */}
            <div className="absolute -top-8 -left-8 pointer-events-none">
              <div className="w-5 h-px bg-teal-500/20" />
              <div className="w-px h-5 bg-teal-500/20" />
            </div>
            <div className="absolute -top-8 -right-8 pointer-events-none">
              <div className="w-5 h-px bg-teal-500/20 ml-auto" />
              <div className="w-px h-5 bg-teal-500/20 ml-auto" />
            </div>
            <div className="absolute -bottom-8 -left-8 pointer-events-none">
              <div className="w-px h-5 bg-teal-500/15" />
              <div className="w-5 h-px bg-teal-500/15" />
            </div>
            <div className="absolute -bottom-8 -right-8 pointer-events-none flex flex-col items-end">
              <div className="w-px h-5 bg-teal-500/15" />
              <div className="w-5 h-px bg-teal-500/15" />
            </div>
            {/* Headline */}
            <h1 className="font-display text-[clamp(2.8rem,4.8vw,4.5rem)] font-[800] tracking-[-0.04em] leading-[1] text-teal-950">
              Recruitment connected{" "}
              <span className="text-teal-600">the right way</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-7 text-[clamp(1rem,1.15vw,1.15rem)] text-slate-500 max-w-[460px] leading-[1.75] tracking-[-0.005em]">
              Trust, efficiency, and accuracy for startups, SMEs, and scaleups ready to grow — any industry, any stage.
            </p>

            {/* CTAs */}
            <div className="mt-11 flex items-center gap-5">
              <Button href="#book-demo" variant="outline-dark" size="lg">
                Book a Demo
                <ArrowRight size={20} weight="bold" className="ml-2" />
              </Button>
              <a
                href="#solution"
                className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-teal-700 transition-colors duration-300"
              >
                See how it works
                <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </div>

            {/* Trust line */}
            <div className="mt-14">
              <div className="w-full h-px bg-gradient-to-r from-teal-500/15 via-teal-400/8 to-transparent mb-6" />
              <div className="flex items-center gap-8 text-[13px] text-slate-500 font-medium tracking-wide">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} weight="duotone" className="text-teal-500" />
                  GDPR compliant
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300/60" />
                <span className="flex items-center gap-2">
                  <Bank size={18} weight="duotone" className="text-teal-500" />
                  EU AI Act ready
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300/60" />
                <span className="flex items-center gap-2">
                  <MapPin size={18} weight="duotone" className="text-teal-500" />
                  Built for Ireland
                </span>
              </div>
            </div>
          </div>
          </AnimateOnScroll>

          {/* ── Right — Image Grid ── */}
          <AnimateOnScroll delay={1}>
          <div className="relative hidden lg:block">
            {/* Smaller frame around images */}
            <div className="absolute -inset-4 rounded-2xl border border-teal-500/[0.07] pointer-events-none" />

            {/* Corner brackets — tighter */}
            <div className="absolute -top-6 -left-6 pointer-events-none">
              <div className="w-4 h-px bg-teal-500/18" />
              <div className="w-px h-4 bg-teal-500/18" />
            </div>
            <div className="absolute -top-6 -right-6 pointer-events-none">
              <div className="w-4 h-px bg-teal-500/18 ml-auto" />
              <div className="w-px h-4 bg-teal-500/18 ml-auto" />
            </div>
            <div className="absolute -bottom-6 -left-6 pointer-events-none">
              <div className="w-px h-4 bg-teal-500/12" />
              <div className="w-4 h-px bg-teal-500/12" />
            </div>
            <div className="absolute -bottom-6 -right-6 pointer-events-none flex flex-col items-end">
              <div className="w-px h-4 bg-teal-500/12" />
              <div className="w-4 h-px bg-teal-500/12" />
            </div>

            {/* ── Image grid ── */}
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop&q=80"
                  alt="Team meeting"
                  className="w-full h-48 object-cover rounded-xl shadow-[0_2px_16px_rgba(4,47,46,0.07)]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&q=80"
                  alt="Strategy session"
                  className="w-full h-56 object-cover rounded-xl shadow-[0_2px_16px_rgba(4,47,46,0.07)]"
                />
              </div>
              <div className="space-y-4 pt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=400&h=400&fit=crop&q=80"
                  alt="Executive consulting"
                  className="w-full h-56 object-cover rounded-xl shadow-[0_2px_16px_rgba(4,47,46,0.07)]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=300&fit=crop&q=80"
                  alt="Data analysis"
                  className="w-full h-48 object-cover rounded-xl shadow-[0_2px_16px_rgba(4,47,46,0.07)]"
                />
              </div>
            </div>
          </div>
          </AnimateOnScroll>
        </div>
      </div>

      {/* ── Bottom edge fade ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream-50 to-transparent pointer-events-none z-20" />
    </section>
  );
}
