import { create } from 'zustand';

export const useAppStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  notifications: 4,
}));
