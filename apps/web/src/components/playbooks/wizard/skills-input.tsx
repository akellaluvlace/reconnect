"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SkillsInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
  maxLength?: number;
}

export function SkillsInput({
  value,
  onChange,
  maxSkills = 15,
  maxLength = 50,
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    if (skill.length > maxLength) return;
    if (value.length >= maxSkills) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) return;

    onChange([...value, skill]);
    setInputValue("");
  };

  const removeSkill = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeSkill(value.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-1.5 min-h-[2.5rem] rounded-md border border-input bg-transparent px-3 py-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((skill, i) => (
          <Badge key={skill} variant="secondary" className="gap-1">
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              onClick={(e) => {
                e.stopPropagation();
                removeSkill(i);
              }}
              className="hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length < maxSkills && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addSkill(inputValue)}
            placeholder={value.length === 0 ? "Type a skill and press Enter" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            aria-label="Add a skill"
            maxLength={maxLength}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxSkills} skills. Press Enter or comma to add.
      </p>
    </div>
  );
}
