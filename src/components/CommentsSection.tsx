import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  List,
  ListItem,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { Note } from '@/types';

interface CommentsSectionProps {
  entityType: 'contact' | 'company' | 'deal' | 'activity';
  entityId: string;
}

export default function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);

  const queryKey = ['comments', entityType, entityId];

  const { data, isLoading } = useQuery<{ data: Note[] }>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get('/notes', {
        params: { notable_type: entityType, notable_id: entityId, per_page: 100 },
      });
      return data;
    },
    enabled: !!entityId,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) =>
      api.post('/notes', { notable_type: entityType, notable_id: entityId, body: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setBody('');
    },
    onError: () => addToast('Failed to add comment', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => addToast('Failed to delete comment', 'error'),
  });

  const pinMutation = useMutation({
    mutationFn: (noteId: string) => api.post(`/notes/${noteId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const canDelete = (comment: Note) =>
    user?.id === comment.user?.id ||
    user?.current_team_role === 'owner' ||
    user?.current_team_role === 'admin';

  const comments = data?.data ?? [];

  return (
    <Box>
      {/* Input */}
      <Box display="flex" gap={1.5} alignItems="flex-start" mb={2.5}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, mt: 0.5 }}>
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </Avatar>
        <Box flex={1}>
          <TextField
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment… (Ctrl+Enter to submit)"
            fullWidth
            multiline
            minRows={1}
            maxRows={6}
            size="small"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) {
                addMutation.mutate(body.trim());
              }
            }}
          />
          <Box display="flex" justifyContent="flex-end" mt={0.75}>
            <Button
              size="small"
              variant="contained"
              endIcon={addMutation.isPending ? undefined : <SendIcon />}
              disabled={!body.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate(body.trim())}
            >
              {addMutation.isPending ? <CircularProgress size={16} color="inherit" /> : 'Comment'}
            </Button>
          </Box>
        </Box>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!isLoading && comments.length === 0 && (
        <Typography variant="body2" color="text.secondary" py={1}>
          No comments yet. Be the first to comment.
        </Typography>
      )}

      {comments.length > 0 && (
        <List disablePadding>
          {comments.map((comment, i) => (
            <Box key={comment.id}>
              {i > 0 && <Divider sx={{ my: 1.5 }} />}
              <ListItem
                disableGutters
                alignItems="flex-start"
                sx={{ gap: 1.5, pr: 8 }}
              >
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 13, flexShrink: 0, mt: 0.25 }}
                >
                  {comment.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Avatar>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.4}>
                    <Typography variant="caption" fontWeight={700}>
                      {comment.user?.name ?? 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.created_at).toLocaleString()}
                    </Typography>
                    {comment.is_pinned && (
                      <Chip
                        label="Pinned"
                        size="small"
                        color="warning"
                        sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {comment.body}
                  </Typography>
                </Box>
                {/* Actions */}
                <Box
                  sx={{
                    position: 'absolute' as const,
                    right: 0,
                    top: 0,
                    display: 'flex',
                    gap: 0.25,
                    opacity: 0,
                    '& button': { transition: 'opacity 0.1s' },
                    '.MuiListItem-root:hover &': { opacity: 1 },
                  }}
                >
                  <IconButton
                    size="small"
                    title={comment.is_pinned ? 'Unpin' : 'Pin'}
                    color={comment.is_pinned ? 'warning' : 'default'}
                    onClick={() => pinMutation.mutate(comment.id)}
                  >
                    <PushPinIcon fontSize="small" />
                  </IconButton>
                  {canDelete(comment) && (
                    <IconButton
                      size="small"
                      color="error"
                      title="Delete"
                      onClick={() => deleteMutation.mutate(comment.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </ListItem>
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}
