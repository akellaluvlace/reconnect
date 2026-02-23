"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, CircleNotch, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

export default function ConsentPage() {
  const params = useParams<{ token: string }>();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleConsent() {
    if (!agreed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit consent");
      }

      setIsComplete(true);
    } catch (err) {
      console.error("[consent] Submit failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit consent",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <CheckCircle size={48} weight="duotone" className="text-green-500" />
            <h2 className="text-lg font-semibold">Consent Recorded</h2>
            <p className="text-sm text-muted-foreground text-center">
              Thank you. Your recording consent has been recorded. You can close
              this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={20} weight="duotone" />
            Recording Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your upcoming interview may be recorded to ensure accurate
            evaluation. The recording will be used solely for assessment purposes
            and handled in accordance with GDPR and EU AI Act requirements.
          </p>

          <div className="rounded-md border p-3 text-sm space-y-2">
            <p className="font-medium">What this means:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                - Audio/video will be recorded during the interview session
              </li>
              <li>- The recording will be transcribed for review purposes</li>
              <li>
                - AI analysis will be used for text-based evaluation only (no
                emotion/voice/biometric analysis)
              </li>
              <li>
                - All data is retained for 1 year, after which you will be
                contacted about opt-in/opt-out
              </li>
              <li>
                - You may withdraw consent at any time by contacting us
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-checkbox"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label htmlFor="consent-checkbox" className="text-sm leading-snug">
              I consent to the recording and AI-assisted analysis of my
              interview as described above
            </Label>
          </div>

          <Button
            className="w-full"
            onClick={handleConsent}
            disabled={!agreed || isSubmitting}
          >
            {isSubmitting ? (
              <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
            ) : (
              <ShieldCheck size={16} weight="duotone" className="mr-2" />
            )}
            Submit Consent
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            If you choose not to consent, the interview will proceed without
            recording.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
