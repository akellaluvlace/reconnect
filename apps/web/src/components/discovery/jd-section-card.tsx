"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PencilSimple, Check, X, Plus, Trash } from "@phosphor-icons/react";

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
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setDraft(textVal);
                setIsEditing(true);
              }}
              aria-label={`Edit ${title}`}
            >
              <PencilSimple size={14} />
            </Button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={draft as string}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              autoComplete="off"
              className="text-[14px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check size={12} className="mr-1.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X size={12} className="mr-1.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {textVal || "No content yet"}
          </p>
        )}
      </div>
    );
  }

  if (type === "list") {
    const listVal = (value as string[]) ?? [];
    return (
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setDraft([...listVal]);
                setIsEditing(true);
              }}
              aria-label={`Edit ${title}`}
            >
              <PencilSimple size={14} />
            </Button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {(draft as string[]).map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const updated = [...(draft as string[])];
                    updated[i] = e.target.value;
                    setDraft(updated);
                  }}
                  autoComplete="off"
                  className="text-[14px]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 p-0"
                  onClick={() => {
                    const updated = (draft as string[]).filter(
                      (_, idx) => idx !== i,
                    );
                    setDraft(updated);
                  }}
                  aria-label="Remove item"
                >
                  <Trash size={14} className="text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft([...(draft as string[]), ""])}
            >
              <Plus size={12} className="mr-1.5" /> Add item
            </Button>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave}>
                <Check size={12} className="mr-1.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X size={12} className="mr-1.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {listVal.length > 0 ? (
              listVal.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                  {item}
                </li>
              ))
            ) : (
              <li className="text-[14px] text-muted-foreground">No items yet</li>
            )}
          </ul>
        )}
      </div>
    );
  }

  // salary
  const salaryVal = (value as { min: number; max: number; currency: string }) ?? {
    min: 0,
    max: 0,
    currency: "EUR",
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDraft({ ...salaryVal });
              setIsEditing(true);
            }}
            aria-label={`Edit ${title}`}
          >
            <PencilSimple size={14} />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Min</label>
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
                className="text-[14px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Max</label>
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
                className="text-[14px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Currency</label>
              <Input
                value={(draft as { currency: string }).currency}
                onChange={(e) =>
                  setDraft({
                    ...(draft as { min: number; max: number; currency: string }),
                    currency: e.target.value,
                  })
                }
                autoComplete="off"
                className="text-[14px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Check className="mr-1.5 h-3 w-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="mr-1.5 h-3 w-3" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[20px] font-bold tabular-nums tracking-tight">
          {salaryVal.min > 0
            ? `${salaryVal.currency} ${salaryVal.min.toLocaleString()} – ${salaryVal.max.toLocaleString()}`
            : "Not set"}
        </p>
      )}
    </div>
  );
}
