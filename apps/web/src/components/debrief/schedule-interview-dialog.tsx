"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";

interface StageOption {
  id: string;
  name: string;
  duration_minutes: number | null;
}

interface CollaboratorOption {
  id: string;
  email: string;
  name: string;
}

interface ScheduleInterviewDialogProps {
  candidateId: string;
  candidateEmail?: string | null;
  candidateName: string;
  stages: StageOption[];
  collaborators: CollaboratorOption[];
}

export function ScheduleInterviewDialog({
  candidateId,
  candidateEmail,
  candidateName,
  stages,
  collaborators,
}: ScheduleInterviewDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stageId, setStageId] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [interviewerUserId, setInterviewerUserId] = useState<string | undefined>();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);

  function handleStageChange(value: string) {
    setStageId(value);
    const stage = stages.find((s) => s.id === value);
    if (stage?.duration_minutes) {
      setDuration(stage.duration_minutes);
    }
  }

  function handleInterviewerChange(value: string) {
    if (value === "__custom__") {
      setInterviewerEmail("");
      setInterviewerUserId(undefined);
      return;
    }
    const collab = collaborators.find((c) => c.id === value);
    if (collab) {
      setInterviewerEmail(collab.email);
      setInterviewerUserId(undefined);
    }
  }

  async function handleSubmit() {
    if (!stageId || !interviewerEmail || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }

    const scheduledDate = new Date(`${date}T${time}:00`);
    if (scheduledDate < new Date()) {
      toast.error("Cannot schedule an interview in the past");
      return;
    }

    const scheduledAt = scheduledDate.toISOString();

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          stage_id: stageId,
          interviewer_email: interviewerEmail,
          interviewer_user_id: interviewerUserId,
          scheduled_at: scheduledAt,
          duration_minutes: duration,
          candidate_email: candidateEmail ?? undefined,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to schedule interview");
      }

      const data = await res.json();
      toast.success("Interview scheduled", {
        description: data.meetLink
          ? `Meet link: ${data.meetLink}`
          : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to schedule interview",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus size={14} weight="duotone" className="mr-1.5" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-urbanist">
            Schedule Interview — {candidateName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Stage */}
          <div className="space-y-1.5">
            <Label className="text-sm">Stage</Label>
            <Select value={stageId} onValueChange={handleStageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interviewer */}
          <div className="space-y-1.5">
            <Label className="text-sm">Interviewer</Label>
            <Select onValueChange={handleInterviewerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select interviewer..." />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">
                  Custom email...
                </SelectItem>
              </SelectContent>
            </Select>
            {(!collaborators.length ||
              interviewerEmail === "" ||
              !collaborators.some(
                (c) => c.email === interviewerEmail,
              )) && (
              <Input
                type="email"
                placeholder="interviewer@company.com"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-sm">Duration (minutes)</Label>
            <Input
              type="number"
              min={15}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <CircleNotch
                size={16}
                weight="bold"
                className="mr-2 animate-spin"
              />
            ) : (
              <CalendarPlus
                size={16}
                weight="duotone"
                className="mr-2"
              />
            )}
            Schedule & Create Meet Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
