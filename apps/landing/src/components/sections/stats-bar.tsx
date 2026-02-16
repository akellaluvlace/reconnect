import Image from "next/image";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

interface Stat {
  value: string;
  label: string;
  source: string;
}

const stats: Stat[] = [
  {
    value: "83%",
    label: "find hiring challenging",
    source: "ManpowerGroup 2025",
  },
  {
    value: "€13,100",
    label: "cost of a bad hire",
    source: "Adare HRM",
  },
  {
    value: "90%",
    label: "can't find the right skills",
    source: "Chambers Ireland",
  },
  {
    value: "74%",
    label: "hired the wrong person",
    source: "CareerBuilder",
  },
];

export function StatsBar() {
  return (
    <section className="pt-24 pb-12 lg:pt-28 lg:pb-14 bg-cream-50">
      <Container size="wide">
        {/* Top gold gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent mb-12 lg:mb-14" />

        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left — illustration + heading */}
          <AnimateOnScroll className="col-span-12 lg:col-span-4">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <Image
                src="/illustrations/we-got-a-problem.svg"
                alt="Illustration of a hiring problem"
                width={280}
                height={280}
                className="w-full max-w-[260px] h-auto mb-6 illustration-gold"
              />
              <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
                Sound Familiar?
              </span>
              <h2 className="mt-2 font-display text-2xl lg:text-3xl font-bold text-navy-900 tracking-tight leading-tight">
                The numbers don&apos;t lie
              </h2>
            </div>
          </AnimateOnScroll>

          {/* Right — stats grid */}
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-2 gap-x-10 gap-y-10 lg:gap-y-12">
              {stats.map((stat, i) => (
                <AnimateOnScroll
                  key={stat.label}
                  delay={(i + 1) as 1 | 2 | 3 | 4}
                >
                  <div>
                    <span className="font-display text-4xl lg:text-5xl font-bold text-gold-600 tracking-tight whitespace-nowrap tabular-nums">
                      {stat.value}
                    </span>
                    <p className="mt-2 text-sm font-medium text-navy-900/70">
                      {stat.label}
                    </p>
                    <span className="text-xs text-slate-400">
                      {stat.source}
                    </span>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom gold gradient line */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent mt-12 lg:mt-14" />
      </Container>
    </section>
  );
}
