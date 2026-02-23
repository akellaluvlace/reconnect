import { create } from "zustand";

type OperationStatus = "idle" | "loading" | "success" | "error";

interface AIOperation {
  status: OperationStatus;
  result: unknown;
  error: string | null;
}

export const IDLE_OP: AIOperation = { status: "idle", result: null, error: null };

interface AIGenerationStore {
  operations: Record<string, AIOperation>;
  startOperation: (key: string, fn: () => Promise<unknown>) => void;
  getOperation: (key: string) => AIOperation;
  clearOperation: (key: string) => void;
}

export const useAIGenerationStore = create<AIGenerationStore>((set, get) => ({
  operations: {},

  startOperation: (key, fn) => {
    // Guard against double-invocation (e.g., fast double-click before React re-renders)
    if (get().operations[key]?.status === "loading") return;

    set((s) => ({
      operations: {
        ...s.operations,
        [key]: { status: "loading", result: null, error: null },
      },
    }));

    fn()
      .then((result) => {
        set((s) => ({
          operations: {
            ...s.operations,
            [key]: { status: "success", result, error: null },
          },
        }));
      })
      .catch((err) => {
        set((s) => ({
          operations: {
            ...s.operations,
            [key]: {
              status: "error",
              result: null,
              error: err instanceof Error ? err.message : "Operation failed",
            },
          },
        }));
      });
  },

  getOperation: (key) => get().operations[key] ?? IDLE_OP,

  clearOperation: (key) => {
    set((s) => {
      const { [key]: _, ...rest } = s.operations;
      return { operations: rest };
    });
  },
}));
