import Image from "next/image";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

interface StatCard {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

interface PainPoint {
  title: string;
  description: string;
  illustration: string;
}

const stats: StatCard[] = [
  {
    value: 44,
    suffix: " days",
    label: "Average time to fill a role in Ireland — Totalent.eu",
  },
  {
    value: 14,
    suffix: "%",
    label:
      "How well unstructured interviews predict performance — Wired/Greenhouse",
  },
  {
    value: 13100,
    prefix: "€",
    label: "Average cost of a bad hire in Ireland — Adare HRM",
  },
];

const painPoints: PainPoint[] = [
  {
    title: "The spreadsheet spiral",
    description:
      "Candidates tracked across spreadsheets, email threads, and WhatsApp. No system, no visibility, no accountability.",
    illustration: "/illus/Empty-Inbox--Streamline-Bruxelles.svg",
  },
  {
    title: "Every interviewer wings it",
    description:
      "One asks about skills. Another spends 40 minutes on small talk. The loudest voice in the debrief wins.",
    illustration: "/illus/No-Drafts--Streamline-Bruxelles.svg",
  },
  {
    title: "You hired the wrong person. Again.",
    description:
      "The interview felt great — strong rapport. But you never tested for what the role actually needed.",
    illustration: "/illus/Business-Strategy-New-Talent--Streamline-Bruxelles.svg",
  },
];

export function ProblemSection() {
  return (
    <section className="relative py-24 lg:py-32 bg-cream-100 overflow-hidden">
      {/* Subtle teal tint */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,148,0.04)_0%,transparent_60%)] pointer-events-none" />

      <div className="bg-noise absolute inset-0 pointer-events-none" />

      <Container size="wide" className="relative z-10">
        {/* ── Header: left tag+heading / right subtitle ── */}
        <div className="grid grid-cols-12 gap-8 lg:gap-16 mb-[72px] items-end">
          <div className="col-span-12 lg:col-span-5">
            <AnimateOnScroll>
              <span className="block text-[11px] font-semibold font-display tracking-[0.15em] uppercase text-teal-600 mb-3">
                01 — The Problem
              </span>
              <h2 className="font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-bold text-teal-950 tracking-[-0.03em] leading-[1.08]">
                Sound Familiar?
              </h2>
            </AnimateOnScroll>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <AnimateOnScroll delay={1}>
              <p className="text-[15px] text-slate-500 leading-[1.7] max-w-xl">
                Your hiring process is held together with sticky tape. These
                aren&apos;t edge cases — they&apos;re the norm for most Irish
                SMEs.
              </p>
            </AnimateOnScroll>
          </div>
        </div>

        {/* ── Stat cards — 3 across, equal height ── */}
        <div className="grid grid-cols-3 gap-5 mb-[72px]">
          {stats.map((stat, i) => (
            <AnimateOnScroll
              key={stat.label}
              delay={i < 3 ? ((i + 1) as 1 | 2 | 3) : undefined}
              className="h-full"
            >
              <div className="h-full flex flex-col items-center justify-center text-center py-11 px-6 rounded-[20px] bg-white border border-teal-900/[0.06] shadow-[0_1px_4px_rgba(4,47,46,0.03)]">
                <span className="font-display text-[clamp(2.5rem,5vw,3.75rem)] font-bold text-teal-600 leading-none">
                  {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
                </span>
                <p className="mt-3 text-xs text-slate-400 leading-snug max-w-[220px]">
                  {stat.label}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* ── Pain cards (left 7fr) + Illustration (right 5fr) ── */}
        <div className="grid grid-cols-12 gap-6 lg:gap-12 items-stretch">
          {/* Pain cards with background sticker illustrations */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-5">
            {painPoints.map((point, i) => (
              <AnimateOnScroll
                key={point.title}
                delay={i < 3 ? ((i + 1) as 1 | 2 | 3) : undefined}
              >
                <div className="relative py-8 px-8 rounded-[20px] bg-white border border-teal-900/[0.06] shadow-[0_1px_4px_rgba(4,47,46,0.03)] overflow-hidden">
                  {/* Teal left accent */}
                  <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-teal-400 to-teal-600 rounded-br-sm" />

                  {/* Background sticker illustration — static */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-[130px] h-[130px] pointer-events-none opacity-[0.75]">
                    <Image
                      src={point.illustration}
                      alt=""
                      width={130}
                      height={130}
                      className="w-full h-full object-contain"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Card content — shifted right to clear the sticker */}
                  <div className="relative z-10 pl-36">
                    <h3 className="font-display text-[19px] font-semibold text-teal-950 mb-2 tracking-[-0.01em]">
                      {point.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-[1.7]">
                      {point.description}
                    </p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          {/* Overworked Employee illustration — fills card height */}
          <div className="hidden lg:flex col-span-5 items-center justify-center relative">
            <AnimateOnScroll className="w-full h-full flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Warm cream depth — layered */}
                <div className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-full blur-[80px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(222,210,190,0.5) 0%, rgba(240,230,215,0.3) 50%, transparent 80%)" }} />
                <div className="absolute inset-0 m-auto w-[65%] h-[65%] rounded-full blur-[45px] translate-y-3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(210,195,170,0.35) 0%, transparent 70%)" }} />
                <Image
                  src="/illus/Overworked-Employee--Streamline-Bruxelles.svg"
                  alt="Overworked employee illustration"
                  width={520}
                  height={520}
                  className="w-[110%] max-w-none h-auto object-contain relative z-10"
                  style={{ filter: "drop-shadow(0 6px 20px rgba(180,160,130,0.15))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        {/* ── Bottom stat ── */}
        <AnimateOnScroll>
          <div className="mt-16 text-center">
            <p className="text-base text-slate-400 italic">
              <span className="text-teal-600 font-semibold not-italic">
                83%
              </span>{" "}
              of employers find hiring challenging —{" "}
              <span className="text-slate-400/70">ManpowerGroup 2025</span>
            </p>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
