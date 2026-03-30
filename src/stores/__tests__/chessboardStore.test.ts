import { describe, it, expect, beforeEach } from 'vitest';
import { useChessboardStore, type ChessboardApartment } from '@/stores/chessboardStore';

const apartmentFixture: ChessboardApartment = {
  id: 'apt-1',
  number: 'A-101',
  floor: 10,
  rooms: 2,
  area: 67.5,
  price: 84500,
  status_name: 'Вільно',
  status_color: '#2196F3',
};

describe('useChessboardStore transitions', () => {
  beforeEach(() => {
    useChessboardStore.getState().resetAll();
  });

  it('applies filters and resets filters only', () => {
    useChessboardStore.getState().setDrawerOpen(true);
    useChessboardStore.getState().setSelectedApartment(apartmentFixture);
    useChessboardStore.getState().setFilters({
      floors: [8, 9, 10],
      rooms: [2],
      status: ['free'],
    });

    useChessboardStore.getState().resetFilters();
    const state = useChessboardStore.getState();

    expect(state.filters).toEqual({ floors: [], rooms: [], status: [] });
    expect(state.drawerOpen).toBe(true);
    expect(state.selectedApartment?.id).toBe('apt-1');
  });

  it('resets all state slices', () => {
    useChessboardStore.getState().setDrawerOpen(true);
    useChessboardStore.getState().setSelectedApartment(apartmentFixture);
    useChessboardStore.getState().setFilters({
      floors: [10],
      rooms: [2],
      status: ['free'],
      price_min: 40000,
      price_max: 100000,
    });

    useChessboardStore.getState().resetAll();
    const state = useChessboardStore.getState();

    expect(state.filters).toEqual({ floors: [], rooms: [], status: [] });
    expect(state.drawerOpen).toBe(false);
    expect(state.selectedApartment).toBeNull();
  });
});
