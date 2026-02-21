"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Clock } from "lucide-react";

interface StageInfo {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  order_index: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  screening: { label: "Screening", color: "bg-blue-100 text-blue-800" },
  technical: { label: "Technical", color: "bg-purple-100 text-purple-800" },
  behavioral: { label: "Behavioral", color: "bg-green-100 text-green-800" },
  case_study: { label: "Case Study", color: "bg-orange-100 text-orange-800" },
  panel: { label: "Panel", color: "bg-red-100 text-red-800" },
  custom: { label: "Custom", color: "bg-gray-100 text-gray-800" },
};

export function ProcessSummary({ stages }: { stages: StageInfo[] }) {
  const totalMinutes = stages.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5" />
          Process Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stages defined yet. Configure your interview process in the
            Process tab.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                {stages.length} stage{stages.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {totalHours > 0 && `${totalHours}h `}
                {remainingMinutes}m total
              </span>
            </div>

            <div className="relative space-y-0">
              {stages.map((stage, i) => {
                const typeInfo = TYPE_LABELS[stage.type] ?? TYPE_LABELS.custom;
                return (
                  <div key={stage.id} className="flex items-start gap-3">
                    {/* Vertical timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      {i < stages.length - 1 && (
                        <div className="w-px flex-1 bg-border min-h-[2rem]" />
                      )}
                    </div>

                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{stage.name}</p>
                        <Badge
                          className={`${typeInfo.color} text-xs`}
                          variant="secondary"
                        >
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stage.duration_minutes} minutes
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
