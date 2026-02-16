import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { FileSpreadsheet, MessageCircleQuestion, UserX } from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface PainPoint {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

const painPoints: PainPoint[] = [
  {
    icon: FileSpreadsheet,
    title: "The spreadsheet spiral",
    description:
      "Candidates tracked across spreadsheets, email threads, and WhatsApp. CVs sitting in inboxes for weeks. No system, no process, no visibility.",
    stat: "44%",
    statLabel: "of HR leaders say feedback takes too long",
  },
  {
    icon: MessageCircleQuestion,
    title: "Every interviewer wings it",
    description:
      "One asks about technical skills. Another spends 40 minutes talking about themselves. Every candidate gets a different experience. The loudest voice in the debrief wins.",
    stat: "9",
    statLabel: "protected grounds under Ireland's Employment Equality Act",
  },
  {
    icon: UserX,
    title: "You hired the wrong person. Again.",
    description:
      "Three months in, you already know. The interview felt great — good energy, strong rapport. But you never tested for what the role actually needed.",
    stat: "€6k–€15k",
    statLabel: "cost per hire for Irish mid-level roles",
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 lg:py-32 bg-cream-50">
      <Container size="wide">
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
              Sound Familiar?
            </span>
            <h2 className="mt-4 font-display text-3xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              Your hiring process is held together
              <br className="hidden lg:block" />
              with sticky tape
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {painPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <AnimateOnScroll
                key={point.title}
                delay={(i + 1) as 1 | 2 | 3}
              >
                <div className="group relative flex flex-col h-full p-8 lg:p-10 rounded-2xl bg-white border border-cream-200 hover:border-red-200/50 hover:shadow-lg hover:shadow-red-500/[0.03] transition-all duration-300">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <h3 className="mt-6 font-display text-xl lg:text-2xl font-bold text-navy-900 tracking-tight">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-slate-500 leading-relaxed flex-1">
                    {point.description}
                  </p>

                  {/* Stat callout */}
                  <div className="mt-8 pt-6 border-t border-cream-200">
                    <span className="block font-display text-2xl font-bold text-navy-900">
                      {point.stat}
                    </span>
                    <span className="text-sm text-slate-400">
                      {point.statLabel}
                    </span>
                  </div>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
