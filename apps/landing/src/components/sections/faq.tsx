"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "Will AI make the hiring decision?",
    answer:
      "No. Rec+onnect's AI generates interview playbooks and synthesises feedback from your team, but it explicitly does not make hire/no-hire recommendations. Every hiring decision is made by a human. This is a design principle, not a limitation — and it's exactly what the EU AI Act requires.",
  },
  {
    question: "How is this different from an ATS like Greenhouse or Recruitee?",
    answer:
      "Rec+onnect is not an ATS. We don't post jobs, parse CVs, or source candidates. We focus entirely on what happens after candidates enter your pipeline: structuring interviews, collecting fair feedback, and synthesising evaluations. Think of us as the interview and decision layer that sits alongside your existing tools.",
  },
  {
    question: "Is this GDPR compliant?",
    answer:
      "Yes. Rec+onnect processes candidate data under clear legal bases, supports all data subject rights, and never uses sole automated decision-making under GDPR Article 22. All data is hosted within the EU. Recruitment data retention follows Irish legal guidelines, including the 12-month limitation period for Employment Equality Act claims.",
  },
  {
    question: "We only hire a few people a year. Is this worth it?",
    answer:
      "Especially then. When you hire infrequently, you lack the muscle memory that high-volume recruiters develop. A bad hire at a 100-person company is proportionally far more damaging than at a 10,000-person one. Rec+onnect gives you a structured, repeatable process so every hire follows the same rigorous standard.",
  },
  {
    question: "How long does it take to set up?",
    answer:
      "Minutes, not weeks. No implementation project, no IT team required, and no data migration. Sign up, invite your team, and generate your first playbook. Most teams run their first structured interview within a day.",
  },
  {
    question: "Can I customise the AI-generated playbooks?",
    answer:
      "Absolutely. The AI gives you a strong starting point — structured stages, focus areas, and questions tailored to the role. You can edit every element, add your own questions, adjust scoring criteria, and save templates for roles you hire repeatedly. The AI accelerates you; it doesn't constrain you.",
  },
  {
    question: "How does blind feedback work in practice?",
    answer:
      "After interviewing a candidate, each team member submits their ratings on a 1–4 scale and written notes independently. They cannot see other interviewers' feedback until they've submitted their own. This prevents anchoring bias and produces more honest, diverse evaluations.",
  },
  {
    question: "What about the EU AI Act?",
    answer:
      "Recruitment AI is classified as high-risk under the EU AI Act, with full obligations effective August 2026. Rec+onnect is designed to meet these requirements: text-only analysis, no emotion detection or biometric inference, mandatory human oversight, transparent processing, and full audit trails. We built compliance into the architecture, not as an afterthought.",
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`border rounded-2xl transition-all duration-300 ${
        isOpen
          ? "border-gold-200 bg-white shadow-sm"
          : "border-cream-200 bg-cream-50/50 hover:border-cream-300"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-6 lg:p-8 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="font-display text-lg font-semibold text-navy-900 pr-8">
          {item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-gold-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 lg:px-8 pb-6 lg:pb-8 text-slate-500 leading-relaxed">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-white">
      <Container>
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
            <span className="text-sm font-semibold font-display tracking-widest uppercase text-gold-600">
              FAQ
            </span>
            <h2 className="mt-4 font-display text-3xl lg:text-5xl font-bold text-navy-900 tracking-tight leading-tight">
              Questions you&apos;re probably
              <br className="hidden lg:block" />
              already asking
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <AnimateOnScroll key={faq.question} delay={i < 4 ? ((i + 1) as 1 | 2 | 3 | 4) : undefined}>
              <FaqAccordionItem
                item={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
