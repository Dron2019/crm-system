import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Typography,
  Button,
  TextField,
  MenuItem,
  TextField as MuiTextField,
  Stack,
  Paper,
  Chip,
  Grid2 as Grid,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import type { Building, Apartment } from '@/types';

interface ChessboardSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectApartment: (apartmentId: string) => void;
  isLoading?: boolean;
}

export default function ChessboardSelector({
  open,
  onClose,
  onSelectApartment,
  isLoading = false,
}: ChessboardSelectorProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>('');
  const [filters, setFilters] = useState({
    minRooms: '',
    maxRooms: '',
    minPrice: '',
    maxPrice: '',
    status: '',
  });

  // Fetch projects (to get buildings)
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-selection'],
    queryFn: async () => {
      const { data } = await api.get('/projects?per_page=50');
      return data;
    },
    enabled: open,
  });

  const projects = projectsData?.data ?? [];

  // Fetch buildings for selected project
  const { data: buildingsData } = useQuery({
    queryKey: ['buildings-for-selection', selectedBuildingId],
    queryFn: async () => {
      // Extract project ID from selected building if needed
      if (!projects.length) return null;
      const { data } = await api.get('/buildings?per_page=100');
      return data;
    },
    enabled: open && projects.length > 0,
  });

  const buildings = buildingsData?.data ?? [];

  // Fetch apartments for selected building
  const { data: apartmentsData, isLoading: apartmentsLoading } = useQuery({
    queryKey: ['apartments-for-selection', selectedBuildingId],
    queryFn: async () => {
      if (!selectedBuildingId) return null;
      const { data } = await api.get(`/apartments?building_id=${selectedBuildingId}`, {
        params: {
          ...(filters.minRooms && { min_rooms: filters.minRooms }),
          ...(filters.maxRooms && { max_rooms: filters.maxRooms }),
          ...(filters.minPrice && { min_price: filters.minPrice }),
          ...(filters.maxPrice && { max_price: filters.maxPrice }),
          ...(filters.status && { status: filters.status }),
        },
      });
      return data;
    },
    enabled: open && !!selectedBuildingId,
  });

  const apartments: Apartment[] = apartmentsData?.data ?? [];

  const handleSelect = () => {
    if (selectedApartmentId) {
      onSelectApartment(selectedApartmentId);
      setSelectedApartmentId('');
    }
  };

  const handleClose = () => {
    setSelectedBuildingId('');
    setSelectedApartmentId('');
    setFilters({
      minRooms: '',
      maxRooms: '',
      minPrice: '',
      maxPrice: '',
      status: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Select Apartment</DialogTitle>
      <DialogContent sx={{ minHeight: 400 }}>
        {projectsLoading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} mt={1}>
            {/* Building Selection */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Building
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedApartmentId('');
                }}
                disabled={!buildings.length}
              >
                <MenuItem value="">
                  <em>Select a building...</em>
                </MenuItem>
                {buildings.map((building: Building) => (
                  <MenuItem key={building.id} value={building.id}>
                    {building.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Filters */}
            {selectedBuildingId && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Filters
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6, sm: 6 }}>
                    <MuiTextField
                      label="Min Rooms"
                      type="number"
                      size="small"
                      fullWidth
                      value={filters.minRooms}
                      onChange={(e) => setFilters({ ...filters, minRooms: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 6 }}>
                    <MuiTextField
                      label="Max Rooms"
                      type="number"
                      size="small"
                      fullWidth
                      value={filters.maxRooms}
                      onChange={(e) => setFilters({ ...filters, maxRooms: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 6 }}>
                    <MuiTextField
                      label="Min Price"
                      type="number"
                      size="small"
                      fullWidth
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 6 }}>
                    <MuiTextField
                      label="Max Price"
                      type="number"
                      size="small"
                      fullWidth
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Apartments Grid */}
            {selectedBuildingId && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Available Apartments
                  </Typography>
                  {apartmentsLoading && <CircularProgress size={20} />}
                </Box>

                {apartments.length > 0 ? (
                  <Grid container spacing={1}>
                    {apartments.map((apt: Apartment) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={apt.id}>
                        <Paper
                          onClick={() => setSelectedApartmentId(apt.id)}
                          sx={{
                            p: 1,
                            cursor: 'pointer',
                            border: selectedApartmentId === apt.id ? '2px solid' : '1px solid',
                            borderColor:
                              selectedApartmentId === apt.id
                                ? 'primary.main'
                                : 'divider',
                            bgcolor:
                              selectedApartmentId === apt.id ? 'primary.lighter' : 'background.paper',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: 1,
                            },
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} textAlign="center" mb={0.5}>
                            {apt.number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                            Floor {apt.floor}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" gap={0.5} mt={0.5}>
                            <Typography variant="caption" fontSize={10}>
                              {apt.rooms}R
                            </Typography>
                            <Typography variant="caption" fontSize={10}>
                              {apt.area}m²
                            </Typography>
                          </Box>
                          {apt.status && (
                            <Chip
                              label={apt.status.name}
                              size="small"
                              sx={{
                                width: '100%',
                                mt: 0.75,
                                height: 20,
                                fontSize: 10,
                                bgcolor: `${apt.status.color}20`,
                                color: apt.status.color,
                              }}
                            />
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>
                    No apartments found
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSelect}
          disabled={!selectedApartmentId || isLoading}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Attach'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
