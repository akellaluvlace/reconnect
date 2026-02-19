import { create } from "zustand";
import type { JobDescription, MarketInsights, FocusArea, SuggestedQuestion } from "@reconnect/database";

interface GeneratedStage {
  name: string;
  type?: string;
  duration_minutes?: number;
  description?: string;
  focus_areas: FocusArea[];
  suggested_questions: SuggestedQuestion[];
}

interface PlaybookDraft {
  step: number;
  basicInfo: { title: string; department: string };
  roleDetails: { level: string; skills: string[]; industry: string; location: string };
  generatedContent: {
    jobDescription?: JobDescription;
    marketInsights?: MarketInsights;
    interviewStages?: GeneratedStage[];
  };
}

interface PlaybookStore {
  draft: PlaybookDraft;
  setStep: (step: number) => void;
  updateBasicInfo: (info: Partial<PlaybookDraft["basicInfo"]>) => void;
  updateRoleDetails: (details: Partial<PlaybookDraft["roleDetails"]>) => void;
  setGeneratedContent: (
    content: Partial<PlaybookDraft["generatedContent"]>
  ) => void;
  resetDraft: () => void;
}

function createInitialDraft(): PlaybookDraft {
  return {
    step: 1,
    basicInfo: { title: "", department: "" },
    roleDetails: { level: "", skills: [], industry: "", location: "" },
    generatedContent: {},
  };
}

export const usePlaybookStore = create<PlaybookStore>((set) => ({
  draft: createInitialDraft(),
  setStep: (step) => set((state) => ({ draft: { ...state.draft, step } })),
  updateBasicInfo: (info) =>
    set((state) => ({
      draft: {
        ...state.draft,
        basicInfo: { ...state.draft.basicInfo, ...info },
      },
    })),
  updateRoleDetails: (details) =>
    set((state) => ({
      draft: {
        ...state.draft,
        roleDetails: { ...state.draft.roleDetails, ...details },
      },
    })),
  setGeneratedContent: (content) =>
    set((state) => ({
      draft: {
        ...state.draft,
        generatedContent: { ...state.draft.generatedContent, ...content },
      },
    })),
  resetDraft: () => set({ draft: createInitialDraft() }),
}));
