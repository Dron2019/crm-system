import { create } from 'zustand';

export interface ChessboardApartment {
  id: string;
  number: string;
  floor: number;
  section_id?: string | null;
  rooms: number;
  area: number;
  price: number;
  status_name: string;
  status_color: string;
}

export interface ChessboardFilters {
  floors: number[];
  rooms: number[];
  status: string[];
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
}

const defaultFilters: ChessboardFilters = {
  floors: [],
  rooms: [],
  status: [],
};

interface ChessboardState {
  filters: ChessboardFilters;
  drawerOpen: boolean;
  selectedApartment: ChessboardApartment | null;
  setDrawerOpen: (open: boolean) => void;
  setSelectedApartment: (apartment: ChessboardApartment | null) => void;
  setFilters: (next: ChessboardFilters) => void;
  resetFilters: () => void;
  resetAll: () => void;
}

export const useChessboardStore = create<ChessboardState>((set) => ({
  filters: defaultFilters,
  drawerOpen: false,
  selectedApartment: null,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setSelectedApartment: (apartment) => set({ selectedApartment: apartment }),
  setFilters: (next) => set({ filters: next }),
  resetFilters: () => set({ filters: defaultFilters }),
  resetAll: () => set({ filters: defaultFilters, drawerOpen: false, selectedApartment: null }),
}));
