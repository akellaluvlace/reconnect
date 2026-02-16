import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import {
  BookOpen,
  BarChart3,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: "01",
    icon: BookOpen,
    title: "Create a Playbook",
    description:
      "Define the role, level, and industry. Set your hiring parameters and let the platform structure everything.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Get AI Insights",
    description:
      "Receive market intelligence — salary benchmarks, competitor landscape, and candidate availability specific to Ireland.",
  },
  {
    number: "03",
    icon: Settings2,
    title: "Build Your Process",
    description:
      "AI generates interview stages with focus areas and suggested questions. Customise everything to fit your approach.",
  },
  {
    number: "04",
    icon: Users,
    title: "Collaborate & Hire",
    description:
      "Invite your team, record interviews, collect blind feedback, and let AI synthesise everything for a clear decision.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <Container size="wide">
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
              How It Works
            </span>
            <h2 className="mt-4 font-display text-3xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              Four steps to better hiring
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <AnimateOnScroll
                key={step.number}
                delay={(i + 1) as 1 | 2 | 3 | 4}
              >
                <div className="group relative flex gap-6 p-8 lg:p-10 rounded-2xl border border-cream-200 bg-cream-50/50 hover:bg-white hover:border-gold-200 hover:shadow-lg hover:shadow-gold-500/[0.04] transition-all duration-300">
                  {/* Number + Icon column */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 text-gold-500 group-hover:bg-gold-500 group-hover:text-navy-900 transition-colors duration-300">
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 font-display font-bold text-xs">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl lg:text-2xl font-bold text-navy-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-slate-500 leading-relaxed">
                      {step.description}
                    </p>
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
