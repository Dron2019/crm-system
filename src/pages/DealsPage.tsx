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
  Autocomplete,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewListIcon from '@mui/icons-material/ViewList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Deal, Stage } from '@/types';
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
        <Typography variant="h6" fontWeight={500} color="primary" mt={0.5}>
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
            <Typography variant="subtitle2" fontWeight={500}>
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
  const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (searchParams.get('direction') as 'asc' | 'desc') ?? 'desc',
  );
  const [selectedPipeline, setSelectedPipeline] = useState<string>(searchParams.get('pipeline_id') ?? '');
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) {
        next[key] = value;
      }
    });
    return next;
  });

  const [draftFieldFilters, setDraftFieldFilters] = useState<Record<string, string>>(fieldFilters);

  const [customFilters, setCustomFilters] = useState<Record<string, string | string[]>>(() => {
    const next: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('cf_')) {
        next[key.replace('cf_', '')] = value.includes('||') ? value.split('||').filter(Boolean) : value;
      }
    });
    return next;
  });
  const [draftCustomFilters, setDraftCustomFilters] = useState<Record<string, string | string[]>>(customFilters);
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
    sort: sortBy,
    direction: sortDirection,
    per_page: 200,
    ...fieldFilters,
    ...Object.fromEntries(
      Object.entries(customFilters)
        .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value)))
        .map(([key, value]) => [`cf_${key}`, Array.isArray(value) ? value.join('||') : value]),
    ),
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

  const filteredDeals = useMemo(() => dealsData?.data ?? [], [dealsData?.data]);

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
    if (sortBy) next.set('sort', sortBy);
    if (sortDirection) next.set('direction', sortDirection);
    if (pipelineId) next.set('pipeline_id', pipelineId);
    Object.entries(fieldFilters).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    Object.entries(customFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) next.set(`cf_${key}`, value.join('||'));
        return;
      }
      if (value) next.set(`cf_${key}`, value);
    });
    setSearchParams(next, { replace: true });
  }, [view, search, sortBy, sortDirection, pipelineId, fieldFilters, customFilters, setSearchParams]);

  const resetFilters = () => {
    setSearch('');
    setSortBy('created_at');
    setSortDirection('desc');
    setFieldFilters({});
    setCustomFilters({});
    setDraftFieldFilters({});
    setDraftCustomFilters({});
  };

  const activeFilterCount = Object.values(fieldFilters).filter(Boolean).length
    + Object.values(customFilters).filter((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))).length;

  const renderCustomFilterField = (field: CustomFieldDefinition) => {
    const normalizedType = String(field.field_type ?? '').toLowerCase();
    const normalizedOptions = Array.isArray(field.options)
      ? field.options.map((opt: string) => String(opt ?? '')).filter(Boolean)
      : [];

    const rawValue = draftCustomFilters[field.name];
    const value = Array.isArray(rawValue) ? rawValue : (rawValue ?? '');

    if (normalizedType === 'multiselect' || normalizedType === 'multi_select' || normalizedType === 'multi-select') {
      const selected = Array.isArray(rawValue)
        ? rawValue
        : typeof rawValue === 'string' && rawValue
          ? rawValue.split('||').filter(Boolean)
          : [];

      return (
        <Autocomplete
          key={field.id}
          multiple
          disableCloseOnSelect
          options={normalizedOptions}
          value={selected}
          onChange={(_, newValue) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: newValue }));
          }}
          renderTags={(selectedValues, getTagProps) =>
            selectedValues.map((option, index) => (
              <Chip label={option} size="small" {...getTagProps({ index })} key={`${field.id}-${option}`} />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} size="small" label={`${field.label} (Custom)`} />
          )}
        />
      );
    }

    if (field.field_type === 'select') {
      return (
        <TextField
          key={field.id}
          size="small"
          select
          label={`${field.label} (Custom)`}
          value={Array.isArray(value) ? '' : value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
        >
          <MenuItem value="">Any</MenuItem>
          {normalizedOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.field_type === 'boolean') {
      return (
        <TextField
          key={field.id}
          size="small"
          select
          label={`${field.label} (Custom)`}
          value={value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </TextField>
      );
    }

    if (field.field_type === 'date') {
      return (
        <TextField
          key={field.id}
          size="small"
          type="date"
          label={`${field.label} (Custom)`}
          value={value}
          onChange={(e) => {
            setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      );
    }

    return (
      <TextField
        key={field.id}
        size="small"
        type={field.field_type === 'number' || field.field_type === 'currency' ? 'number' : 'text'}
        label={`${field.label} (Custom)`}
        value={value}
        onChange={(e) => {
          setDraftCustomFilters((prev) => ({ ...prev, [field.name]: e.target.value }));
        }}
      />
    );
  };

  const isLoading = pipelinesLoading || dealsLoading;

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={500}>Deals</Typography>
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
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setDraftFieldFilters(fieldFilters);
              setDraftCustomFilters(customFilters);
              setFilterOpen(true);
            }}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>
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
                    <Typography variant="body2" fontWeight={500} color="primary">
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

      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Filter Deals</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={1.5} mt={0.5}>
            <TextField
              size="small"
              select
              label="Status"
              value={draftFieldFilters.f_status ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_status: e.target.value }))}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="won">Won</MenuItem>
              <MenuItem value="lost">Lost</MenuItem>
            </TextField>
            <TextField
              size="small"
              select
              label="Stage"
              value={draftFieldFilters.f_stage_id ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_stage_id: e.target.value }))}
            >
              <MenuItem value="">Any</MenuItem>
              {stages.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Title"
              value={draftFieldFilters.f_title ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_title: e.target.value }))}
            />
            <TextField
              size="small"
              label="Value"
              value={draftFieldFilters.f_value ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_value: e.target.value }))}
            />
            <TextField
              size="small"
              label="Currency"
              value={draftFieldFilters.f_currency ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_currency: e.target.value }))}
            />
            <TextField
              size="small"
              label="Expected Close Date"
              value={draftFieldFilters.f_expected_close_date ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_expected_close_date: e.target.value }))}
            />
            <TextField
              size="small"
              label="Probability"
              value={draftFieldFilters.f_probability ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_probability: e.target.value }))}
            />
            <TextField
              size="small"
              label="Lost Reason"
              value={draftFieldFilters.f_lost_reason ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_lost_reason: e.target.value }))}
            />
            <TextField
              size="small"
              label="Contact ID"
              value={draftFieldFilters.f_contact_id ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_contact_id: e.target.value }))}
            />
            <TextField
              size="small"
              label="Company ID"
              value={draftFieldFilters.f_company_id ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_company_id: e.target.value }))}
            />
            <TextField
              size="small"
              label="Assigned To User ID"
              value={draftFieldFilters.f_assigned_to ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_assigned_to: e.target.value }))}
            />
            <TextField
              size="small"
              label="Created At"
              value={draftFieldFilters.f_created_at ?? ''}
              onChange={(e) => setDraftFieldFilters((prev) => ({ ...prev, f_created_at: e.target.value }))}
            />
            {customFields?.map((field) => renderCustomFilterField(field))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDraftFieldFilters({});
              setDraftCustomFilters({});
            }}
          >
            Clear Draft
          </Button>
          <Button onClick={() => setFilterOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFieldFilters(draftFieldFilters);
              setCustomFilters(draftCustomFilters);
              setFilterOpen(false);
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
