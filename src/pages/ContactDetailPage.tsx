import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
import { useToastStore } from '@/stores/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import api from '@/lib/api';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Box display="flex" alignItems="center" gap={1.5} py={1}>
      <Box color="text.secondary">{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  );
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

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
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/contacts')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: 20 }}>
          {contact.first_name.charAt(0)}{contact.last_name?.charAt(0) ?? ''}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>{contact.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{contact.job_title}</Typography>
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
        {/* Left column - Details */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Details</Typography>
              <InfoRow icon={<EmailIcon fontSize="small" />} label="Email" value={contact.email} />
              <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={contact.phone} />
              <InfoRow icon={<PhoneIcon fontSize="small" />} label="Mobile" value={contact.mobile} />
              <InfoRow icon={<PersonIcon fontSize="small" />} label="Source" value={contact.source} />
              <InfoRow icon={<PersonIcon fontSize="small" />} label="Assigned To" value={contact.assigned_to?.name} />

              {contact.tags && contact.tags.length > 0 && (
                <Box mt={2}>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                    <LocalOfferIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">Tags</Typography>
                  </Box>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {contact.tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Companies */}
          {contact.companies && contact.companies.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={1}>Companies</Typography>
                <List disablePadding>
                  {contact.companies.map((company) => (
                    <ListItem
                      key={company.id}
                      disablePadding
                      sx={{ py: 0.5, cursor: 'pointer' }}
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>
                          <BusinessIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={company.name}
                        secondary={company.industry}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right column - Tabs: Activities, Deals, Notes */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label={`Deals (${contact.deals?.length ?? 0})`} />
              <Tab label={`Activities (${contact.activities?.length ?? 0})`} />
              <Tab label={`Notes (${contact.notes?.length ?? 0})`} />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                contact.deals && contact.deals.length > 0 ? (
                  <List disablePadding>
                    {contact.deals.map((deal) => (
                      <ListItem
                        key={deal.id}
                        sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <ListItemText
                          primary={deal.title}
                          secondary={`${deal.currency} ${Number(deal.value).toLocaleString()} · ${deal.stage?.name ?? deal.status}`}
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
              {tab === 1 && (
                contact.activities && contact.activities.length > 0 ? (
                  <List disablePadding>
                    {contact.activities.map((activity) => (
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
              {tab === 2 && (
                contact.notes && contact.notes.length > 0 ? (
                  <List disablePadding>
                    {contact.notes.map((note) => (
                      <ListItem key={note.id} divider sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Box display="flex" justifyContent="space-between" width="100%" mb={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {note.user?.name} · {new Date(note.created_at).toLocaleDateString()}
                          </Typography>
                          {note.is_pinned && <Chip label="Pinned" size="small" color="warning" />}
                        </Box>
                        <Typography variant="body2">{note.body}</Typography>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" py={2}>No notes yet.</Typography>
                )
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
