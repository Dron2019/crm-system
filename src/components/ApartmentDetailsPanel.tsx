import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Deal } from '@/types';
import type { ChessboardApartment } from '@/stores/chessboardStore';
import { useToastStore } from '@/stores/toastStore';

interface ApartmentDetailsPanelProps {
  apartment: ChessboardApartment;
  onClose: () => void;
}

export default function ApartmentDetailsPanel({ apartment, onClose }: ApartmentDetailsPanelProps) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['open-deals-for-apartment-attach'],
    queryFn: async () => {
      const { data } = await api.get('/deals', { params: { per_page: 100, status: 'open' } });
      return data;
    },
  });

  const deals: Deal[] = useMemo(() => {
    if (Array.isArray(dealsData?.data)) {
      return dealsData.data;
    }

    return [];
  }, [dealsData]);

  const attachMutation = useMutation({
    mutationFn: (dealId: string) =>
      api.post(`/deals/${dealId}/attach-apartment`, {
        apartment_id: apartment.id,
      }),
    onSuccess: () => {
      addToast('Apartment attached to deal', 'success');
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['chessboard'] });
      setSelectedDealId('');
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to attach apartment to deal', 'error');
    },
  });

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h6">Квартира №{apartment.number}</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Поверх: {apartment.floor} | Кімнат: {apartment.rooms} | Площа: {apartment.area} м²
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ціна: {apartment.price.toLocaleString()} ₴
          </Typography>
          <Box mt={1}>
            <Chip
              label={apartment.status_name}
              sx={{ backgroundColor: apartment.status_color, color: 'white' }}
            />
          </Box>
        </Box>
        <Button variant="contained" onClick={onClose}>
          Закрити
        </Button>
      </Box>

      <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
        <Typography variant="subtitle2" mb={1}>
          CRM Integration: Attach apartment to open deal
        </Typography>

        {deals.length === 0 && !dealsLoading && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            No open deals available for attachment.
          </Alert>
        )}

        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            select
            size="small"
            label="Open deal"
            value={selectedDealId}
            onChange={(event) => setSelectedDealId(event.target.value)}
            sx={{ minWidth: 320 }}
            disabled={dealsLoading || attachMutation.isPending || deals.length === 0}
          >
            <MenuItem value="">Select deal</MenuItem>
            {deals.map((deal) => (
              <MenuItem key={deal.id} value={deal.id}>
                {deal.title} ({deal.currency} {deal.value})
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            disabled={!selectedDealId || attachMutation.isPending}
            onClick={() => attachMutation.mutate(selectedDealId)}
          >
            {attachMutation.isPending ? <CircularProgress size={18} /> : 'Attach to deal'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
