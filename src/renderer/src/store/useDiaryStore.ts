import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

export type DiaryType = 'note' | 'learning' | 'review';

export type DiaryEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: DiaryType;
  title?: string;
  content: string;
  mood?: string; // Flexible for emojis
  tags?: string[];
  linkedTaskId?: string;
  images?: string[];
  // Template specific data
  structuredContent?: {
    // For Note
    trigger?: string;
    desire?: string;
    // For Learning
    keyPoints?: string[];
    example?: string;
    nextStep?: string;
    // For Review
    achievements?: string[];
    challenges?: string[];
    nextWeekPlan?: string[];
  };
  createdAt: number;
  updatedAt: number;
};

const DIARY_KEY = 'diary_entries';

const sortEntries = (entries: DiaryEntry[]) =>
  [...entries].sort((a, b) => {
    if (a.date === b.date) {
      return b.updatedAt - a.updatedAt;
    }
    return b.date.localeCompare(a.date);
  });

interface DiaryState {
  entries: DiaryEntry[];
  selectedEntryId: string | null;
  setSelectedEntryId: (id: string | null) => void;
  createEntry: (payload: Partial<DiaryEntry> & { date: string }) => DiaryEntry;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string) => void;
  ensureTodayEntry: () => DiaryEntry;
}

const initialEntries: DiaryEntry[] = StorageService.get(DIARY_KEY, []);

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: sortEntries(initialEntries),
  selectedEntryId: initialEntries[0]?.id ?? null,

  setSelectedEntryId: (id) => set({ selectedEntryId: id }),

  createEntry: (payload) => {
      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        date: payload.date,
        type: (typeof payload.type === 'string' ? payload.type : 'note'),
        title: payload.title || '',
      content: payload.content || '',
      mood: payload.mood,
      tags: payload.tags || [],
      linkedTaskId: payload.linkedTaskId,
      images: payload.images || [],
      structuredContent: payload.structuredContent,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    set((state) => {
      const entries = sortEntries([entry, ...state.entries]);
      StorageService.set(DIARY_KEY, entries);
      return { entries, selectedEntryId: entry.id };
    });
    return entry;
  },

  updateEntry: (id, updates) =>
    set((state) => {
      const entries = state.entries.map((entry) =>
        entry.id === id ? { ...entry, ...updates, updatedAt: Date.now() } : entry
      );
      const sorted = sortEntries(entries);
      StorageService.set(DIARY_KEY, sorted);
      return { entries: sorted };
    }),

  deleteEntry: (id) =>
    set((state) => {
      const entries = state.entries.filter((entry) => entry.id !== id);
      StorageService.set(DIARY_KEY, entries);
      const selectedEntryId =
        state.selectedEntryId === id ? entries[0]?.id ?? null : state.selectedEntryId;
      return { entries, selectedEntryId };
    }),

  ensureTodayEntry: () => {
    const today = new Date().toISOString().split('T')[0];
    const existing = get().entries.find((entry) => entry.date === today);
    if (existing) {
      set({ selectedEntryId: existing.id });
      return existing;
    }
    const newEntryPayload: Partial<DiaryEntry> & { date: string } = {
      date: today,
      content: '',
      title: ''
    };
    const entry = get().createEntry(newEntryPayload);
    set({ selectedEntryId: entry.id });
    return entry;
  }
}));
