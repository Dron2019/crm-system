import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Drawer,
  IconButton,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ApartmentImportExportDialog from '@/components/ApartmentImportExportDialog';
import ChessboardGrid from '@/components/ChessboardGrid';
import ApartmentDetailsPanel from '@/components/ApartmentDetailsPanel';
import ConfirmDialog from '@/components/ConfirmDialog';
import ApartmentFormDialog from '@/components/objects/ApartmentFormDialog';
import SectionFormDialog from '@/components/objects/SectionFormDialog';
import api from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useChessboardStore,
  type ChessboardApartment,
  type ChessboardFilters,
} from '@/stores/chessboardStore';
import { useToastStore } from '@/stores/toastStore';

interface ChessboardData {
  building: any;
  apartments: ChessboardApartment[];
  statuses: any[];
  sections: Array<{ id: string | null; name: string | null; number?: string | null; description?: string | null }>;
  structure: {
    max_floor: number;
    total_apartments: number;
  };
}

type EditableSection = {
  id: string;
  name: string;
  number?: string | null;
  description?: string | null;
};

export default function ChessboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { projectId, buildingId } = useParams<{
    projectId: string;
    buildingId: string;
  }>();
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<EditableSection | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<EditableSection | null>(null);
  const [apartmentDialogOpen, setApartmentDialogOpen] = useState(false);
  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);
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

  const sections = useMemo(() => {
    if (data?.sections?.length) {
      return data.sections;
    }

    return [{ id: null, name: 'Основна' }];
  }, [data?.sections]);

  const apartmentCountsBySection = useMemo(() => (
    (data?.apartments ?? []).reduce((acc, apartment) => {
      const key = apartment.section_id ?? 'main';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ), [data?.apartments]);

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => api.delete(`/sections/${sectionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
      addToast('Section deleted', 'success');
      setSectionToDelete(null);
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to delete section', 'error');
    },
  });

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
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/objects/${projectId}/edit`)}
            >
              Edit Project
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/objects/${projectId}/buildings/${buildingId}/edit`)}
            >
              Edit Building
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingSection(null);
                setSectionDialogOpen(true);
              }}
            >
              New Section
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingApartmentId(null);
                setApartmentDialogOpen(true);
              }}
            >
              New Apartment
            </Button>
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

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Sections</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingSection(null);
                setSectionDialogOpen(true);
              }}
            >
              Add Section
            </Button>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {sections.map((section) => {
              const sectionKey = section.id ?? 'main';

              return (
                <Paper key={sectionKey} variant="outlined" sx={{ p: 1.5, minWidth: 220 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box>
                      <Typography variant="subtitle2">
                        {section.name || 'Основна'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Apartments: {apartmentCountsBySection[sectionKey] ?? 0}
                      </Typography>
                      {section.number && (
                        <Chip size="small" label={`#${section.number}`} sx={{ mt: 1 }} />
                      )}
                    </Box>
                    {section.id && (
                      <Box display="flex" gap={0.5}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (!section.id) {
                              return;
                            }

                            setEditingSection({
                              id: section.id,
                              name: section.name || 'Section',
                              number: section.number,
                              description: section.description,
                            });
                            setSectionDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (!section.id) {
                              return;
                            }

                            setSectionToDelete({
                              id: section.id,
                              name: section.name || 'Section',
                              number: section.number,
                              description: section.description,
                            });
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                  {section.description && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {section.description}
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Paper>

        {/* Chessboard Grid */}
        <ChessboardGrid
          floors={floors}
          sections={sections}
          apartmentsByFloor={apartmentsByFloor}
          onSelectApartment={setSelectedApartment}
        />

        {/* Apartment Details Panel */}
        {selectedApartment && (
          <ApartmentDetailsPanel
            apartment={selectedApartment}
            onClose={() => setSelectedApartment(null)}
            onEdit={(apartment) => {
              setEditingApartmentId(apartment.id);
              setApartmentDialogOpen(true);
            }}
          />
        )}

        <SectionFormDialog
          open={sectionDialogOpen}
          buildingId={buildingId!}
          section={editingSection}
          onClose={() => {
            setSectionDialogOpen(false);
            setEditingSection(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
          }}
        />

        <ApartmentFormDialog
          open={apartmentDialogOpen}
          buildingId={buildingId!}
          apartmentId={editingApartmentId}
          sections={data?.sections?.filter((section) => Boolean(section.id)).map((section) => ({
            id: section.id!,
            name: section.name || 'Section',
          })) ?? []}
          statuses={data?.statuses ?? []}
          onClose={() => {
            setApartmentDialogOpen(false);
            setEditingApartmentId(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['chessboard', buildingId] });
          }}
        />

        <ConfirmDialog
          open={Boolean(sectionToDelete?.id)}
          title="Delete section?"
          message="Apartments assigned to this section will lose the section link. Continue only if that matches your data model."
          confirmLabel="Delete"
          loading={deleteSectionMutation.isPending}
          onCancel={() => setSectionToDelete(null)}
          onConfirm={() => {
            if (sectionToDelete?.id) {
              deleteSectionMutation.mutate(sectionToDelete.id);
            }
          }}
        />
      </Box>
    </Box>
  );
}
