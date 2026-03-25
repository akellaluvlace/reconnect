"use client";

import { PageHeader } from "@/components/ui/page-header";
import { QuestionEditor } from "@/components/admin/question-editor";
import { CmsHowToUse } from "@/components/admin/cms-how-to-use";
import { ChatDots, Tag, FunnelSimple } from "@phosphor-icons/react";

export function QuestionsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Manage your organisation's interview question library. Questions can be filtered by category and stage type."
      />
      <CmsHowToUse
        items={[
          {
            icon: (
              <ChatDots size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Build your bank",
            description:
              "Add interview questions with purpose and what-to-look-for guidance. These help interviewers ask consistent, high-quality questions.",
          },
          {
            icon: (
              <Tag size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Categorise questions",
            description:
              "Assign a category (e.g. Leadership, Problem Solving) and stage type so questions surface in the right context.",
          },
          {
            icon: (
              <FunnelSimple
                size={16}
                weight="duotone"
                className="text-teal-600"
              />
            ),
            title: "Filter and find",
            description:
              "Use the category and stage type filters to quickly find relevant questions when building interview stages.",
          },
        ]}
        tip="Questions with a stage type will be suggested when that type of stage is added to a hiring plan process."
      />
      <QuestionEditor />
    </div>
  );
}
