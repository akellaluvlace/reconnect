"use client";

import { PageHeader } from "@/components/ui/page-header";
import { JdTemplateEditor } from "@/components/admin/jd-template-editor";
import { CmsHowToUse } from "@/components/admin/cms-how-to-use";
import { FileText, Sparkle } from "@phosphor-icons/react";

export function JdTemplatesPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="JD Templates"
        description="Manage job description templates. Templates provide reusable structures the AI uses when generating job descriptions for new hiring plans."
      />
      <CmsHowToUse
        items={[
          {
            icon: (
              <FileText size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Create templates",
            description:
              "Define JD templates with a name, style, and content sections (summary, responsibilities, qualifications, benefits). These feed into AI-generated job descriptions.",
          },
          {
            icon: (
              <Sparkle size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Choose a style",
            description:
              "Pick formal, creative, or concise to control the tone of generated descriptions.",
          },
          {
            icon: (
              <Sparkle size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Deactivate",
            description:
              "Delete a template to hide it from future hiring plans without losing historical data.",
          },
        ]}
        tip="Templates are starting points. The AI will adapt content based on the specific role, market context, and strategy for each hiring plan."
      />
      <JdTemplateEditor />
    </div>
  );
}
