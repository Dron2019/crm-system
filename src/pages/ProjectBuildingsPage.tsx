import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Skeleton,
  Alert,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ApartmentImportExportDialog from '@/components/ApartmentImportExportDialog';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface Building {
  id: string;
  name: string;
  number?: string;
  city?: string;
  address?: string;
  status: string;
  total_floors?: number;
  total_apartments?: number;
  apartments_count?: number;
}

export default function ProjectBuildingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`);
      return response.data.data;
    },
  });

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ['buildings', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/buildings`);
      return response.data.data;
    },
  });

  if (isLoading || projectLoading) {
    return (
      <Container>
        <Box pt={3}>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  if (error) {
    return <Alert severity="error">Помилка навантаження будинків</Alert>;
  }

  const buildingsList = Array.isArray(buildings) ? buildings : buildings?.data || [];

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        {/* Header */}
        <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ cursor: 'pointer', mb: 1 }}
              onClick={() => navigate('/objects')}
            >
              ← Проекти
            </Typography>
            <Typography variant="h4">{project?.name}</Typography>
            {project?.city && (
              <Typography variant="body1" color="textSecondary" mt={1}>
                {project.city} {project.address && `• ${project.address}`}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1}>
            <ApartmentImportExportDialog
              projectId={projectId}
              triggerLabel="Імпорт / Експорт квартир"
            />
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/objects/${projectId}/edit`)}
            >
              Редагувати проект
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/objects/${projectId}/buildings/new`)}
            >
              Новий будинок
            </Button>
          </Box>
        </Box>

        {/* Buildings Grid */}
        <Grid container spacing={3}>
          {buildingsList.map((building: Building) => (
            <Grid item xs={12} sm={6} md={4} key={building.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {building.name}
                    {building.number && ` №${building.number}`}
                  </Typography>
                  
                  {building.address && (
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      📍 {building.address}
                    </Typography>
                  )}

                  <Box mt={2} pt={2} borderTop="1px solid #eee">
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Поверхів
                        </Typography>
                        <Typography variant="h6">
                          {building.total_floors || '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Квартир
                        </Typography>
                        <Typography variant="h6">
                          {building.apartments_count || building.total_apartments || '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {building.status && (
                    <Box mt={2}>
                      <Typography variant="caption" color="textSecondary">
                        Статус:{' '}
                        <strong>
                          {building.status === 'construction' && 'Будівництво'}
                          {building.status === 'ready' && 'Готово'}
                          {building.status === 'planning' && 'Планування'}
                          {building.status === 'completed' && 'Завершено'}
                        </strong>
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/objects/${projectId}/buildings/${building.id}/edit`)}
                  >
                    Редагувати
                  </Button>
                  <Button
                    size="small"
                    fullWidth
                    variant="contained"
                    startIcon={<GridViewIcon />}
                    onClick={() => navigate(`/objects/${projectId}/buildings/${building.id}/chessboard`)}
                  >
                    Шахматка
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {buildingsList.length === 0 && (
          <Box textAlign="center" py={5}>
            <Typography variant="body1" color="textSecondary">
              Будинків не знайдено
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`/objects/${projectId}/buildings/new`)}
              sx={{ mt: 2 }}
            >
              Додати будинок
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}
