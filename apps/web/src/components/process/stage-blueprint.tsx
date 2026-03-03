"use client";

import { useState, useEffect } from "react";
import { useAIGenerationStore, IDLE_OP } from "@/stores/ai-generation-store";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HiringStrategy, JobDescription } from "@reconnect/database";
import { Button } from "@/components/ui/button";
import { StageCard, type StageEditPayload } from "./stage-card";
import { TotalTimeline } from "./total-timeline";
import { Sparkle, CircleNotch, Plus, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { handleSessionExpired } from "@/lib/fetch-utils";
import type { StageData } from "./process-page-client";

export interface ApplyState {
  step: "ai" | "saving" | "coverage";
  error?: string | null;
}

interface StageBlueprintProps {
  playbookId: string;
  stages: StageData[];
  onStagesChange: (stages: StageData[]) => void;
  strategy: HiringStrategy | null;
  jd: JobDescription | null;
  role: string;
  level: string;
  industry: string;
  applyState?: ApplyState | null;
}

const SPEED_LABELS: Record<string, string> = {
  fast_track: "Fast Track",
  standard: "Standard",
  thorough: "Thorough",
};

function SortableStageCard({
  stage,
  index,
  isEditing,
  isSaving,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: {
  stage: StageData;
  index: number;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (payload: StageEditPayload) => void;
  onCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: stage.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StageCard
        stage={stage}
        index={index}
        dragHandleProps={isEditing ? undefined : { ...attributes, ...listeners }}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={onEdit}
        onDelete={onDelete}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}

/** Centered "+ Insert stage" button, visible on hover */
function InsertBetweenControl({ onClick }: { onClick: () => void }) {
  return (
    <div className="group flex items-center justify-center py-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-[12px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-teal-700 hover:bg-teal-50 border border-transparent hover:border-teal-200"
        onClick={onClick}
      >
        <Plus size={12} className="mr-1" />
        Insert stage
      </Button>
    </div>
  );
}

/** Create a blank StageData placeholder for new/insert stage forms */
function createBlankStage(id: string): StageData {
  return {
    id,
    playbook_id: "",
    name: "",
    type: "custom",
    duration_minutes: 45,
    description: null,
    order_index: 0,
    focus_areas: [],
    suggested_questions: [],
    rationale: null,
  };
}

const APPLY_STEP_LABELS: Record<string, string> = {
  ai: "Generating refined stages...",
  saving: "Saving updated stages...",
  coverage: "Re-analysing coverage...",
};

export function StageBlueprint({
  playbookId,
  stages,
  onStagesChange,
  strategy,
  jd,
  role,
  level,
  industry,
  applyState,
}: StageBlueprintProps) {
  const opKey = `stages-${playbookId}`;
  const { status: genStatus, result: genResult, error: genError } = useAIGenerationStore(
    (s) => s.operations[opKey] ?? IDLE_OP,
  );
  const isGenerating = genStatus === "loading";

  // Apply result when operation completes
  useEffect(() => {
    if (genStatus === "success" && genResult) {
      const created = genResult as StageData[];
      onStagesChange(created);
      toast.success(`Generated ${created.length} interview stages`);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
    if (genStatus === "error" && genError) {
      toast.error(genError);
      useAIGenerationStore.getState().clearOperation(opKey);
    }
  }, [genStatus, genResult, genError, onStagesChange, opKey]);

  // Which stage is being edited: existing stage id, or "new-{index}" for inserts
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Tracks insert position and blank stage for new inserts
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleGenerate() {
    const currentStages = stages;

    useAIGenerationStore.getState().startOperation(opKey, async () => {
      if (currentStages.length > 0) {
        const deleteResults = await Promise.allSettled(
          currentStages.map((s) =>
            fetch(`/api/playbooks/${playbookId}/stages/${s.id}`, {
              method: "DELETE",
            }),
          ),
        );
        // Check if any delete returned 401 (session expired)
        for (const r of deleteResults) {
          if (r.status === "fulfilled" && handleSessionExpired(r.value)) return;
        }
        const rejected = deleteResults.filter((r) => r.status === "rejected");
        const httpFailed = deleteResults.filter(
          (r) => r.status === "fulfilled" && !r.value.ok,
        );
        const totalFailed = rejected.length + httpFailed.length;
        if (totalFailed > 0) {
          console.warn("[blueprint] Stage deletions failed:", totalFailed, "(rejected:", rejected.length, "http:", httpFailed.length, ")");
          toast.warning(`${totalFailed} old stage(s) failed to delete — regenerating anyway`);
        }
      }

      const body: Record<string, unknown> = { role, level, industry };

      if (jd) {
        body.jd_context = {
          responsibilities: jd.responsibilities?.slice(0, 5),
          requirements: jd.requirements?.required?.slice(0, 5),
          seniority_signals: jd.seniority_signals?.slice(0, 5),
        };
      }

      if (strategy) {
        body.strategy_context = {
          market_classification: strategy.market_classification,
          process_speed: {
            recommendation: strategy.process_speed.recommendation,
            max_stages: strategy.process_speed.max_stages,
            target_days: strategy.process_speed.target_days,
          },
          skills_priority: {
            must_have: strategy.skills_priority.must_have.slice(0, 5),
            nice_to_have: strategy.skills_priority.nice_to_have.slice(0, 5),
          },
          competitive_differentiators: strategy.competitive_differentiators.slice(0, 3),
        };
      }

      const aiRes = await fetch("/api/ai/generate-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(150_000),
      }).catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new Error("Stage generation timed out — please try again");
        }
        throw err;
      });

      if (handleSessionExpired(aiRes)) return;
      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate stages");
      }

      const { data } = await aiRes.json();

      // Coerce AI stage types to valid DB enum values
      const VALID_TYPES = new Set(["screening", "technical", "behavioral", "cultural", "final", "custom"]);
      const generatedStages = (data.stages as Record<string, unknown>[]).map((s) => ({
        ...s,
        type: VALID_TYPES.has(s.type as string) ? s.type : "custom",
      }));

      const createRes = await fetch(
        `/api/playbooks/${playbookId}/stages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generatedStages),
        },
      );

      if (handleSessionExpired(createRes)) return;
      if (!createRes.ok) {
        throw new Error("Failed to save generated stages");
      }

      const result = await createRes.json();
      const created = result.data || [result];

      if (result.errors?.length > 0) {
        console.warn("[blueprint] Partial stage creation failures:", result.errors);
        toast.warning(`Created ${created.length} stages, but ${result.errors.length} failed to save`);
      }

      return created;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...stages];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const reindexed = updated.map((s, i) => ({ ...s, order_index: i }));
    onStagesChange(reindexed);

    try {
      const res = await fetch(`/api/playbooks/${playbookId}/stages/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: reindexed.map((s) => ({
            id: s.id,
            order_index: s.order_index,
          })),
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok || res.status === 207) {
        throw new Error("Reorder failed");
      }
    } catch {
      onStagesChange(stages);
      toast.error("Failed to reorder stages");
    }
  }

  async function handleDelete(stageId: string) {
    const prev = [...stages];
    onStagesChange(stages.filter((s) => s.id !== stageId));
    setEditingStageId(null);
    setInsertAtIndex(null);

    try {
      const res = await fetch(
        `/api/playbooks/${playbookId}/stages/${stageId}`,
        { method: "DELETE" },
      );

      if (handleSessionExpired(res)) return;
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      onStagesChange(prev);
      toast.error("Failed to delete stage");
    }
  }

  async function handleSaveExisting(stageId: string, payload: StageEditPayload) {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/playbooks/${playbookId}/stages/${stageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save stage");
      }

      const saved = await res.json();
      onStagesChange(stages.map((s) => (s.id === stageId ? saved : s)));
      setEditingStageId(null);
    } catch (err) {
      console.error("[blueprint] Save failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save stage");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveNew(payload: StageEditPayload, targetIndex: number) {
    setIsSaving(true);
    try {
      // Create the new stage
      const res = await fetch(`/api/playbooks/${playbookId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          order_index: targetIndex,
        }),
      });

      if (handleSessionExpired(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add stage");
      }

      const saved = await res.json();
      // If the API returns an array wrapper, unwrap
      const newStage: StageData = saved.data ? saved.data[0] || saved.data : saved;

      // Insert at position and reindex
      const updated = [...stages];
      updated.splice(targetIndex, 0, newStage);
      const reindexed = updated.map((s, i) => ({ ...s, order_index: i }));
      onStagesChange(reindexed);

      // Persist reorder
      const reorderRes = await fetch(`/api/playbooks/${playbookId}/stages/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: reindexed.map((s) => ({
            id: s.id,
            order_index: s.order_index,
          })),
        }),
      });
      if (handleSessionExpired(reorderRes)) return;
      if (!reorderRes.ok) {
        console.warn("[blueprint] Reorder after insert failed:", reorderRes.status);
        toast.warning("Stage added but ordering may not have saved");
      }

      setEditingStageId(null);
      setInsertAtIndex(null);
    } catch (err) {
      console.error("[blueprint] Add stage failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add stage");
    } finally {
      setIsSaving(false);
    }
  }

  function startInsert(atIndex: number) {
    setEditingStageId(`new-${atIndex}`);
    setInsertAtIndex(atIndex);
  }

  function handleCancelEdit() {
    setEditingStageId(null);
    setInsertAtIndex(null);
  }

  // Build the list of items to render, inserting the blank card at the right position
  const renderItems: Array<{ type: "stage"; stage: StageData; displayIndex: number } | { type: "new"; displayIndex: number }> = [];
  let displayIdx = 0;

  for (let i = 0; i < stages.length; i++) {
    // Insert blank card before this position if needed
    if (insertAtIndex !== null && insertAtIndex === i) {
      renderItems.push({ type: "new", displayIndex: displayIdx });
      displayIdx++;
    }
    renderItems.push({ type: "stage", stage: stages[i], displayIndex: displayIdx });
    displayIdx++;
  }
  // Insert at end
  if (insertAtIndex !== null && insertAtIndex >= stages.length) {
    renderItems.push({ type: "new", displayIndex: displayIdx });
  }

  // ── Apply overlay: show instead of normal content while apply is in progress ──
  if (applyState) {
    if (applyState.error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 py-16">
          <Warning size={24} weight="duotone" className="text-red-500" />
          <p className="mt-3 text-[14px] font-medium text-red-800">
            Failed to apply recommendations
          </p>
          <p className="mt-1 text-[13px] text-red-600">{applyState.error}</p>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Return to Recommendations to try again.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <CircleNotch size={24} weight="bold" className="animate-spin text-teal-600" />
        <p className="mt-3 text-[14px] font-medium text-foreground">
          Applying recommendations...
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {APPLY_STEP_LABELS[applyState.step] ?? "Processing..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      {stages.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {strategy?.process_speed && (
              <span className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-[12px] font-semibold text-foreground">
                {SPEED_LABELS[strategy.process_speed.recommendation] ??
                  strategy.process_speed.recommendation}
              </span>
            )}
            <TotalTimeline stages={stages} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startInsert(stages.length)}
              disabled={editingStageId !== null}
            >
              <Plus size={12} className="mr-1" />
              Add Stage
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              aria-label="Regenerate stages"
            >
              {isGenerating ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <Sparkle size={16} weight="duotone" />
              )}
            </Button>
          </div>
        </div>
      )}

      {stages.length === 0 && insertAtIndex === null ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
          <Sparkle size={24} weight="duotone" className="text-muted-foreground/40" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No interview stages yet. Generate an AI-powered process or add
            stages manually.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <CircleNotch size={16} weight="bold" className="mr-2 animate-spin" />
              ) : (
                <Sparkle size={16} weight="duotone" className="mr-2" />
              )}
              Generate Interview Process
            </Button>
            <Button
              variant="outline"
              onClick={() => startInsert(0)}
            >
              <Plus size={16} className="mr-2" />
              Add Stage
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          id="stage-blueprint-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {renderItems.map((item, ri) => {
                if (item.type === "new") {
                  const blankStage = createBlankStage(`new-${insertAtIndex}`);
                  return (
                    <div key={`new-${insertAtIndex}`} className="py-1">
                      <StageCard
                        stage={blankStage}
                        index={item.displayIndex}
                        isEditing
                        isSaving={isSaving}
                        onEdit={() => {}}
                        onDelete={() => handleCancelEdit()}
                        onSave={(payload) => handleSaveNew(payload, insertAtIndex!)}
                        onCancel={handleCancelEdit}
                      />
                    </div>
                  );
                }

                const stage = item.stage;
                const isEditingThis = editingStageId === stage.id;

                return (
                  <div key={stage.id}>
                    {/* Insert-between control BEFORE this card (except before first) */}
                    {ri > 0 && renderItems[ri - 1]?.type !== "new" && editingStageId === null && (
                      <InsertBetweenControl
                        onClick={() => {
                          // Find the actual stage index
                          const stageIdx = stages.findIndex((s) => s.id === stage.id);
                          startInsert(stageIdx);
                        }}
                      />
                    )}
                    <SortableStageCard
                      stage={stage}
                      index={item.displayIndex}
                      isEditing={isEditingThis}
                      isSaving={isSaving && isEditingThis}
                      onEdit={() => setEditingStageId(stage.id)}
                      onDelete={() => handleDelete(stage.id)}
                      onSave={(payload) => handleSaveExisting(stage.id, payload)}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                );
              })}

              {/* Insert-between control AFTER last card */}
              {insertAtIndex === null && editingStageId === null && stages.length > 0 && (
                <InsertBetweenControl
                  onClick={() => startInsert(stages.length)}
                />
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
