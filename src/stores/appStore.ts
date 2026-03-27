import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  themeMode: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleThemeMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  themeMode: (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setThemeMode: (mode) => {
    localStorage.setItem('themeMode', mode);
    set({ themeMode: mode });
  },
  toggleThemeMode: () =>
    set((s) => {
      const next = s.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return { themeMode: next };
    }),
}));
