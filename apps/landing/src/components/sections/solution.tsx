import Image from "next/image";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";

interface Chapter {
  number: string;
  label: string;
  title: string;
  description: string;
  illustration: string;
  illustrationAlt: string;
}

const chapters: Chapter[] = [
  {
    number: "01",
    label: "Discovery",
    title: "AI Market Insights",
    description:
      "Get real-time salary benchmarks, competition analysis, and candidate availability data for the Irish market. Make informed decisions before you even write the job description.",
    illustration: "/illustrations/selecting-algorithm.svg",
    illustrationAlt:
      "AI algorithm selecting and analysing market data for recruitment insights",
  },
  {
    number: "02",
    label: "Process",
    title: "Smart Interview Planning",
    description:
      "AI-generated interview stages tailored to your role and industry. Discipline-specific focus areas with suggested questions that actually matter.",
    illustration: "/illustrations/job-interview.svg",
    illustrationAlt:
      "Structured job interview planning with organised stages and questions",
  },
  {
    number: "03",
    label: "Alignment",
    title: "Team Coordination",
    description:
      "Invite collaborators with a single link. Assign interviewers to specific stages. Keep everyone aligned without endless email threads.",
    illustration: "/illustrations/team-brainstorming-5.svg",
    illustrationAlt:
      "Team members brainstorming and coordinating around a shared plan",
  },
  {
    number: "04",
    label: "Debrief",
    title: "AI-Powered Synthesis",
    description:
      "Record interviews, get automatic transcriptions, and let AI compare feedback across your team. See where you agree — and where you don't.",
    illustration: "/illustrations/robot-office-team.svg",
    illustrationAlt:
      "AI robot working alongside team to synthesise interview feedback and insights",
  },
];

function ChapterRow({
  chapter,
  index,
}: {
  chapter: Chapter;
  index: number;
}) {
  const isReversed = index % 2 !== 0;

  return (
    <div className="relative">
      {/* Chapter row */}
      <div className="grid grid-cols-12 gap-8 lg:gap-16 items-center">
        {/* Illustration side */}
        <AnimateOnScroll
          delay={1}
          className={`col-span-12 lg:col-span-6 ${
            isReversed ? "lg:order-2" : "lg:order-1"
          }`}
        >
          <div
            className={`relative ${
              isReversed ? "lg:pl-8" : "lg:pr-8"
            }`}
          >
            {/* Decorative background shape */}
            <div
              className={`absolute inset-4 rounded-3xl bg-gradient-to-br ${
                index === 0
                  ? "from-gold-100/60 to-cream-100/40"
                  : index === 1
                    ? "from-navy-50/40 to-cream-100/30"
                    : index === 2
                      ? "from-gold-50/50 to-gold-100/30"
                      : "from-navy-50/30 to-cream-100/40"
              } -z-10`}
            />
            <Image
              src={chapter.illustration}
              alt={chapter.illustrationAlt}
              width={400}
              height={400}
              className="w-full max-w-[440px] h-auto mx-auto drop-shadow-sm illustration-gold"
            />
          </div>
        </AnimateOnScroll>

        {/* Text side */}
        <AnimateOnScroll
          delay={2}
          className={`col-span-12 lg:col-span-6 ${
            isReversed ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <div className={isReversed ? "lg:pr-8" : "lg:pl-8"}>
            {/* Chapter number + label */}
            <div className="flex items-center gap-4 mb-8">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 text-gold-600 font-display font-bold text-xl">
                {chapter.number}
              </span>
              <span className="text-base font-semibold font-display tracking-widest uppercase text-gold-600">
                {chapter.label}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-display text-4xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              {chapter.title}
            </h3>

            {/* Description */}
            <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-lg">
              {chapter.description}
            </p>

            {/* Subtle accent line */}
            <div className="mt-8 w-16 h-1 rounded-full bg-gradient-to-r from-gold-500 to-gold-300" />
          </div>
        </AnimateOnScroll>
      </div>

    </div>
  );
}

export function SolutionSection() {
  return (
    <section id="solution" className="py-24 lg:py-32 bg-cream-50 overflow-hidden">
      <Container size="wide">
        {/* Section header */}
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-20 lg:mb-28">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
              The Platform
            </span>
            <h2 className="mt-4 font-display text-3xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              Everything you need to hire with confidence
            </h2>
            <p className="mt-6 text-lg text-slate-500 leading-relaxed">
              Four chapters. One playbook. From market research to final
              decision — every step is structured, intelligent, and compliant.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Alternating chapter rows */}
        <div className="space-y-8 lg:space-y-4">
          {chapters.map((chapter, i) => (
            <ChapterRow key={chapter.label} chapter={chapter} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
