import { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import type { Deal, Stage } from '@/types';
import { useCurrencyStore } from '@/stores/currencyStore';
import { convertAmount } from '@/lib/currency';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

function DealCard({ deal, onClick }: DealCardProps) {
  const formatMoney = useCurrencyStore((s) => s.format);
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        mb: 1,
        '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
        transition: 'all 0.15s',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {deal.title}
        </Typography>
        <Typography variant="h6" fontWeight={700} color="primary" mt={0.5}>
          {formatMoney(Number(deal.value), deal.currency)}
        </Typography>
        {deal.contact && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
              {deal.contact.first_name.charAt(0)}
            </Avatar>
            <Typography variant="caption" color="text.secondary" noWrap>
              {deal.contact.full_name}
            </Typography>
          </Box>
        )}
        {deal.company && (
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {deal.company.name}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="caption" color="text.secondary">
            {deal.probability}%
          </Typography>
          {deal.expected_close_date && (
            <Typography variant="caption" color="text.secondary">
              {new Date(deal.expected_close_date).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  onDealClick: (id: string) => void;
}

function KanbanColumn({ stage, deals, onDealClick }: KanbanColumnProps) {
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const formatMoneyCompact = useCurrencyStore((s) => s.formatCompact);
  const totalValue = deals.reduce(
    (sum, d) => sum + convertAmount(Number(d.value), d.currency, displayCurrency, currencies),
    0,
  );

  return (
    <Box
      sx={{
        minWidth: 280,
        maxWidth: 320,
        flex: '0 0 280px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Paper
        sx={{
          p: 1.5,
          mb: 1,
          bgcolor: stage.color || '#6366f1',
          color: '#ffffff',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              {stage.name}
            </Typography>
            <Chip
              label={deals.length}
              size="small"
              variant="outlined"
              sx={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.7)' }}
            />
          </Box>
          <Typography variant="caption" color="rgba(255,255,255,0.92)" fontWeight={600}>
            {formatMoneyCompact(totalValue, displayCurrency)}
          </Typography>
        </Box>
      </Paper>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5, minHeight: 200 }}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
        ))}
        {deals.length === 0 && (
          <Box py={4} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              No deals
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

interface PipelineBoardProps {
  stages: Stage[];
  deals: Deal[];
  loading?: boolean;
  onDealClick: (id: string) => void;
}

export default function PipelineBoard({
  stages,
  deals,
  loading,
  onDealClick,
}: PipelineBoardProps) {
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.display_order - b.display_order),
    [stages],
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    sortedStages.forEach((s) => map.set(s.id, []));
    deals.forEach((deal) => {
      if (deal.stage) {
        const list = map.get(deal.stage.id) || [];
        list.push(deal);
        map.set(deal.stage.id, list);
      }
    });
    return map;
  }, [deals, sortedStages]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (sortedStages.length === 0) {
    return (
      <Box py={4} textAlign="center" width="100%">
        <Typography color="text.secondary">No pipeline stages configured.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        flex: 1,
        pb: 2,
        minHeight: 0,
      }}
    >
      {sortedStages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          deals={dealsByStage.get(stage.id) || []}
          onDealClick={onDealClick}
        />
      ))}
    </Box>
  );
}
