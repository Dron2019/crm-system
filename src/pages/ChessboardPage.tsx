import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Drawer,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ApartmentImportExportDialog from '@/components/ApartmentImportExportDialog';
import ChessboardGrid from '@/components/ChessboardGrid';
import ApartmentDetailsPanel from '@/components/ApartmentDetailsPanel';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  useChessboardStore,
  type ChessboardApartment,
  type ChessboardFilters,
} from '@/stores/chessboardStore';

interface ChessboardData {
  building: any;
  apartments: ChessboardApartment[];
  statuses: any[];
  sections: Array<{ id: string | null; name: string | null }>;
  structure: {
    max_floor: number;
    total_apartments: number;
  };
}

export default function ChessboardPage() {
  const { projectId, buildingId } = useParams<{
    projectId: string;
    buildingId: string;
  }>();
  const {
    filters,
    drawerOpen,
    selectedApartment,
    setFilters,
    setDrawerOpen,
    setSelectedApartment,
    resetFilters,
    resetAll,
  } = useChessboardStore();

  useEffect(() => {
    resetAll();
  }, [buildingId, resetAll]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chessboard', buildingId, filters],
    queryFn: async () => {
      const response = await api.get(`/buildings/${buildingId}/chessboard`, {
        params: filters,
      });
      return response.data.data as ChessboardData;
    },
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['chessboard-filters', buildingId],
    queryFn: async () => {
      const response = await api.get(`/buildings/${buildingId}/chessboard/filters`);
      return response.data.data;
    },
  });

  // Group apartments by floor
  const apartmentsByFloor = useMemo(() => {
    if (!data?.apartments) return {};
    
    return data.apartments.reduce((acc, apt) => {
      if (!acc[apt.floor]) acc[apt.floor] = [];
      acc[apt.floor].push(apt);
      return acc;
    }, {} as Record<number, ChessboardApartment[]>);
  }, [data?.apartments]);

  const floors = useMemo(
    () => Object.keys(apartmentsByFloor).map(Number).sort((a, b) => b - a),
    [apartmentsByFloor]
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Помилка навантаження шахматки</Alert>;
  }

  return (
    <Box display="flex">
      {/* Filters Sidebar */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ width: 300 }}
        PaperProps={{ sx: { width: 300 } }}
      >
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Фільтри</Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Floor Filter */}
          {filterOptions?.floors && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Поверх
              </Typography>
              <Slider
                value={filters.floors.length > 0 ? filters.floors : [1, data?.structure.max_floor || 1]}
                onChange={(_, newValue) => {
                  setFilters({ ...filters, floors: newValue as number[] } as ChessboardFilters);
                }}
                min={filterOptions.floors.min || 1}
                max={filterOptions.floors.max || 10}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          )}

          {/* Rooms Filter */}
          {filterOptions?.rooms && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Кількість кімнат
              </Typography>
              <FormGroup row>
                {filterOptions.rooms.map((room: number) => (
                  <FormControlLabel
                    key={room}
                    control={
                      <Checkbox
                        checked={filters.rooms.includes(room)}
                        onChange={(e) => {
                          setFilters({
                            ...filters,
                            rooms: e.target.checked
                              ? [...filters.rooms, room]
                              : filters.rooms.filter((r) => r !== room),
                          } as ChessboardFilters);
                        }}
                      />
                    }
                    label={room === 1 ? 'Студія' : `${room}+`}
                  />
                ))}
              </FormGroup>
            </Box>
          )}

          {/* Status Filter */}
          {data?.statuses && (
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Статус
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {data.statuses.map((status: any) => (
                  <FormControlLabel
                    key={status.id}
                    control={
                      <Checkbox
                        checked={filters.status.includes(status.id)}
                        onChange={(e) => {
                          setFilters({
                            ...filters,
                            status: e.target.checked
                              ? [...filters.status, status.id]
                              : filters.status.filter((s) => s !== status.id),
                          } as ChessboardFilters);
                        }}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: status.color,
                          }}
                        />
                        {status.name}
                      </Box>
                    }
                  />
                ))}
              </Box>
            </Box>
          )}

          <Button
            variant="outlined"
            fullWidth
            onClick={resetFilters}
          >
            Скинути фільтри
          </Button>
        </Box>
      </Drawer>

      {/* Main Chessboard */}
      <Box flex={1} p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">{data?.building?.name}</Typography>
          <Box display="flex" gap={1}>
            <ApartmentImportExportDialog
              projectId={projectId}
              buildingId={buildingId}
              triggerLabel="Імпорт / Експорт"
            />
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setDrawerOpen(!drawerOpen)}
            >
              Фільтри
            </Button>
          </Box>
        </Box>

        {/* Apartment Count */}
        <Typography variant="body2" color="textSecondary" mb={2}>
          Всього квартир: {data?.apartments.length} / {data?.structure.total_apartments}
        </Typography>

        {/* Chessboard Grid */}
        <ChessboardGrid
          floors={floors}
          sections={data?.sections ?? []}
          apartmentsByFloor={apartmentsByFloor}
          onSelectApartment={setSelectedApartment}
        />

        {/* Apartment Details Panel */}
        {selectedApartment && (
          <ApartmentDetailsPanel
            apartment={selectedApartment}
            onClose={() => setSelectedApartment(null)}
          />
        )}
      </Box>
    </Box>
  );
}
