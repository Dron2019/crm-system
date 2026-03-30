import { Box, Grid, Typography } from '@mui/material';
import type { ChessboardApartment } from '@/stores/chessboardStore';

interface ChessboardSection {
  id: string | null;
  name: string | null;
}

interface ChessboardGridProps {
  floors: number[];
  sections: ChessboardSection[];
  apartmentsByFloor: Record<number, ChessboardApartment[]>;
  onSelectApartment: (apartment: ChessboardApartment) => void;
}

export default function ChessboardGrid({
  floors,
  sections,
  apartmentsByFloor,
  onSelectApartment,
}: ChessboardGridProps) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Grid container spacing={1} sx={{ minWidth: 'min-content', p: 1 }}>
        <Grid item xs={2}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Поверх
          </Typography>
        </Grid>
        {sections.map((section) => (
          <Grid item key={section.id ?? 'main'} sx={{ flex: 1, minWidth: 100 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              {section.name || 'Основна'}
            </Typography>
          </Grid>
        ))}

        {floors.map((floor) => (
          <Grid container item xs={12} key={floor} spacing={1}>
            <Grid item xs={2}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {floor}
              </Typography>
            </Grid>
            {sections.map((section) => (
              <Grid item key={`${floor}-${section.id ?? 'main'}`} sx={{ flex: 1, minWidth: 100 }}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {(apartmentsByFloor[floor] || [])
                    .filter((apartment) => apartment.section_id === section.id || (section.id === null && !apartment.section_id))
                    .map((apartment) => (
                      <Box
                        key={apartment.id}
                        onClick={() => onSelectApartment(apartment)}
                        sx={{
                          backgroundColor: apartment.status_color,
                          px: 1.5,
                          py: 1,
                          borderRadius: 1,
                          cursor: 'pointer',
                          minWidth: 60,
                          textAlign: 'center',
                          flex: '1 1 auto',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
                          {apartment.number}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              </Grid>
            ))}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
