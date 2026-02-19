"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
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
  screening: "bg-blue-100 text-blue-800",
  technical: "bg-purple-100 text-purple-800",
  behavioral: "bg-amber-100 text-amber-800",
  cultural: "bg-green-100 text-green-800",
  final: "bg-red-100 text-red-800",
  custom: "bg-gray-100 text-gray-800",
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
    <Card className="relative">
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="cursor-grab text-muted-foreground hover:text-foreground"
            {...dragHandleProps}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{stage.name}</h3>
              <Badge
                className={
                  TYPE_COLORS[stage.type] ?? TYPE_COLORS.custom
                }
              >
                {stage.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stage.duration_minutes}min
              </span>
            </div>
            {stage.rationale && (
              <p className="mt-0.5 text-xs italic text-muted-foreground truncate">
                {stage.rationale as string}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label="Edit stage"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Delete stage"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {stage.description && (
              <p className="text-sm text-muted-foreground">
                {stage.description}
              </p>
            )}

            {/* Focus Areas */}
            {focusAreas.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Focus Areas</h4>
                {focusAreas.map((fa, i) => {
                  const faQuestions = questions.filter(
                    (q) => q.focus_area === fa.name,
                  );
                  return (
                    <div key={i} className="rounded-md bg-muted/50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{fa.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Weight: {fa.weight}/4
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fa.description}
                      </p>
                      {fa.rationale && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          {fa.rationale}
                        </p>
                      )}

                      {/* Questions for this focus area */}
                      {faQuestions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {faQuestions.map((q, qi) => (
                            <div
                              key={qi}
                              className="flex items-start gap-2 pl-2 border-l-2 border-muted"
                            >
                              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                              <div>
                                <p className="text-xs">{q.question}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Purpose: {q.purpose}
                                </p>
                                {q.look_for.length > 0 && (
                                  <div className="mt-0.5 flex flex-wrap gap-1">
                                    {q.look_for.map((lf, li) => (
                                      <Badge
                                        key={li}
                                        variant="secondary"
                                        className="text-[10px] px-1 py-0"
                                      >
                                        {lf}
                                      </Badge>
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
      </CardContent>
    </Card>
  );
}
