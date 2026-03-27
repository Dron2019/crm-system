import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications(1);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = (data as { data?: unknown[] } | undefined)?.data ?? [];
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = (notification: {
    id: string;
    is_read: boolean;
    action_url?: string | null;
  }) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      handleClose();
      navigate(notification.action_url);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ mr: 1 }}>
        <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={99}>
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, maxHeight: 520, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon fontSize="small" />}
              onClick={handleMarkAllRead}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={6}
              color="text.secondary"
            >
              <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
              <Typography variant="body2">No notifications yet</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {(notifications as {
                id: string;
                title: string;
                body: string | null;
                type: string;
                is_read: boolean;
                action_url: string | null;
                created_at: string;
              }[]).map((n, idx) => (
                <Box key={n.id}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                      !n.is_read && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            mr: 1,
                          }}
                        />
                      )
                    }
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(n)}
                      sx={{
                        py: 1.5,
                        bgcolor: n.is_read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                              variant="body2"
                              fontWeight={n.is_read ? 400 : 600}
                              sx={{ flexGrow: 1 }}
                            >
                              {n.title}
                            </Typography>
                            <Chip
                              label={n.type.replace(/_/g, ' ')}
                              size="small"
                              sx={{ fontSize: '0.65rem', height: 18, textTransform: 'capitalize' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            {n.body && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                noWrap
                              >
                                {n.body}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.disabled">
                              {new Date(n.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {idx < notifications.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Button
              size="small"
              onClick={() => {
                handleClose();
                navigate('/notifications');
              }}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}
