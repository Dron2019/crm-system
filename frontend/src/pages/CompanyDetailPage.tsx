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
import BusinessIcon from '@mui/icons-material/Business';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompanies';
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

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(id!);
  const [tab, setTab] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

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
    const num = Number(revenue);
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num}`;
  };

  const address = [company.address_line_1, company.address_line_2, company.city, company.state, company.postal_code, company.country]
    .filter(Boolean).join(', ');

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/companies')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, bgcolor: 'secondary.main' }}>
          <BusinessIcon />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>{company.name}</Typography>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>Details</Typography>
              <InfoRow icon={<LanguageIcon fontSize="small" />} label="Domain" value={company.domain} />
              <InfoRow icon={<LanguageIcon fontSize="small" />} label="Website" value={company.website} />
              <InfoRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={company.phone} />
              <InfoRow icon={<BusinessIcon fontSize="small" />} label="Size" value={company.size} />
              <InfoRow icon={<BusinessIcon fontSize="small" />} label="Annual Revenue" value={formatRevenue(company.annual_revenue)} />
              {address && <InfoRow icon={<LocationOnIcon fontSize="small" />} label="Address" value={address} />}

              {company.tags && company.tags.length > 0 && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Tags</Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {company.tags.map((tag) => (
                      <Chip key={tag.id} label={tag.name} size="small" sx={{ bgcolor: `${tag.color}20`, color: tag.color, fontWeight: 600 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label={`Contacts (${company.contacts?.length ?? 0})`} />
              <Tab label={`Deals (${company.deals?.length ?? 0})`} />
            </Tabs>
            <Box p={2}>
              {tab === 0 && (
                company.contacts && company.contacts.length > 0 ? (
                  <List disablePadding>
                    {company.contacts.map((contact) => (
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
              {tab === 1 && (
                company.deals && company.deals.length > 0 ? (
                  <List disablePadding>
                    {company.deals.map((deal) => (
                      <ListItem
                        key={deal.id}
                        sx={{ cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <ListItemText
                          primary={deal.title}
                          secondary={`${deal.currency} ${Number(deal.value).toLocaleString()}`}
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
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
