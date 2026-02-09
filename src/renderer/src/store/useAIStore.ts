
import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

interface AIState {
  summaries: Record<string, string>; // date (YYYY-MM-DD) -> summary
  longTermMemory: string;
  isGenerating: boolean;
  
  saveSummary: (date: string, content: string) => void;
  updateLongTermMemory: (memory: string) => void;
  setGenerating: (isGenerating: boolean) => void;
  getSummary: (date: string) => string | undefined;
}

export const useAIStore = create<AIState>((set, get) => ({
  summaries: StorageService.get<Record<string, string>>('ai_summaries', {}),
  longTermMemory: StorageService.get<string>('ai_long_term_memory', ''),
  isGenerating: false,

  saveSummary: (date, content) =>
    set((state) => {
      const newSummaries = { ...state.summaries, [date]: content };
      StorageService.set('ai_summaries', newSummaries);
      return { summaries: newSummaries };
    }),

  updateLongTermMemory: (memory) =>
    set(() => {
      StorageService.set('ai_long_term_memory', memory);
      return { longTermMemory: memory };
    }),

  setGenerating: (isGenerating) => set({ isGenerating }),
  
  getSummary: (date) => get().summaries[date]
}));
