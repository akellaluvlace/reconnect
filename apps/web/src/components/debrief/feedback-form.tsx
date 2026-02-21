"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RatingEntry {
  category: string;
  score: number;
}

interface FeedbackFormProps {
  interviewId: string;
  focusAreas: string[];
  onSubmit: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: "Below Expectations",
  2: "Needs Improvement",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
};

export function FeedbackForm({
  interviewId,
  focusAreas,
  onSubmit,
}: FeedbackFormProps) {
  const [ratings, setRatings] = useState<RatingEntry[]>(
    focusAreas.map((area) => ({ category: area, score: 3 })),
  );
  const [pros, setPros] = useState<string[]>([""]);
  const [cons, setCons] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [focusAreasConfirmed, setFocusAreasConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateRating(index: number, score: number) {
    setRatings((prev) =>
      prev.map((r, i) => (i === index ? { ...r, score } : r)),
    );
  }

  function addItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setter((prev) => [...prev, ""]);
  }

  function updateItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const filteredPros = pros.filter((p) => p.trim());
    const filteredCons = cons.filter((c) => c.trim());

    if (ratings.length === 0) {
      toast.error("At least one rating is required");
      return;
    }

    if (!focusAreasConfirmed) {
      toast.error("Please confirm that you assessed all focus areas");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: interviewId,
          ratings,
          pros: filteredPros,
          cons: filteredCons,
          notes: notes.trim() || undefined,
          focus_areas_confirmed: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit feedback");
      }

      toast.success("Feedback submitted");
      onSubmit();
    } catch (err) {
      console.error("[feedback-form] Submit failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Submit Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ratings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Ratings (1-4)</Label>
          {ratings.map((rating, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm">{rating.category}</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((score) => (
                  <Button
                    key={score}
                    variant={rating.score === score ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateRating(i, score)}
                    className="h-8 w-8 p-0"
                    title={SCORE_LABELS[score]}
                  >
                    {score}
                  </Button>
                ))}
                <Badge variant="outline" className="ml-2 text-xs">
                  {SCORE_LABELS[rating.score]}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Pros */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Strengths</Label>
          {pros.map((pro, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={pro}
                onChange={(e) => updateItem(setPros, i, e.target.value)}
                placeholder="What did the candidate do well?"
                autoComplete="off"
              />
              {pros.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(setPros, i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addItem(setPros)}
          >
            <Plus className="mr-1 h-3 w-3" /> Add strength
          </Button>
        </div>

        {/* Cons */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Areas for Concern</Label>
          {cons.map((con, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={con}
                onChange={(e) => updateItem(setCons, i, e.target.value)}
                placeholder="What concerns were raised?"
                autoComplete="off"
              />
              {cons.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(setCons, i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addItem(setCons)}
          >
            <Plus className="mr-1 h-3 w-3" /> Add concern
          </Button>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label htmlFor="feedback-notes" className="text-sm font-medium">
            Additional Notes
          </Label>
          <Textarea
            id="feedback-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional observations..."
            rows={3}
          />
        </div>

        {/* Focus areas confirmation */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="focus-areas-confirmed"
            checked={focusAreasConfirmed}
            onCheckedChange={(checked) =>
              setFocusAreasConfirmed(checked === true)
            }
          />
          <Label htmlFor="focus-areas-confirmed" className="text-xs">
            I confirm that I assessed all assigned focus areas during this
            interview
          </Label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !focusAreasConfirmed}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
