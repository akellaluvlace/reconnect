"use client";

import { useState } from "react";
import { Question, Sparkle } from "@phosphor-icons/react";

export interface GuideItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface CmsHowToUseProps {
  items: GuideItem[];
  tip?: string;
}

export function CmsHowToUse({ items, tip }: CmsHowToUseProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-1.5 text-[13px] font-medium text-foreground/70 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
      >
        <Question size={15} weight="bold" className="text-teal-600" />
        {showGuide ? "Hide guide" : "How to use this page"}
      </button>

      {showGuide && (
        <div className="mt-3 rounded-xl border border-border/30 bg-muted/20 px-6 py-5 space-y-4 text-[13px] text-foreground/80 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-teal-600">{item.icon}</span>
              <p>
                <span className="font-semibold text-foreground">
                  {item.title}
                </span>{" "}
                &mdash; {item.description}
              </p>
            </div>
          ))}
          {tip && (
            <p className="text-[12px] text-muted-foreground pt-1 border-t border-border/20">
              <span className="font-medium">Tip:</span> {tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Default guide items for common CMS pages
export const SKILLS_GUIDE_ITEMS: GuideItem[] = [
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Add skills",
    description:
      "Define the skills your organisation uses across hiring plans. Skills appear in the wizard and AI-generated strategies.",
  },
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Categorise",
    description:
      "Group skills by category (e.g. Technical, Soft Skills, Leadership) for easier filtering.",
  },
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Deactivate",
    description:
      "Toggle a skill inactive to hide it from new hiring plans without losing historical data.",
  },
];

export const INDUSTRIES_GUIDE_ITEMS: GuideItem[] = [
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Add industries",
    description:
      "Define industry categories for your hiring plans. Industries help the AI tailor market research and strategies.",
  },
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Deactivate",
    description:
      "Toggle an industry inactive to hide it from new hiring plans without losing historical data.",
  },
];

export const LEVELS_GUIDE_ITEMS: GuideItem[] = [
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Add levels",
    description:
      "Define seniority levels (e.g. Graduate, Mid, Senior, Director) used when creating hiring plans.",
  },
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Reorder",
    description:
      "Use the up/down arrows to arrange levels from most junior to most senior. Order determines how they appear in dropdowns.",
  },
  {
    icon: <Sparkle size={16} weight="duotone" />,
    title: "Deactivate",
    description:
      "Toggle a level inactive to hide it from new hiring plans without losing historical data.",
  },
];
