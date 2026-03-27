import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid2 as Grid,
  Chip,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompanies';
import { useEntityDeals, useEntityActivities, useEntityTimeline } from '@/hooks/useEntityActions';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityTimeline from '@/components/EntityTimeline';
import CommentsSection from '@/components/CommentsSection';
import api from '@/lib/api';
import type { Contact } from '@/types';
import { useCurrencyStore } from '@/stores/currencyStore';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) {
    return (
      <Box display="grid" gridTemplateColumns="26px 140px 1fr" py={0.75} gap={1}>
        <Box color="text.disabled">{icon}</Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" color="text.disabled">—</Typography>
      </Box>
    );
  }

  return (
    <Box display="grid" gridTemplateColumns="26px 140px 1fr" py={0.75} gap={1}>
      <Box color="text.secondary">{icon}</Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatMoney = useCurrencyStore((s) => s.format);
  const formatMoneyCompact = useCurrencyStore((s) => s.formatCompact);
  const { data: company, isLoading } = useCompany(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: timeline, isLoading: timelineLoading } = useEntityTimeline('companies', id ?? '');
  const { data: dealsData } = useEntityDeals('companies', id ?? '');
  const { data: activitiesData } = useEntityActivities('companies', id ?? '');
  const { data: contactsData } = useQuery<{ data: Contact[] }>({
    queryKey: ['entity-contacts', id],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${id}/contacts`);
      return data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      addToast('Company deleted');
      navigate('/companies');
    },
    onError: () => addToast('Failed to delete company', 'error'),
  });

  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (!company) {
    return (
      <Box py={4}>
        <Typography>Company not found.</Typography>
        <Button onClick={() => navigate('/companies')} sx={{ mt: 2 }}>Back to Companies</Button>
      </Box>
    );
  }

  const formatRevenue = (revenue: string | null) => {
    if (!revenue) return null;
    return formatMoneyCompact(Number(revenue), 'USD');
  };

  const address = [company.address_line_1, company.address_line_2, company.city, company.state, company.postal_code, company.country]
    .filter(Boolean).join(', ');

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton onClick={() => navigate('/companies')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'secondary.main' }}>
          <BusinessIcon />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={500}>{company.name}</Typography>
          <Typography variant="body2" color="text.secondary">{company.industry}</Typography>
        </Box>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/companies/${id}/edit`)}>
          Edit
        </Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Company"
        message={`Are you sure you want to delete ${company.name}? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={500} mb={1.25}>Company Details</Typography>
            <InfoRow icon={<LanguageIcon fontSize="small" />} label="Domain" value={company.domain} />
            <InfoRow icon={<LanguageIcon fontSize="small" />} label="Website" value={company.website} />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={company.phone} />
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="Industry" value={company.industry} />
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="Size" value={company.size} />
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="Annual Revenue" value={formatRevenue(company.annual_revenue)} />
            <InfoRow icon={<LocationOnIcon fontSize="small" />} label="Address" value={address || null} />
            <InfoRow
              icon={<BusinessIcon fontSize="small" />}
              label="Created"
              value={company.created_at ? new Date(company.created_at).toLocaleString() : null}
            />

            <Divider sx={{ my: 1.25 }} />

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Tags</Typography>
            {company.tags && company.tags.length > 0 ? (
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {company.tags.map((tag) => (
                  <Chip key={tag.id} size="small" label={tag.name} sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 700 }} />
                ))}
              </Box>
            ) : (
              <Typography variant="body2">No tags</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Box px={2} pt={1.5}>
              <Typography variant="h6" fontWeight={500}>History</Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Timeline" />
              <Tab label={`Contacts (${contactsData?.data?.length ?? 0})`} />
              <Tab label={`Deals (${dealsData?.data?.length ?? 0})`} />
              <Tab label={`Activities (${activitiesData?.data?.length ?? 0})`} />
              <Tab label="Comments" />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                <EntityTimeline items={timeline ?? []} loading={timelineLoading} />
              )}
              {tab === 1 && (
                contactsData?.data && contactsData.data.length > 0 ? (
                  <List disablePadding>
                    {contactsData.data.map((contact) => (
                      <ListItem
                        key={contact.id}
                        sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                            {contact.first_name.charAt(0)}{contact.last_name?.charAt(0) ?? ''}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={contact.full_name}
                          secondary={contact.email}
                          primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>No contacts linked.</Typography>
                )
              )}
              {tab === 2 && (
                dealsData?.data && dealsData.data.length > 0 ? (
                  <List disablePadding>
                    {dealsData.data.map((deal) => (
                      <ListItem
                        key={deal.id}
                        sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <ListItemText
                          primary={deal.title}
                          secondary={formatMoney(Number(deal.value), deal.currency)}
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={deal.status}
                          size="small"
                          color={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'error' : 'default'}
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>No deals yet.</Typography>
                )
              )}
              {tab === 3 && (
                activitiesData?.data && activitiesData.data.length > 0 ? (
                  <List disablePadding>
                    {activitiesData.data.map((activity) => (
                      <ListItem key={activity.id} divider>
                        <ListItemText
                          primary={activity.title}
                          secondary={`${activity.type} · ${new Date(activity.created_at).toLocaleDateString()}`}
                          primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                        />
                        {activity.is_completed && <Chip label="Done" size="small" color="success" />}
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>No activities yet.</Typography>
                )
              )}
              {tab === 4 && (
                <CommentsSection entityType="company" entityId={id!} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
