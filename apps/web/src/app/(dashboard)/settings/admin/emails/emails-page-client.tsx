"use client";

import { PageHeader } from "@/components/ui/page-header";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import { CmsHowToUse } from "@/components/admin/cms-how-to-use";
import { EnvelopeSimple, Sparkle } from "@phosphor-icons/react";

export function EmailsPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description="Manage email notification templates for interview prep, reminders, and invitations. Use variables to personalise each message."
      />
      <CmsHowToUse
        items={[
          {
            icon: (
              <EnvelopeSimple
                size={16}
                weight="duotone"
                className="text-teal-600"
              />
            ),
            title: "Create templates",
            description:
              "Define email templates with a subject and body. Use {{variables}} to insert dynamic content like candidate names and role titles.",
          },
          {
            icon: (
              <Sparkle size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Template types",
            description:
              "Categorise templates as prep (interviewer preparation), reminder (feedback follow-up), or invite (collaborator invitation) to keep them organised.",
          },
          {
            icon: (
              <Sparkle size={16} weight="duotone" className="text-teal-600" />
            ),
            title: "Preview",
            description:
              "Use the preview panel in the editor to see how your template looks with sample data before saving.",
          },
        ]}
        tip="Click a variable tag in the editor to insert it at your cursor position. The preview shows sample values so you can check formatting."
      />
      <EmailTemplateEditor />
    </div>
  );
}
