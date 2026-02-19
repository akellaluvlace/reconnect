"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AIIndicatorBadge } from "@/components/ai/ai-indicator-badge";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";

interface JDSectionCardProps {
  title: string;
  type: "text" | "list" | "salary";
  value: string | string[] | { min: number; max: number; currency: string } | undefined;
  onChange: (value: unknown) => void;
}

export function JDSectionCard({
  title,
  type,
  value,
  onChange,
}: JDSectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  function handleSave() {
    onChange(draft);
    setIsEditing(false);
  }

  function handleCancel() {
    setDraft(value);
    setIsEditing(false);
  }

  if (type === "text") {
    const textVal = (value as string) ?? "";
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{title}</p>
            <div className="flex items-center gap-1">
              <AIIndicatorBadge />
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(textVal);
                    setIsEditing(true);
                  }}
                  aria-label={`Edit ${title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft as string}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoComplete="off"
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave}>
                  <Check className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {textVal || "No content yet"}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (type === "list") {
    const listVal = (value as string[]) ?? [];
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{title}</p>
            <div className="flex items-center gap-1">
              <AIIndicatorBadge />
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft([...listVal]);
                    setIsEditing(true);
                  }}
                  aria-label={`Edit ${title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2">
              {(draft as string[]).map((item, i) => (
                <div key={i} className="flex gap-1">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const updated = [...(draft as string[])];
                      updated[i] = e.target.value;
                      setDraft(updated);
                    }}
                    autoComplete="off"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = (draft as string[]).filter(
                        (_, idx) => idx !== i,
                      );
                      setDraft(updated);
                    }}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft([...(draft as string[]), ""])}
              >
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave}>
                  <Check className="mr-1 h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <ul className="mt-1 space-y-1">
              {listVal.length > 0 ? (
                listVal.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    {item}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No items yet</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  // salary
  const salaryVal = (value as { min: number; max: number; currency: string }) ?? {
    min: 0,
    max: 0,
    currency: "EUR",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{title}</p>
          <div className="flex items-center gap-1">
            <AIIndicatorBadge />
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft({ ...salaryVal });
                  setIsEditing(true);
                }}
                aria-label={`Edit ${title}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Min</label>
                <Input
                  type="number"
                  value={(draft as { min: number }).min}
                  onChange={(e) =>
                    setDraft({
                      ...(draft as { min: number; max: number; currency: string }),
                      min: parseInt(e.target.value) || 0,
                    })
                  }
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max</label>
                <Input
                  type="number"
                  value={(draft as { max: number }).max}
                  onChange={(e) =>
                    setDraft({
                      ...(draft as { min: number; max: number; currency: string }),
                      max: parseInt(e.target.value) || 0,
                    })
                  }
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <Input
                  value={(draft as { currency: string }).currency}
                  onChange={(e) =>
                    setDraft({
                      ...(draft as { min: number; max: number; currency: string }),
                      currency: e.target.value,
                    })
                  }
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" onClick={handleSave}>
                <Check className="mr-1 h-3 w-3" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {salaryVal.min > 0
              ? `${salaryVal.currency} ${salaryVal.min.toLocaleString()} – ${salaryVal.max.toLocaleString()}`
              : "Not set"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
