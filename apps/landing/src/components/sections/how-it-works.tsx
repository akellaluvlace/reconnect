import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import {
  EyeOff,
  Shield,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: EyeOff,
    title: "Kill Groupthink",
    subtitle: "Blind feedback collection",
    description:
      "Every interviewer submits ratings and notes independently — before seeing anyone else's assessment. No anchoring to the loudest voice in the room. Just honest, individual evaluation on a clear 1–4 scale.",
  },
  {
    icon: Scale,
    title: "Same Bar, Every Candidate",
    subtitle: "Structured interview framework",
    description:
      "Each stage has defined focus areas with specific, role-relevant questions. Your team knows exactly what to assess and how. Structured interviews are twice as predictive of job performance as unstructured ones.",
  },
  {
    icon: Shield,
    title: "Compliance as a Weapon",
    subtitle: "EU AI Act & GDPR ready",
    description:
      "Text-only analysis. No emotion detection, no biometrics. Human oversight at every decision point. Built for the EU AI Act from day one — not retrofitted. Your competitors will be scrambling by August 2026.",
  },
  {
    icon: Zap,
    title: "Minutes, Not Weeks",
    subtitle: "Zero setup overhead",
    description:
      "No implementation project, no IT team, no data migration. Sign up, invite your team, generate your first playbook. Most teams run their first structured interview within a day.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-white">
      <Container size="wide">
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
              Why Rec+onnect
            </span>
            <h2 className="mt-4 font-display text-3xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              Everything your hiring process is missing
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <AnimateOnScroll
                key={feature.title}
                delay={(i + 1) as 1 | 2 | 3 | 4}
              >
                <div className="group relative flex gap-6 p-8 lg:p-10 rounded-2xl border border-cream-200 bg-cream-50/50 hover:bg-white hover:border-gold-200 hover:shadow-lg hover:shadow-gold-500/[0.04] transition-all duration-300">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 text-gold-500 group-hover:bg-gold-500 group-hover:text-navy-900 transition-colors duration-300">
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-xl lg:text-2xl font-bold text-navy-900 tracking-tight">
                      {feature.title}
                    </h3>
                    <span className="inline-block mt-1 text-sm font-medium text-gold-600">
                      {feature.subtitle}
                    </span>
                    <p className="mt-3 text-slate-500 leading-relaxed">
                      {feature.description}
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
