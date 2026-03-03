"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoleSuggestion {
  role: string;
  cached: boolean;
}

interface RoleSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Autocomplete input for role/title that shows suggestions from previously
 * researched roles (cache) and existing playbooks. Picking a cached role
 * gives an instant cache hit on market research instead of a fresh AI call.
 */
export function RoleSuggestInput({
  value,
  onChange,
  placeholder = "e.g., Senior Software Engineer",
  className,
}: RoleSuggestInputProps) {
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions with 300ms debounce
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/playbooks/role-suggestions?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        const items: RoleSuggestion[] = data.suggestions ?? [];
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setHighlightIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, []);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    fetchSuggestions(newValue);
  };

  const handleSelect = (suggestion: RoleSuggestion) => {
    onChange(suggestion.role);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="role-suggestions-list"
        className={className}
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          id="role-suggestions-list"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.role}-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm",
                i === highlightIndex && "bg-accent text-accent-foreground",
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onMouseDown={(e) => {
                // Prevent input blur before selection
                e.preventDefault();
                handleSelect(s);
              }}
            >
              <span className="truncate">{s.role}</span>
              {s.cached && (
                <Badge
                  variant="secondary"
                  className="ml-2 shrink-0 text-[10px] px-1.5 py-0"
                >
                  Cached
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
