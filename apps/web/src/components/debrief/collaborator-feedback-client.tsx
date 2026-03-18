"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "@phosphor-icons/react";
import { FeedbackForm } from "@/components/debrief/feedback-form";

export function CollaboratorFeedbackClient({
  interviewId,
  token,
  focusAreas,
}: {
  interviewId: string;
  token: string;
  focusAreas: string[];
}) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle
            size={48}
            weight="duotone"
            className="text-teal-500 mx-auto mb-4"
          />
          <p className="text-lg font-semibold">Thank You!</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your feedback has been submitted successfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FeedbackForm
      interviewId={interviewId}
      focusAreas={focusAreas}
      onSubmit={() => setSubmitted(true)}
      apiEndpoint="/api/feedback/collaborator"
      extraBody={{ token }}
    />
  );
}
