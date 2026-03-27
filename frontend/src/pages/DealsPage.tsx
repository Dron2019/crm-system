import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  MenuItem,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewListIcon from '@mui/icons-material/ViewList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

import { useDeals, usePipelines } from '@/hooks/useDeals';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Deal, Stage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import type { CustomFieldDefinition } from '@/components/CustomFieldRenderer';

function DealCard({ deal, onClick, isDragOverlay }: { deal: Deal; onClick: () => void; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={isDragging ? undefined : onClick}
      sx={{
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        mb: 1,
        opacity: isDragging ? 0.4 : 1,
        '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
        transition: 'all 0.15s',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {deal.title}
        </Typography>
        <Typography variant="h6" fontWeight={700} color="primary" mt={0.5}>
          {deal.currency} {Number(deal.value).toLocaleString()}
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

function KanbanColumn({ stage, deals, onDealClick }: { stage: Stage; deals: Deal[]; onDealClick: (id: string) => void }) {
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <Box
      ref={setNodeRef}
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
          borderTop: `3px solid ${stage.color || '#6366f1'}`,
          bgcolor: isOver ? `${stage.color || '#6366f1'}10` : 'background.default',
          transition: 'background-color 0.2s',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              {stage.name}
            </Typography>
            <Chip label={deals.length} size="small" variant="outlined" />
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(0)}K` : totalValue}
          </Typography>
        </Box>
      </Paper>
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 0.5,
          minHeight: 200,
          borderRadius: 1,
          border: isOver ? `2px dashed ${stage.color || '#6366f1'}` : '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
        ))}
        {deals.length === 0 && (
          <Box py={4} textAlign="center">
            <Typography variant="caption" color="text.secondary">No deals</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function DealsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list'>((searchParams.get('view') as 'kanban' | 'list') ?? 'kanban');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage_id') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'desc',
  );
  const [selectedPipeline, setSelectedPipeline] = useState<string>(searchParams.get('pipeline_id') ?? '');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const [customFilters, setCustomFilters] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('cf_')) {
        next[key.replace('cf_', '')] = value;
      }
    });
    return next;
  });
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();

  const { data: customFields } = useQuery<CustomFieldDefinition[]>({
    queryKey: ['custom-fields', 'deal'],
    queryFn: async () => {
      const { data } = await api.get('/custom-fields', { params: { entity_type: 'deal' } });
      return data.data;
    },
  });

  // Auto-select first pipeline
  const pipelineId = selectedPipeline || pipelines?.[0]?.id || '';
  const pipeline = pipelines?.find((p) => p.id === pipelineId);

  const { data: dealsData, isLoading: dealsLoading } = useDeals({
    pipeline_id: pipelineId || undefined,
    search: search || undefined,
    stage_id: stageFilter || undefined,
    status: statusFilter || undefined,
    sort: sortBy,
    direction: sortDirection,
    per_page: 200,
  });

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.post(`/deals/${dealId}/move`, { stage_id: stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as Deal | undefined;
    setActiveDeal(deal ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const stageId = over.id as string;
    const deal = dealsData?.data?.find((d) => d.id === dealId);
    if (deal && deal.stage?.id !== stageId) {
      moveMutation.mutate({ dealId, stageId });
    }
  };

  const stages = useMemo(
    () => (pipeline?.stages ?? []).slice().sort((a, b) => a.display_order - b.display_order),
    [pipeline],
  );

  const filteredDeals = useMemo(() => {
    const deals = dealsData?.data ?? [];
    return deals.filter((deal) => {
      for (const [field, expected] of Object.entries(customFilters)) {
        if (!expected) continue;
        const actual = deal.custom_fields?.[field];
        if (Array.isArray(actual)) {
          if (!actual.map(String).some((v) => v.toLowerCase().includes(expected.toLowerCase()))) {
            return false;
          }
        } else if (typeof actual === 'boolean') {
          const boolText = actual ? 'yes' : 'no';
          if (!boolText.includes(expected.toLowerCase())) return false;
        } else if (!String(actual ?? '').toLowerCase().includes(expected.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [dealsData?.data, customFilters]);

  const filteredDealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    stages.forEach((s) => map.set(s.id, []));
    filteredDeals.forEach((deal) => {
      if (deal.stage) {
        const list = map.get(deal.stage.id) || [];
        list.push(deal);
        map.set(deal.stage.id, list);
      }
    });
    return map;
  }, [filteredDeals, stages]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (view) next.set('view', view);
    if (search) next.set('search', search);
    if (statusFilter) next.set('status', statusFilter);
    if (stageFilter) next.set('stage_id', stageFilter);
    if (sortBy) next.set('sort', sortBy);
    if (sortDirection) next.set('direction', sortDirection);
    if (pipelineId) next.set('pipeline_id', pipelineId);
    Object.entries(customFilters).forEach(([key, value]) => {
      if (value) next.set(`cf_${key}`, value);
    });
    setSearchParams(next, { replace: true });
  }, [view, search, statusFilter, stageFilter, sortBy, sortDirection, pipelineId, customFilters, setSearchParams]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStageFilter('');
    setSortBy('created_at');
    setSortDirection('desc');
    setCustomFilters({});
  };

  const isLoading = pipelinesLoading || dealsLoading;

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Deals</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {pipelines && pipelines.length > 1 && (
            <TextField
              select
              size="small"
              value={pipelineId}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              sx={{ minWidth: 180 }}
              label="Pipeline"
            >
              {pipelines.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          )}
          <ToggleButtonGroup
            size="small"
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="kanban"><ViewColumnIcon /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon /></ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/deals/new')}>
            Add Deal
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="won">Won</MenuItem>
            <MenuItem value="lost">Lost</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {stages.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="created_at">Created Date</MenuItem>
            <MenuItem value="title">Title</MenuItem>
            <MenuItem value="value">Value</MenuItem>
            <MenuItem value="probability">Probability</MenuItem>
            <MenuItem value="expected_close_date">Close Date</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Direction"
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="asc">Asc</MenuItem>
            <MenuItem value="desc">Desc</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetFilters}>
            Reset
          </Button>
        </Box>
        {customFields && customFields.length > 0 && (
          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            {customFields.map((field) => (
              <TextField
                key={field.id}
                size="small"
                label={field.label}
                value={customFilters[field.name] ?? ''}
                onChange={(e) => setCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }))}
                sx={{ minWidth: 180 }}
              />
            ))}
          </Box>
        )}
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : view === 'kanban' ? (
        /* Kanban View */
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={filteredDealsByStage.get(stage.id) || []}
                onDealClick={(id) => navigate(`/deals/${id}`)}
              />
            ))}
            {stages.length === 0 && (
              <Box py={4} textAlign="center" width="100%">
                <Typography color="text.secondary">No pipeline stages configured.</Typography>
              </Box>
            )}
          </Box>
          <DragOverlay>
            {activeDeal ? (
              <Box sx={{ width: 280 }}>
                <DealCard deal={activeDeal} onClick={() => {}} isDragOverlay />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Deal</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Probability</TableCell>
                <TableCell>Close Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDeals.map((deal) => (
                <TableRow
                  key={deal.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{deal.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary">
                      {deal.currency} {Number(deal.value).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {deal.stage && (
                      <Chip
                        label={deal.stage.name}
                        size="small"
                        sx={{
                          bgcolor: `${deal.stage.color || '#6366f1'}20`,
                          color: deal.stage.color || '#6366f1',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{deal.contact?.full_name ?? '—'}</TableCell>
                  <TableCell>{deal.company?.name ?? '—'}</TableCell>
                  <TableCell>{deal.probability}%</TableCell>
                  <TableCell>
                    {deal.expected_close_date
                      ? new Date(deal.expected_close_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => navigate(`/deals/${deal.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => navigate(`/deals/${deal.id}/edit`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No deals found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Box>
  );
}
