"use client";

import { useState } from "react";
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
import {
  DotsSixVertical,
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  ChatCenteredText,
  Clock,
  Target,
  Plus,
  CircleNotch,
} from "@phosphor-icons/react";
import type { FocusArea, SuggestedQuestion } from "@reconnect/database";
import type { StageData } from "./process-page-client";

interface StageCardProps {
  stage: StageData;
  index: number;
  dragHandleProps?: Record<string, unknown>;
  isEditing?: boolean;
  isSaving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave?: (payload: StageEditPayload) => void;
  onCancel?: () => void;
}

export interface StageEditPayload {
  name: string;
  type: string;
  duration_minutes: number;
  description?: string;
  focus_areas: { name: string; description: string; weight: number; rationale?: string }[];
}

interface DraftFocusArea {
  name: string;
  description: string;
  weight: number;
  rationale: string;
}

const STAGE_TYPES = [
  "screening",
  "technical",
  "behavioral",
  "cultural",
  "final",
  "custom",
] as const;

const TYPE_COLORS: Record<string, string> = {
  screening: "border-blue-200 bg-blue-50 text-blue-800",
  technical: "border-purple-200 bg-purple-50 text-purple-800",
  behavioral: "border-amber-200 bg-amber-50 text-amber-800",
  cultural: "border-green-200 bg-green-50 text-green-800",
  final: "border-red-200 bg-red-50 text-red-800",
  custom: "border-border/60 bg-muted/40 text-foreground",
};

export function StageCard({
  stage,
  index,
  dragHandleProps,
  isEditing,
  isSaving,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false);

  // --- Edit mode state ---
  const [editName, setEditName] = useState(stage.name);
  const [editType, setEditType] = useState(stage.type);
  const [editDuration, setEditDuration] = useState(String(stage.duration_minutes));
  const [editDescription, setEditDescription] = useState(stage.description ?? "");
  const [editFocusAreas, setEditFocusAreas] = useState<DraftFocusArea[]>(
    ((stage.focus_areas ?? []) as FocusArea[]).map((fa) => ({
      name: fa.name,
      description: fa.description,
      weight: fa.weight,
      rationale: fa.rationale ?? "",
    })),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset edit state when entering edit mode
  function resetEditState() {
    setEditName(stage.name);
    setEditType(stage.type);
    setEditDuration(String(stage.duration_minutes));
    setEditDescription(stage.description ?? "");
    setEditFocusAreas(
      ((stage.focus_areas ?? []) as FocusArea[]).map((fa) => ({
        name: fa.name,
        description: fa.description,
        weight: fa.weight,
        rationale: fa.rationale ?? "",
      })),
    );
    setConfirmDelete(false);
  }

  function handleSave() {
    if (!editName.trim()) return;
    onSave?.({
      name: editName.trim(),
      type: editType,
      duration_minutes: parseInt(editDuration) || 45,
      description: editDescription.trim() || undefined,
      focus_areas: editFocusAreas
        .filter((fa) => fa.name.trim())
        .map((fa) => ({
          name: fa.name.trim(),
          description: fa.description.trim(),
          weight: fa.weight,
          rationale: fa.rationale.trim() || undefined,
        })),
    });
  }

  function handleCancel() {
    resetEditState();
    onCancel?.();
  }

  const focusAreas = (stage.focus_areas ?? []) as FocusArea[];
  const questions = (stage.suggested_questions ?? []) as SuggestedQuestion[];

  // ---------- EDIT MODE ----------
  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-teal-300 bg-card shadow-md">
        <div className="px-7 py-7 space-y-6">
          {/* Stage number badge */}
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-bold text-teal-700">
              {index + 1}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground">
              {stage.id.startsWith("new-") ? "New Stage" : "Editing Stage"}
            </span>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor={`stage-name-${stage.id}`}>Name</Label>
            <Input
              id={`stage-name-${stage.id}`}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g., Technical Interview"
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Type + Duration side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`stage-type-${stage.id}`}>Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger id={`stage-type-${stage.id}`}>
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
            <div className="space-y-1.5">
              <Label htmlFor={`stage-duration-${stage.id}`}>Duration (min)</Label>
              <Input
                id={`stage-duration-${stage.id}`}
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                autoComplete="off"
              />
              {editDuration !== "" && parseInt(editDuration) < 5 && (
                <p className="text-[12px] text-amber-600">Minimum 5 minutes</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor={`stage-desc-${stage.id}`}>Description</Label>
            <Textarea
              id={`stage-desc-${stage.id}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this stage"
              autoComplete="off"
            />
          </div>

          {/* Focus Areas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Focus Areas</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditFocusAreas([
                    ...editFocusAreas,
                    { name: "", description: "", weight: 2, rationale: "" },
                  ])
                }
                type="button"
              >
                <Plus size={12} className="mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {editFocusAreas.map((fa, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Focus area name"
                      value={fa.name}
                      onChange={(e) => {
                        const updated = [...editFocusAreas];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setEditFocusAreas(updated);
                      }}
                      className="flex-1"
                      autoComplete="off"
                    />
                    <Select
                      value={String(fa.weight)}
                      onValueChange={(v) => {
                        const updated = [...editFocusAreas];
                        updated[i] = { ...updated[i], weight: parseInt(v) };
                        setEditFocusAreas(updated);
                      }}
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
                      onClick={() =>
                        setEditFocusAreas(editFocusAreas.filter((_, idx) => idx !== i))
                      }
                      aria-label="Remove focus area"
                    >
                      <Trash size={14} className="text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Description"
                    value={fa.description}
                    onChange={(e) => {
                      const updated = [...editFocusAreas];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setEditFocusAreas(updated);
                    }}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Questions — read-only display */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Suggested Questions (AI-generated, read-only)</Label>
              <div className="space-y-2">
                {questions.map((q, qi) => (
                  <div
                    key={qi}
                    className="rounded-lg border-l-2 border-teal-300 bg-muted/20 py-2 pl-3 pr-3"
                  >
                    <p className="text-[13px] text-foreground/80">{q.question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Save + Cancel + Delete */}
          <div className="flex items-center justify-between border-t border-border/30 pt-5">
            <div>
              {!stage.id.startsWith("new-") && (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-destructive">Delete this stage?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={onDelete}
                      >
                        Yes, delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash size={14} className="mr-1" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !editName.trim() || !editDuration || parseInt(editDuration) < 5}>
                {isSaving && <CircleNotch size={14} weight="bold" className="mr-1.5 animate-spin" />}
                {stage.id.startsWith("new-") ? "Add Stage" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- DISPLAY MODE ----------
  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm">
      {/* Header */}
      <div className="px-7 py-6">
        <div className="flex items-center gap-4">
          <div
            className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            {...dragHandleProps}
          >
            <DotsSixVertical size={20} weight="bold" />
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[12px] font-bold text-teal-700">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-[16px] font-semibold tracking-tight text-foreground">
                {stage.name}
              </h3>
              <span
                className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${
                  TYPE_COLORS[stage.type] ?? TYPE_COLORS.custom
                }`}
              >
                {stage.type}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Clock size={13} weight="duotone" />
                {stage.duration_minutes} min
              </span>
              {focusAreas.length > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Target size={13} weight="duotone" />
                  {focusAreas.length} focus area{focusAreas.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label="Edit stage"
            >
              <PencilSimple size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <CaretUp size={16} />
              ) : (
                <CaretDown size={16} />
              )}
            </Button>
          </div>
        </div>

        {/* Rationale preview — visible even when collapsed */}
        {stage.rationale && !expanded && (
          <p className="mt-3 text-[14px] italic leading-relaxed text-muted-foreground/70 line-clamp-2 pl-12">
            {stage.rationale as string}
          </p>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border/30 px-7 pb-7 pt-6 space-y-5">
          {/* Description */}
          {stage.description && (
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {stage.description}
            </p>
          )}

          {/* Rationale */}
          {stage.rationale && (
            <div className="rounded-lg border border-border/20 bg-muted/20 px-4 py-3">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Rationale
              </p>
              <p className="text-[14px] italic leading-relaxed text-foreground/70">
                {stage.rationale as string}
              </p>
            </div>
          )}

          {/* Focus Areas */}
          {focusAreas.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Focus Areas
              </h4>
              {focusAreas.map((fa, i) => {
                const faQuestions = questions.filter(
                  (q) => q.focus_area === fa.name,
                );
                return (
                  <div key={i} className="rounded-xl border border-border/30 bg-muted/20 p-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-semibold text-foreground">{fa.name}</span>
                      <span className="rounded-md border border-border/50 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Weight {fa.weight}/4
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                      {fa.description}
                    </p>
                    {fa.rationale && (
                      <p className="mt-1 text-[12px] italic text-muted-foreground/70">
                        {fa.rationale}
                      </p>
                    )}

                    {/* Questions for this focus area */}
                    {faQuestions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {faQuestions.map((q, qi) => (
                          <div
                            key={qi}
                            className="rounded-lg border-l-2 border-teal-300 bg-background/60 py-3 pl-4 pr-4"
                          >
                            <div className="flex items-start gap-2.5">
                              <ChatCenteredText size={14} weight="duotone" className="mt-0.5 shrink-0 text-teal-500" />
                              <div className="space-y-1.5">
                                <p className="text-[14px] font-medium leading-relaxed text-foreground">
                                  {q.question}
                                </p>
                                <p className="text-[13px] text-muted-foreground">
                                  {q.purpose}
                                </p>
                                {q.look_for.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {q.look_for.map((lf, li) => (
                                      <span
                                        key={li}
                                        className="rounded-md border border-teal-100 bg-teal-50/50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
                                      >
                                        {lf}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
