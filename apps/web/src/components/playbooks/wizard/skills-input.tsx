"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "@phosphor-icons/react";

interface SkillsInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
  maxLength?: number;
  suggestions?: string[];
}

export function SkillsInput({
  value,
  onChange,
  maxSkills = 15,
  maxLength = 50,
  suggestions,
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredSuggestions =
    suggestions && inputValue.trim().length > 0
      ? suggestions.filter(
          (s) =>
            s.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
            !value.some((v) => v.toLowerCase() === s.toLowerCase()),
        )
      : [];


  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    if (skill.length > maxLength) return;
    if (value.length >= maxSkills) return;
    if (value.some((s) => s.toLowerCase() === skill.toLowerCase())) return;

    onChange([...value, skill]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeSkill = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        addSkill(filteredSuggestions[highlightedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeSkill(value.length - 1);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHighlightedIndex(-1);
    if (suggestions && e.target.value.trim().length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const handleBlur = () => {
    // Delay closing so suggestion clicks can register
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      addSkill(inputValue);
    }, 150);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (suggestions && inputValue.trim().length > 0) {
      setShowSuggestions(true);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative space-y-2">
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
              <X size={12} />
            </button>
          </Badge>
        ))}
        {value.length < maxSkills && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={value.length === 0 ? "Type a skill and press Enter" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            aria-label="Add a skill"
            maxLength={maxLength}
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filteredSuggestions.slice(0, 10).map((suggestion, idx) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={idx === highlightedIndex}
              className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${
                idx === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur from firing before click
                addSkill(suggestion);
                inputRef.current?.focus();
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{maxSkills} skills. Press Enter or comma to add.
      </p>
    </div>
  );
}
