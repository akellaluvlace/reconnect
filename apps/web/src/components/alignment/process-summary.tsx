"use client";

import { useState } from "react";
import type { CoverageAnalysis } from "@reconnect/database";
import { Clock, CaretDown, CaretRight, ArrowSquareOut, ShieldCheck, Eye } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { StageInfo, CollaboratorData } from "./alignment-page-client";
import Link from "next/link";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  screening: { label: "Screening", color: "border-blue-200 bg-blue-50 text-blue-800" },
  technical: { label: "Technical", color: "border-purple-200 bg-purple-50 text-purple-800" },
  behavioral: { label: "Behavioral", color: "border-green-200 bg-green-50 text-green-800" },
  case_study: { label: "Case Study", color: "border-orange-200 bg-orange-50 text-orange-800" },
  panel: { label: "Panel", color: "border-red-200 bg-red-50 text-red-800" },
  custom: { label: "Custom", color: "border-border/60 bg-muted/40 text-foreground" },
};

const WEIGHT_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};

interface ProcessSummaryProps {
  stages: StageInfo[];
  coverageAnalysis: CoverageAnalysis | null;
  collaborators: CollaboratorData[];
  playbookId: string;
}

export function ProcessSummary({
  stages,
  coverageAnalysis,
  collaborators,
  playbookId,
}: ProcessSummaryProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [previewStage, setPreviewStage] = useState<string | null>(null);

  const totalMinutes = stages.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  function getCollaboratorsForStage(stageId: string) {
    return collaborators.filter(
      (c) => !c.assigned_stages || c.assigned_stages.length === 0 || c.assigned_stages.includes(stageId),
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
        <p className="text-[14px] text-muted-foreground">
          No stages defined yet. Configure your interview process in the
          Process tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-border/40 bg-card p-5 shadow-sm text-center">
          <p className="text-[28px] font-bold tabular-nums tracking-tight">
            {stages.length}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Stage{stages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-border/40 bg-card p-5 shadow-sm text-center">
          <p className="text-[28px] font-bold tabular-nums tracking-tight">
            {totalHours > 0 && `${totalHours}h `}{remainingMinutes}m
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Total duration</p>
        </div>
        {coverageAnalysis && (
          <div className="flex-1 rounded-xl border border-border/40 bg-card p-5 shadow-sm text-center">
            <p className={cn(
              "text-[28px] font-bold tabular-nums tracking-tight",
              coverageAnalysis.overall_coverage_score >= 80
                ? "text-green-600"
                : coverageAnalysis.overall_coverage_score >= 60
                  ? "text-amber-600"
                  : "text-red-600",
            )}>
              {coverageAnalysis.overall_coverage_score}%
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Coverage</p>
          </div>
        )}
      </div>

      {/* Edit in Process link */}
      <div className="flex justify-end">
        <Link
          href={`/playbooks/${playbookId}/process`}
          className="flex items-center gap-1.5 text-[13px] font-medium text-teal-700 hover:text-teal-800 transition-colors"
        >
          Edit in Process
          <ArrowSquareOut size={14} weight="duotone" />
        </Link>
      </div>

      {/* Expandable stage cards */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const typeInfo = TYPE_LABELS[stage.type] ?? TYPE_LABELS.custom;
          const expanded = expandedStage === stage.id;
          const stageCollaborators = getCollaboratorsForStage(stage.id);
          const hasFocusAreas = stage.focus_areas && stage.focus_areas.length > 0;

          return (
            <div
              key={stage.id}
              className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden"
            >
              {/* Stage header — always visible */}
              <button
                onClick={() => setExpandedStage(expanded ? null : stage.id)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
              >
                {expanded ? (
                  <CaretDown size={14} weight="bold" className="text-muted-foreground shrink-0" />
                ) : (
                  <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-foreground">{stage.name}</p>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock size={12} weight="duotone" />
                    {stage.duration_minutes} min
                    {hasFocusAreas && (
                      <span className="ml-2">
                        · {stage.focus_areas!.length} focus area{stage.focus_areas!.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>

                {/* Collaborator indicators */}
                {stageCollaborators.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {stageCollaborators.slice(0, 3).map((c) => (
                      <span
                        key={c.id}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-800"
                        title={c.name || c.email}
                      >
                        {(c.name || c.email).charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {stageCollaborators.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{stageCollaborators.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded content */}
              {expanded && hasFocusAreas && (
                <div className="border-t border-border/30 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  {stage.focus_areas!.map((fa, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <ShieldCheck size={14} weight="duotone" className="mt-0.5 shrink-0 text-teal-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-foreground">{fa.name}</p>
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            fa.weight >= 3
                              ? "bg-red-50 text-red-700"
                              : "bg-muted text-muted-foreground",
                          )}>
                            {WEIGHT_LABELS[fa.weight] ?? `W${fa.weight}`}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                          {fa.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Scorecard preview toggle */}
                  <div className="pt-2 border-t border-border/20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewStage(previewStage === stage.id ? null : stage.id);
                      }}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      <Eye size={14} weight="duotone" />
                      {previewStage === stage.id ? "Hide scorecard" : "Preview interviewer scorecard"}
                    </button>

                    {previewStage === stage.id && (
                      <div className="mt-3 rounded-lg border border-teal-200 bg-gradient-to-b from-teal-50/40 to-white p-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-teal-700">
                          Interviewer view — {stage.name}
                        </p>

                        {/* Focus areas with questions */}
                        {stage.focus_areas!.map((fa, fi) => {
                          const faQuestions = (stage.questions ?? []).filter(
                            (q) => q.focus_area === fa.name,
                          );
                          return (
                            <div key={fi} className="space-y-2">
                              <p className="text-[13px] font-semibold text-foreground">{fa.name}</p>
                              {faQuestions.length > 0 ? (
                                <ul className="space-y-1.5 pl-4">
                                  {faQuestions.map((q, qi) => (
                                    <li key={qi} className="text-[12px] text-muted-foreground list-disc">
                                      {q.question}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[12px] text-muted-foreground/60 italic">No questions assigned</p>
                              )}

                              {/* Rating mock */}
                              <div className="flex items-center gap-3 pl-4">
                                <span className="text-[11px] text-muted-foreground">Rating:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4].map((n) => (
                                    <span
                                      key={n}
                                      className="flex h-6 w-6 items-center justify-center rounded border border-border/60 bg-muted/30 text-[10px] text-muted-foreground"
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
