import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import ChessboardSelector from '@/components/ChessboardSelector';
import type { Deal } from '@/types';

interface DealApartmentInfoProps {
  deal: Deal;
  onApartmentUpdated?: () => void;
}

export default function DealApartmentInfo({ deal, onApartmentUpdated }: DealApartmentInfoProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [detachConfirmOpen, setDetachConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const attachMutation = useMutation({
    mutationFn: (apartment_id: string) =>
      api.post(`/deals/${deal.id}/attach-apartment`, { apartment_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', deal.id] });
      setSelectorOpen(false);
      addToast('Apartment attached successfully');
      onApartmentUpdated?.();
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to attach apartment', 'error');
    },
  });

  const detachMutation = useMutation({
    mutationFn: () => api.post(`/deals/${deal.id}/detach-apartment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', deal.id] });
      setDetachConfirmOpen(false);
      addToast('Apartment detached successfully');
      onApartmentUpdated?.();
    },
    onError: (error: any) => {
      addToast(error?.response?.data?.message || 'Failed to detach apartment', 'error');
    },
  });

  if (!deal.apartment && !deal.attached_at) {
    return (
      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#f5f5f5' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <HomeIcon fontSize="small" color="action" />
          <Typography variant="h6" fontWeight={500}>
            Apartment
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          No apartment attached to this deal
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<HomeIcon />}
          onClick={() => setSelectorOpen(true)}
          disabled={attachMutation.isPending}
        >
          Attach Apartment
        </Button>

        <ChessboardSelector
          open={selectorOpen}
          onClose={() => setSelectorOpen(false)}
          onSelectApartment={(apartmentId: string) => attachMutation.mutate(apartmentId)}
          isLoading={attachMutation.isPending}
        />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <HomeIcon fontSize="small" sx={{ color: deal.apartment?.status?.color || '#2196F3' }} />
        <Typography variant="h6" fontWeight={500}>
          Attached Apartment
        </Typography>
      </Box>

      {deal.apartment && (
        <Stack spacing={1} mb={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Apartment
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {deal.apartment.building?.name} - Apt {deal.apartment.number} (Floor {deal.apartment.floor})
            </Typography>
          </Box>

          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Rooms
              </Typography>
              <Typography variant="body2">{deal.apartment.rooms} rooms</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Area
              </Typography>
              <Typography variant="body2">{deal.apartment.area} m²</Typography>
            </Box>
          </Box>

          {deal.apartment.price && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Price
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {new Intl.NumberFormat('uk-UA', {
                  style: 'currency',
                  currency: 'UAH',
                }).format(deal.apartment.price)}
              </Typography>
            </Box>
          )}

          {deal.apartment.status && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={deal.apartment.status.name}
                size="small"
                sx={{
                  bgcolor: `${deal.apartment.status.color}20`,
                  color: deal.apartment.status.color,
                  fontWeight: 600,
                  mt: 0.5,
                }}
              />
            </Box>
          )}
        </Stack>
      )}

      {deal.attached_at && (
        <Box pb={1.5} borderBottom="1px solid" borderColor="divider">
          <Typography variant="caption" color="text.secondary" display="block">
            Attached by {deal.attached_by?.name || 'Unknown'} on{' '}
            {new Date(deal.attached_at).toLocaleString()}
          </Typography>
        </Box>
      )}

      <Box display="flex" gap={1} mt={1.5}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
          onClick={() => setSelectorOpen(true)}
          disabled={attachMutation.isPending}
        >
          Change
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<CloseIcon />}
          onClick={() => setDetachConfirmOpen(true)}
          disabled={detachMutation.isPending}
        >
          Detach
        </Button>
      </Box>

      <ChessboardSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelectApartment={(apartmentId: string) => attachMutation.mutate(apartmentId)}
        isLoading={attachMutation.isPending}
      />

      <Dialog
        open={detachConfirmOpen}
        onClose={() => setDetachConfirmOpen(false)}
      >
        <DialogTitle>Detach Apartment?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to detach this apartment from the deal?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetachConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => detachMutation.mutate()}
            disabled={detachMutation.isPending}
          >
            {detachMutation.isPending ? <CircularProgress size={20} /> : 'Detach'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
