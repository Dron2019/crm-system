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
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PersonIcon from '@mui/icons-material/Person';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContact } from '@/hooks/useContacts';
import { useEntityActivities, useEntityDeals, useEntityTimeline } from '@/hooks/useEntityActions';
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityTimeline from '@/components/EntityTimeline';
import CommentsSection from '@/components/CommentsSection';
import api from '@/lib/api';
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formatMoney = useCurrencyStore((s) => s.format);
  const { data: contact, isLoading } = useContact(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const { data: timeline, isLoading: timelineLoading } = useEntityTimeline('contacts', id ?? '');
  const { data: dealsData } = useEntityDeals('contacts', id ?? '');
  const { data: activitiesData } = useEntityActivities('contacts', id ?? '');

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast('Contact deleted');
      navigate('/contacts');
    },
    onError: () => addToast('Failed to delete contact', 'error'),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contact) {
    return (
      <Box py={4}>
        <Typography>Contact not found.</Typography>
        <Button onClick={() => navigate('/contacts')} sx={{ mt: 2 }}>Back to Contacts</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton onClick={() => navigate('/contacts')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: 20 }}>
          {contact.first_name.charAt(0)}{contact.last_name?.charAt(0) ?? ''}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={500}>{contact.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{contact.job_title || 'No job title'}</Typography>
        </Box>
        <Chip
          label={contact.status}
          color={contact.status === 'customer' ? 'success' : contact.status === 'lead' ? 'warning' : 'primary'}
          variant="outlined"
        />
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/contacts/${id}/edit`)}>
          Edit
        </Button>
        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contact.full_name}? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={500} mb={1.25}>Contact Details</Typography>
            <InfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={contact.email} />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={contact.phone} />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="Mobile" value={contact.mobile} />
            <InfoRow icon={<PersonIcon fontSize="small" />} label="Source" value={contact.source} />
            <InfoRow icon={<PersonIcon fontSize="small" />} label="Status" value={contact.status} />
            <InfoRow icon={<PersonIcon fontSize="small" />} label="Assigned" value={contact.assigned_to?.name} />
            <InfoRow
              icon={<PersonIcon fontSize="small" />}
              label="Created"
              value={contact.created_at ? new Date(contact.created_at).toLocaleString() : null}
            />

            <Divider sx={{ my: 1.25 }} />

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Companies</Typography>
            {contact.companies && contact.companies.length > 0 ? (
              <List dense disablePadding>
                {contact.companies.map((company) => (
                  <ListItem
                    key={company.id}
                    sx={{ px: 0, cursor: 'pointer' }}
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    <ListItemAvatar sx={{ minWidth: 34 }}>
                      <Avatar sx={{ width: 26, height: 26, bgcolor: 'secondary.main' }}>
                        <BusinessIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={company.name}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2">No linked companies</Typography>
            )}

            <Box mt={1.25}>
              <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
                <LocalOfferIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">Tags</Typography>
              </Box>
              {contact.tags && contact.tags.length > 0 ? (
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {contact.tags.map((tag) => (
                    <Chip key={tag.id} size="small" label={tag.name} sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 700 }} />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2">No tags</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Box px={2} pt={1.5}>
              <Typography variant="h6" fontWeight={500}>History</Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Timeline" />
              <Tab label={`Deals (${dealsData?.data?.length ?? 0})`} />
              <Tab label={`Activities (${activitiesData?.data?.length ?? 0})`} />
              <Tab label="Comments" />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                <EntityTimeline items={timeline ?? []} loading={timelineLoading} />
              )}
              {tab === 1 && (
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
                          secondary={`${formatMoney(Number(deal.value), deal.currency)} · ${deal.stage?.name ?? deal.status}`}
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
              {tab === 2 && (
                activitiesData?.data && activitiesData.data.length > 0 ? (
                  <List disablePadding>
                    {activitiesData.data.map((activity) => (
                      <ListItem key={activity.id} divider>
                        <ListItemText
                          primary={activity.title}
                          secondary={`${activity.type} · ${new Date(activity.created_at).toLocaleDateString()}`}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                        {activity.is_completed && <Chip label="Done" size="small" color="success" />}
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>No activities yet.</Typography>
                )
              )}
              {tab === 3 && (
                <CommentsSection entityType="contact" entityId={id!} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
