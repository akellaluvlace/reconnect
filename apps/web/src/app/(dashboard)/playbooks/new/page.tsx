"use client";

import { usePlaybookStore } from "@/stores/playbook-store";
import { WizardProgress } from "@/components/playbooks/wizard/wizard-progress";
import { Step1BasicInfo } from "@/components/playbooks/wizard/step-1-basic-info";
import { Step2RoleDetails } from "@/components/playbooks/wizard/step-2-role-details";
import { Step3Generate } from "@/components/playbooks/wizard/step-3-generate";

export default function NewPlaybookPage() {
  const { draft } = usePlaybookStore();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          New Playbook
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Create a new recruitment playbook with AI-powered guidance
        </p>
      </div>

      <WizardProgress currentStep={draft.step} />

      {draft.step === 1 && <Step1BasicInfo />}
      {draft.step === 2 && <Step2RoleDetails />}
      {draft.step === 3 && <Step3Generate />}
    </div>
  );
}
