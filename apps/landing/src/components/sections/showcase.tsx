"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChartBarHorizontal,
  Buildings,
  UserCircleCheck,
  Brain,
} from "@phosphor-icons/react";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

const slides = [
  {
    image: "/illustrations/hero/vitaly-gariev-0L1XzREL6Mo-unsplash.jpg",
    description: "Every interview structured for confident decisions",
  },
  {
    image: "/illustrations/hero/dylan-gillis-KdeqA3aTnBY-unsplash.jpg",
    description: "Strategic hiring that scales with your business",
  },
  {
    image: "/illustrations/hero/vitaly-gariev-2AOIg7Qvu8w-unsplash.jpg",
    description: "From job spec to offer in one connected platform",
  },
  {
    image: "/illustrations/hero/linkedin-sales-solutions-oFMI6CdD7yU-unsplash.jpg",
    description: "AI-powered insights built for the Irish market",
  },
];

const INTERVAL = 5000;
const FADE_MS = 1800;

function StaggeredText({ text, isVisible }: { text: string; isVisible: boolean }) {
  const words = text.split(" ");
  return (
    <span className="inline-flex flex-wrap gap-x-[0.3em]" aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${text}-${i}`}
          className="inline-block transition-all duration-500 ease-out"
          style={{
            transitionDelay: `${i * 40}ms`,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(10px)",
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export function ShowcaseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [textVisible, setTextVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload all images on mount
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new window.Image();
      img.src = slide.image;
    });
  }, []);

  const cycleSlide = useCallback(() => {
    const next = (activeIndex + 1) % slides.length;

    // Start text fade out
    setTextVisible(false);

    // Prepare next image at opacity 0, then fade in
    setNextIndex(next);
    setFadeOpacity(0);

    // Trigger fade in on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFadeOpacity(1);
      });
    });

    // After crossfade completes, swap active
    timerRef.current = setTimeout(() => {
      setActiveIndex(next);
      setNextIndex(null);
      setFadeOpacity(0);
      // Small delay then reveal new text
      setTimeout(() => setTextVisible(true), 100);
    }, FADE_MS);
  }, [activeIndex]);

  useEffect(() => {
    const interval = setInterval(cycleSlide, INTERVAL);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cycleSlide]);

  return (
    <section className="relative py-20 lg:py-28 bg-cream-200 overflow-hidden">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(4,47,46,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 pl-[max(2rem,calc((100vw-1280px)/2+2rem))] pr-16 lg:pr-24">
        <div className="flex items-stretch h-[500px] lg:h-[560px]">
          {/* ── Stats column ── */}
          <AnimateOnScroll>
          <div className="w-[280px] lg:w-[320px] shrink-0 flex flex-col justify-between py-3 mr-24 lg:mr-32">
            {/* Hero stat */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ChartBarHorizontal size={32} weight="duotone" className="text-teal-600" />
                <span className="text-xs font-semibold font-display tracking-[0.15em] uppercase text-teal-600">
                  The Science
                </span>
              </div>
              <span className="font-display text-[4.5rem] lg:text-[5.5rem] font-[800] text-teal-950 tracking-[-0.04em] leading-none block">
                2&times;
              </span>
              <p className="mt-3 text-base text-teal-950/80 font-semibold leading-snug">
                more predictive
              </p>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                Structured vs. unstructured interviews
              </p>
              <p className="mt-1 text-xs text-slate-300 italic">
                Schmidt &amp; Hunter
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-teal-900/[0.07] my-4" />

            {/* Secondary stats */}
            <div className="space-y-7">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <Buildings size={28} weight="duotone" className="text-teal-600" />
                </div>
                <div>
                  <span className="font-display text-2xl font-bold text-teal-950 tracking-tight">90%</span>
                  <p className="text-[13px] text-slate-400 leading-snug mt-1">
                    of Irish SMEs struggle to find skilled talent
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <UserCircleCheck size={28} weight="duotone" className="text-teal-600" />
                </div>
                <div>
                  <span className="font-display text-2xl font-bold text-teal-950 tracking-tight">74%</span>
                  <p className="text-[13px] text-slate-400 leading-snug mt-1">
                    of employers admit hiring the wrong person
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <Brain size={28} weight="duotone" className="text-teal-600" />
                </div>
                <div>
                  <span className="font-display text-2xl font-bold text-teal-950 tracking-tight">71%</span>
                  <p className="text-[13px] text-slate-400 leading-snug mt-1">
                    oppose AI making final hiring calls.{" "}
                    <span className="text-teal-600 font-medium not-italic">Ours never does.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          </AnimateOnScroll>

          {/* ── Image carousel — extends to right edge ── */}
          <AnimateOnScroll delay={1} className="flex-1">
          <div className="relative h-full rounded-3xl overflow-hidden shadow-[0_12px_48px_rgba(4,47,46,0.1),0_2px_8px_rgba(4,47,46,0.04)]">
            {/* Base active image */}
            <Image
              src={slides[activeIndex].image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 75vw, 960px"
              priority
              aria-hidden="true"
            />

            {/* Crossfade: next image fades in on top */}
            {nextIndex !== null && (
              <Image
                src={slides[nextIndex].image}
                alt=""
                fill
                className="object-cover"
                style={{
                  opacity: fadeOpacity,
                  transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
                sizes="(max-width: 1280px) 75vw, 960px"
                aria-hidden="true"
              />
            )}

            {/* Subtle bottom gradient for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/25 via-transparent to-transparent" />

            {/* Bottom glass strip */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-3xl px-8 lg:px-12 py-5 lg:py-6"
              style={{
                background: "rgba(4, 47, 46, 0.12)",
                backdropFilter: "blur(16px) saturate(140%)",
                WebkitBackdropFilter: "blur(16px) saturate(140%)",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              {/* Concave corner — left */}
              <div
                className="absolute -top-3 left-0 w-3 h-3 pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 0% 0%, transparent 12px, rgba(4,47,46,0.12) 12px)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  WebkitBackdropFilter: "blur(16px) saturate(140%)",
                }}
              />
              {/* Concave corner — right */}
              <div
                className="absolute -top-3 right-0 w-3 h-3 pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 100% 0%, transparent 12px, rgba(4,47,46,0.12) 12px)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  WebkitBackdropFilter: "blur(16px) saturate(140%)",
                }}
              />
              {/* Top row: heading left, cycling text right */}
              <div className="flex items-baseline justify-between gap-6">
                <h3 className="font-display text-2xl lg:text-3xl font-bold text-white/90 tracking-[-0.02em] shrink-0">
                  Recruitment, reimagined.
                </h3>
                <div className="text-[15px] lg:text-base text-white/50 leading-[1.5] text-right">
                  <StaggeredText
                    text={slides[activeIndex].description}
                    isVisible={textVisible}
                  />
                </div>
              </div>

              {/* Dots */}
              <div className="flex gap-1.5 mt-4">
                {slides.map((_, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: i === activeIndex ? "28px" : "10px",
                      background:
                        i === activeIndex
                          ? "rgba(45, 212, 191, 0.6)"
                          : "rgba(255, 255, 255, 0.15)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
