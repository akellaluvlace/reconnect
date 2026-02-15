import { create } from "zustand";

interface PlaybookDraft {
  step: number;
  basicInfo: { title: string; department: string };
  roleDetails: { level: string; skills: string[]; industry: string };
  generatedContent: {
    jobDescription?: unknown;
    marketInsights?: unknown;
    interviewStages?: unknown[];
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

const initialDraft: PlaybookDraft = {
  step: 1,
  basicInfo: { title: "", department: "" },
  roleDetails: { level: "", skills: [], industry: "" },
  generatedContent: {},
};

export const usePlaybookStore = create<PlaybookStore>((set) => ({
  draft: initialDraft,
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
  resetDraft: () => set({ draft: initialDraft }),
}));
