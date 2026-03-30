import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GridViewIcon from '@mui/icons-material/GridView';
import ApartmentImportExportDialog from '@/components/ApartmentImportExportDialog';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

interface Project {
  id: string;
  name: string;
  brand?: string;
  city?: string;
  status: string;
  manager_id?: string;
  created_at: string;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Container>
        <Box pt={3}>
          <Grid container spacing={3}>
            {[...Array(6)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  if (error) {
    return <Alert severity="error">Помилка навантаження проектів</Alert>;
  }

  const projects = Array.isArray(data)
    ? data
    : data?.data || [];

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Проекти (Шахматка квартир)</Typography>
          <Box display="flex" gap={1}>
            <ApartmentImportExportDialog triggerLabel="Імпорт / Експорт квартир" />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/objects/new')}
            >
              Новий проект
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {projects.map((project: Project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)',
                  },
                }}
                onClick={() => navigate(`/objects/${project.id}/buildings`)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  {project.brand && (
                    <Typography variant="body2" color="textSecondary">
                      {project.brand}
                    </Typography>
                  )}
                  {project.city && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {project.city}
                    </Typography>
                  )}
                  <Box mt={2}>
                    <Typography variant="caption" color="textSecondary">
                      Статус:{' '}
                      <strong>
                        {project.status === 'sales' && 'Продажі'}
                        {project.status === 'planning' && 'Планування'}
                        {project.status === 'construction' && 'Будівництво'}
                        {project.status === 'completed' && 'Завершено'}
                      </strong>
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/objects/${project.id}/buildings`)}>
                    Переглянути
                  </Button>
                  <Button
                    size="small"
                    startIcon={<GridViewIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/objects/${project.id}/buildings`);
                    }}
                  >
                    Шахматка
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {projects.length === 0 && (
          <Box textAlign="center" py={5}>
            <Typography variant="body1" color="textSecondary">
              Проектів не знайдено
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/objects/new')}
              sx={{ mt: 2 }}
            >
              Створити перший проект
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}
