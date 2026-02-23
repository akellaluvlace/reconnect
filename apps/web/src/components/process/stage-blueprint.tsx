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
import { StageCard } from "./stage-card";
import { TotalTimeline } from "./total-timeline";
import { StageEditDialog } from "./stage-edit-dialog";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { StageData } from "./process-page-client";

interface StageBlueprintProps {
  playbookId: string;
  stages: StageData[];
  onStagesChange: (stages: StageData[]) => void;
  strategy: HiringStrategy | null;
  jd: JobDescription | null;
  role: string;
  level: string;
  industry: string;
}

const SPEED_LABELS: Record<string, string> = {
  fast_track: "Fast Track",
  standard: "Standard",
  thorough: "Thorough",
};

function SortableStageCard({
  stage,
  index,
  onEdit,
  onDelete,
}: {
  stage: StageData;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StageCard
        stage={stage}
        index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export function StageBlueprint({
  playbookId,
  stages,
  onStagesChange,
  strategy,
  jd,
  role,
  level,
  industry,
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

  const [editingStage, setEditingStage] = useState<StageData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleGenerate() {
    // Capture current stages for deletion inside the closure
    const currentStages = stages;

    useAIGenerationStore.getState().startOperation(opKey, async () => {
      // Delete existing stages first if regenerating
      if (currentStages.length > 0) {
        const deleteResults = await Promise.allSettled(
          currentStages.map((s) =>
            fetch(`/api/playbooks/${playbookId}/stages/${s.id}`, {
              method: "DELETE",
            }),
          ),
        );
        const failures = deleteResults.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.warn("[blueprint] Some stage deletions failed:", failures.length);
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
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate stages");
      }

      const { data } = await aiRes.json();
      const generatedStages = data.stages;

      // Bulk create via API
      const createRes = await fetch(
        `/api/playbooks/${playbookId}/stages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generatedStages),
        },
      );

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

    // Optimistic reorder
    const updated = [...stages];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const reindexed = updated.map((s, i) => ({ ...s, order_index: i }));
    onStagesChange(reindexed);

    // Persist
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

      if (!res.ok || res.status === 207) {
        throw new Error("Reorder failed");
      }
    } catch {
      // Revert on failure
      onStagesChange(stages);
      toast.error("Failed to reorder stages");
    }
  }

  async function handleDelete(stageId: string) {
    const prev = [...stages];
    onStagesChange(stages.filter((s) => s.id !== stageId));

    try {
      const res = await fetch(
        `/api/playbooks/${playbookId}/stages/${stageId}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Delete failed");
    } catch {
      onStagesChange(prev);
      toast.error("Failed to delete stage");
    }
  }

  function handleStageSaved(saved: StageData) {
    if (stages.some((s) => s.id === saved.id)) {
      onStagesChange(stages.map((s) => (s.id === saved.id ? saved : s)));
    } else {
      onStagesChange([...stages, saved]);
    }
    setIsDialogOpen(false);
    setEditingStage(null);
  }

  return (
    <div className="space-y-4">
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
              onClick={() => {
                setEditingStage(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
          <Sparkles className="h-6 w-6 text-muted-foreground/40" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            No interview stages yet. Generate an AI-powered process or add
            stages manually.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Interview Process
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingStage(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {stages.map((stage, i) => (
                <SortableStageCard
                  key={stage.id}
                  stage={stage}
                  index={i}
                  onEdit={() => {
                    setEditingStage(stage);
                    setIsDialogOpen(true);
                  }}
                  onDelete={() => handleDelete(stage.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <StageEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        playbookId={playbookId}
        stage={editingStage}
        onSave={handleStageSaved}
      />
    </div>
  );
}
