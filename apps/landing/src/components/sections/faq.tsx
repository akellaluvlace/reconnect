"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { AnimateOnScroll } from "@/components/animate-on-scroll";
import { CaretDown } from "@phosphor-icons/react";

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
    question: "Is this GDPR and EU AI Act compliant?",
    answer:
      "Yes, fully. Rec+onnect processes candidate data under clear legal bases, supports all data subject rights, and never uses sole automated decision-making under GDPR Article 22. All data is hosted within the EU. For the EU AI Act — recruitment AI is classified as high-risk with obligations effective August 2026. Rec+onnect meets these requirements: text-only analysis, no emotion detection or biometric inference, mandatory human oversight, transparent processing, and full audit trails.",
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
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
        isOpen
          ? "bg-white border-l-[3px] border-l-teal-500 border border-[var(--border-light-subtle)] shadow-[0_1px_2px_rgba(10,22,40,0.04),0_4px_12px_rgba(10,22,40,0.03)]"
          : "border-l-[3px] border-l-transparent border border-transparent bg-cream-100/50 hover:bg-cream-100"
      }`}
    >
      <button
        id={`faq-trigger-${index}`}
        onClick={onToggle}
        className="flex items-center justify-between w-full p-6 lg:p-8 text-left cursor-pointer"
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
      >
        <span className="font-display text-lg font-semibold text-teal-900 pr-8 tracking-[-0.01em]">
          {item.question}
        </span>
        <CaretDown
          size={20}
          weight="bold"
          className={`flex-shrink-0 text-teal-500 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        id={`faq-panel-${index}`}
        role="region"
        aria-labelledby={`faq-trigger-${index}`}
        className={`grid transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 lg:px-8 pb-6 lg:pb-8 text-slate-500 leading-[1.65] max-w-[640px]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28 bg-white">
      <Container size="wide">
        {/* Header */}
        <AnimateOnScroll>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold font-display tracking-[0.15em] uppercase text-teal-600 mb-3 block">
              FAQ
            </span>
            <h2 className="font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-bold text-teal-950 tracking-[-0.03em] leading-[1.08]">
              Questions you&apos;re probably
              already asking
            </h2>
            <p className="mt-5 text-[15px] text-slate-500 leading-[1.7]">
              We built Rec+onnect for hiring teams who are tired of guessing.
              Here&apos;s what they ask first.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Accordion */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <AnimateOnScroll
              key={faq.question}
              delay={i < 4 ? ((i + 1) as 1 | 2 | 3 | 4) : undefined}
            >
              <FaqAccordionItem
                item={faq}
                index={i}
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
