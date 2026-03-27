import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface EmailMessage {
  id: string;
  subject: string;
  from_email: string;
  from_name: string | null;
  to_recipients: string[];
  body_html: string | null;
  body_text: string | null;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  is_starred: boolean;
  contact?: { id: string; first_name: string; last_name: string; email: string } | null;
  sent_at: string | null;
  created_at: string;
}

const composeSchema = z.object({
  to: z.string().min(1, 'Recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

type ComposeFormData = z.infer<typeof composeSchema>;

type Folder = 'inbox' | 'sent' | 'starred';

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ data: EmailMessage[]; meta?: { total: number } }>({
    queryKey: ['emails', folder, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (folder === 'inbox') params.direction = 'inbound';
      if (folder === 'sent') params.direction = 'outbound';
      if (folder === 'starred') params.is_starred = '1';
      if (search) params.search = search;
      const { data } = await api.get('/emails/messages', { params });
      return data;
    },
  });

  const messages = data?.data ?? [];

  const { data: selectedMessage, isLoading: messageLoading } = useQuery<EmailMessage>({
    queryKey: ['email', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/emails/messages/${selectedId}`);
      return data.data;
    },
    enabled: !!selectedId,
  });

  const starMutation = useMutation({
    mutationFn: (id: string) => api.post(`/emails/messages/${id}/star`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (formData: ComposeFormData) =>
      api.post('/emails/messages', {
        to: formData.to.split(',').map((e) => e.trim()),
        subject: formData.subject,
        body: formData.body,
        email_account_id: '', // First account, configured in settings
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setComposeOpen(false);
      reset();
    },
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', subject: '', body: '' },
  });

  const folders: { label: string; key: Folder; icon: React.ReactNode }[] = [
    { label: 'Inbox', key: 'inbox', icon: <InboxIcon /> },
    { label: 'Sent', key: 'sent', icon: <SendIcon /> },
    { label: 'Starred', key: 'starred', icon: <StarIcon /> },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Emails</Typography>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => setComposeOpen(true)}>
          Compose
        </Button>
      </Box>

      <Box display="flex" gap={2} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <Paper sx={{ width: 200, flexShrink: 0 }}>
          <List disablePadding>
            {folders.map((f) => (
              <ListItem key={f.key} disablePadding>
                <ListItemButton
                  selected={folder === f.key}
                  onClick={() => { setFolder(f.key); setSelectedId(null); }}
                >
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    {f.icon}
                  </ListItemAvatar>
                  <ListItemText primary={f.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Message list or detail */}
        <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selectedId ? (
            /* Message detail */
            <Box sx={{ overflow: 'auto', flex: 1 }}>
              <Box p={2} display="flex" alignItems="center" gap={1}>
                <IconButton onClick={() => setSelectedId(null)}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={600} noWrap flex={1}>
                  {selectedMessage?.subject ?? 'Loading…'}
                </Typography>
              </Box>
              <Divider />
              {messageLoading ? (
                <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              ) : selectedMessage ? (
                <Box p={3}>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedMessage.from_name ?? selectedMessage.from_email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        To: {selectedMessage.to_recipients.join(', ')}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {selectedMessage.sent_at
                        ? new Date(selectedMessage.sent_at).toLocaleString()
                        : new Date(selectedMessage.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {selectedMessage.body_html ? (
                    <Box
                      dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }}
                      sx={{ '& img': { maxWidth: '100%' }, lineHeight: 1.6 }}
                    />
                  ) : (
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {selectedMessage.body_text ?? '(No content)'}
                    </Typography>
                  )}
                </Box>
              ) : null}
            </Box>
          ) : (
            /* Message list */
            <>
              <Box p={1.5}>
                <TextField
                  placeholder="Search emails…"
                  size="small"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Divider />
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                ) : messages.length === 0 ? (
                  <Box py={4} textAlign="center">
                    <Typography color="text.secondary">No emails found.</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {messages.map((msg) => (
                      <ListItem
                        key={msg.id}
                        disablePadding
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              starMutation.mutate(msg.id);
                            }}
                          >
                            {msg.is_starred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                          </IconButton>
                        }
                      >
                        <ListItemButton
                          onClick={() => setSelectedId(msg.id)}
                          sx={{ bgcolor: msg.is_read ? 'transparent' : 'action.hover' }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                              {(msg.from_name ?? msg.from_email).charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography
                                  variant="body2"
                                  fontWeight={msg.is_read ? 400 : 700}
                                  noWrap
                                  sx={{ flex: 1, mr: 2 }}
                                >
                                  {msg.subject}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {msg.sent_at
                                    ? new Date(msg.sent_at).toLocaleDateString()
                                    : new Date(msg.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {msg.direction === 'outbound' ? `To: ${msg.to_recipients[0]}` : msg.from_name ?? msg.from_email}
                                {msg.body_text ? ` — ${msg.body_text.substring(0, 80)}` : ''}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Compose dialog */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Email</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="compose-form"
            onSubmit={handleSubmit((d) => sendMutation.mutateAsync(d))}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
          >
            <Controller name="to" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="To"
                fullWidth
                required
                placeholder="email@example.com"
                error={!!errors.to}
                helperText={errors.to?.message || 'Separate multiple with commas'}
              />
            )} />
            <Controller name="subject" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="Subject"
                fullWidth
                required
                error={!!errors.subject}
                helperText={errors.subject?.message}
              />
            )} />
            <Controller name="body" control={control} render={({ field }) => (
              <TextField
                {...field}
                label="Message"
                fullWidth
                multiline
                rows={10}
                required
                error={!!errors.body}
                helperText={errors.body?.message}
              />
            )} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>Discard</Button>
          <Button
            variant="contained"
            type="submit"
            form="compose-form"
            startIcon={<SendIcon />}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
