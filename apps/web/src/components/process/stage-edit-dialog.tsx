"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { StageData } from "./process-page-client";
import type { FocusArea } from "@reconnect/database";

interface StageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playbookId: string;
  stage: StageData | null;
  onSave: (stage: StageData) => void;
}

const STAGE_TYPES = [
  "screening",
  "technical",
  "behavioral",
  "cultural",
  "final",
  "custom",
] as const;

interface DraftFocusArea {
  name: string;
  description: string;
  weight: number;
  rationale: string;
}

export function StageEditDialog({
  open,
  onOpenChange,
  playbookId,
  stage,
  onSave,
}: StageEditDialogProps) {
  const isNew = !stage;

  const [name, setName] = useState(stage?.name ?? "");
  const [type, setType] = useState(stage?.type ?? "screening");
  const [duration, setDuration] = useState(stage?.duration_minutes ?? 45);
  const [description, setDescription] = useState(stage?.description ?? "");
  const [focusAreas, setFocusAreas] = useState<DraftFocusArea[]>(
    (stage?.focus_areas ?? []).map((fa: FocusArea) => ({
      name: fa.name,
      description: fa.description,
      weight: fa.weight,
      rationale: fa.rationale ?? "",
    })),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens with new stage data
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(stage?.name ?? "");
      setType(stage?.type ?? "screening");
      setDuration(stage?.duration_minutes ?? 45);
      setDescription(stage?.description ?? "");
      setFocusAreas(
        (stage?.focus_areas ?? []).map((fa: FocusArea) => ({
          name: fa.name,
          description: fa.description,
          weight: fa.weight,
          rationale: fa.rationale ?? "",
        })),
      );
    }
    onOpenChange(isOpen);
  };

  function addFocusArea() {
    setFocusAreas([
      ...focusAreas,
      { name: "", description: "", weight: 2, rationale: "" },
    ]);
  }

  function removeFocusArea(index: number) {
    setFocusAreas(focusAreas.filter((_, i) => i !== index));
  }

  function updateFocusArea(index: number, field: keyof DraftFocusArea, value: string | number) {
    const updated = [...focusAreas];
    updated[index] = { ...updated[index], [field]: value };
    setFocusAreas(updated);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Stage name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        duration_minutes: duration,
        description: description.trim() || undefined,
        focus_areas: focusAreas
          .filter((fa) => fa.name.trim())
          .map((fa) => ({
            name: fa.name.trim(),
            description: fa.description.trim(),
            weight: fa.weight,
            rationale: fa.rationale.trim() || undefined,
          })),
      };

      const url = isNew
        ? `/api/playbooks/${playbookId}/stages`
        : `/api/playbooks/${playbookId}/stages/${stage.id}`;

      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save stage");
      }

      const saved = await res.json();
      onSave(saved);
    } catch (err) {
      console.error("[stage-edit] Save failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save stage",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Stage" : "Edit Stage"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="stage-name">Name</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Technical Interview"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="stage-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="stage-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="stage-duration">Duration (min)</Label>
              <Input
                id="stage-duration"
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) =>
                  setDuration(parseInt(e.target.value) || 45)
                }
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stage-description">Description</Label>
            <Textarea
              id="stage-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this stage"
              autoComplete="off"
            />
          </div>

          {/* Focus Areas */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Focus Areas</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addFocusArea}
                type="button"
              >
                <Plus size={12} className="mr-1" /> Add
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {focusAreas.map((fa, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Focus area name"
                      value={fa.name}
                      onChange={(e) =>
                        updateFocusArea(i, "name", e.target.value)
                      }
                      className="flex-1"
                      autoComplete="off"
                    />
                    <Select
                      value={String(fa.weight)}
                      onValueChange={(v) =>
                        updateFocusArea(i, "weight", parseInt(v))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Weight" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((w) => (
                          <SelectItem key={w} value={String(w)}>
                            Weight {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFocusArea(i)}
                      aria-label="Remove focus area"
                    >
                      <Trash size={14} className="text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Description"
                    value={fa.description}
                    onChange={(e) =>
                      updateFocusArea(i, "description", e.target.value)
                    }
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />}
            {isNew ? "Add Stage" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
