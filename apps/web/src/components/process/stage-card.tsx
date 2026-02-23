"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DotsSixVertical,
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  ChatCenteredText,
} from "@phosphor-icons/react";
import type { FocusArea, SuggestedQuestion } from "@reconnect/database";
import type { StageData } from "./process-page-client";

interface StageCardProps {
  stage: StageData;
  index: number;
  dragHandleProps?: Record<string, unknown>;
  onEdit: () => void;
  onDelete: () => void;
}

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
  onEdit,
  onDelete,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const focusAreas = (stage.focus_areas ?? []) as FocusArea[];
  const questions = (stage.suggested_questions ?? []) as SuggestedQuestion[];

  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="cursor-grab text-muted-foreground hover:text-foreground"
            {...dragHandleProps}
          >
            <DotsSixVertical size={20} weight="duotone" />
          </div>

          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-bold text-teal-700">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold tracking-tight truncate">
                {stage.name}
              </h3>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  TYPE_COLORS[stage.type] ?? TYPE_COLORS.custom
                }`}
              >
                {stage.type}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {stage.duration_minutes}min
              </span>
            </div>
            {stage.rationale && (
              <p className="mt-0.5 text-[12px] italic text-muted-foreground truncate">
                {stage.rationale as string}
              </p>
            )}
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
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete stage"
            >
              <Trash size={14} />
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

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
            {stage.description && (
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {stage.description}
              </p>
            )}

            {/* Focus Areas */}
            {focusAreas.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[13px] font-semibold text-foreground">Focus Areas</h4>
                {focusAreas.map((fa, i) => {
                  const faQuestions = questions.filter(
                    (q) => q.focus_area === fa.name,
                  );
                  return (
                    <div key={i} className="rounded-lg border border-border/40 bg-muted/30 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">{fa.name}</span>
                        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Weight: {fa.weight}/4
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {fa.description}
                      </p>
                      {fa.rationale && (
                        <p className="mt-0.5 text-[12px] italic text-muted-foreground">
                          {fa.rationale}
                        </p>
                      )}

                      {/* Questions for this focus area */}
                      {faQuestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {faQuestions.map((q, qi) => (
                            <div
                              key={qi}
                              className="flex items-start gap-2 border-l-2 border-teal-200 pl-3"
                            >
                              <ChatCenteredText size={12} weight="duotone" className="mt-0.5 shrink-0 text-teal-500" />
                              <div>
                                <p className="text-[12px] text-foreground">{q.question}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Purpose: {q.purpose}
                                </p>
                                {q.look_for.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {q.look_for.map((lf, li) => (
                                      <span
                                        key={li}
                                        className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                      >
                                        {lf}
                                      </span>
                                    ))}
                                  </div>
                                )}
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
    </div>
  );
}
