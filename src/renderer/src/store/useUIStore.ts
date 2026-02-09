import { create } from 'zustand';

type ToastPayload = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastState = ToastPayload & {
  id: string;
};

interface UIState {
  isSidebarCollapsed: boolean;
  isSidebarHidden: boolean;
  toast: ToastState | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHidden: (hidden: boolean) => void;
  toggleSidebar: () => void;
  showToast: (payload: ToastPayload) => void;
  hideToast: (toastId?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isSidebarHidden: false,
  toast: null,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setSidebarHidden: (hidden) => set({ isSidebarHidden: hidden }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  showToast: (payload) =>
    set({
      toast: {
        id: crypto.randomUUID(),
        ...payload
      }
    }),
  hideToast: (toastId) =>
    set((state) => {
      if (!state.toast) return state;
      if (toastId && state.toast.id !== toastId) return state;
      return { toast: null };
    })
}));
