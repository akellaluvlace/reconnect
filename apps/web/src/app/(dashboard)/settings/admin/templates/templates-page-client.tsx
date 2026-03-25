"use client";

import { PageHeader } from "@/components/ui/page-header";
import { StageTemplateEditor } from "@/components/admin/stage-template-editor";
import { CmsHowToUse } from "@/components/admin/cms-how-to-use";
import { ListChecks, Clock, Sparkle } from "@phosphor-icons/react";

export function TemplatesPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stage Templates"
        description="Manage reusable interview stage templates. Templates provide default structure when building hiring plan interview processes."
      />
      <CmsHowToUse
        items={[
          {
            icon: (
              <ListChecks size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Create templates",
            description:
              "Define stage templates with a name, type, focus areas, and suggested questions. These appear as starting points in the process builder.",
          },
          {
            icon: (
              <Clock size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Set duration",
            description:
              "Set recommended duration for each stage type. This helps interviewers plan their time effectively.",
          },
          {
            icon: (
              <Sparkle size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Focus areas and questions",
            description:
              "Add focus areas and suggested questions to give interviewers a structured starting point they can customise.",
          },
        ]}
        tip="Templates are suggestions, not constraints. Interviewers can always add or remove focus areas and questions from their stages."
      />
      <StageTemplateEditor />
    </div>
  );
}
