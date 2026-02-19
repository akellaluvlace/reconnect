"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UseAutoSaveOptions {
  /** Save function that performs the actual persistence */
  onSave: (data: unknown) => Promise<void>;
  /** Debounce delay in ms (default: 500 for text, use 0 for discrete actions) */
  delay?: number;
  /** Toast message on failure (default: "Failed to save changes") */
  errorMessage?: string;
}

interface UseAutoSaveReturn {
  /** Trigger a debounced save */
  save: (data: unknown) => void;
  /** Trigger an immediate save (for discrete actions like toggles, selects) */
  saveImmediate: (data: unknown) => Promise<void>;
  /** Whether a save is currently in flight */
  isSaving: boolean;
}

export function useAutoSave({
  onSave,
  delay = 500,
  errorMessage = "Failed to save changes",
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const doSave = useCallback(
    async (data: unknown) => {
      setIsSaving(true);
      try {
        await onSave(data);
      } catch (err) {
        console.error("[auto-save] Save failed:", err);
        toast.error(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [onSave, errorMessage],
  );

  const save = useCallback(
    (data: unknown) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        doSave(data);
      }, delay);
    },
    [doSave, delay],
  );

  const saveImmediate = useCallback(
    async (data: unknown) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      await doSave(data);
    },
    [doSave],
  );

  return {
    save,
    saveImmediate,
    isSaving,
  };
}
