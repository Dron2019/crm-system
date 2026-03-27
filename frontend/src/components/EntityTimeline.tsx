import {
  Box,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import NoteIcon from '@mui/icons-material/StickyNote2';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import GroupsIcon from '@mui/icons-material/Groups';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import type { TimelineItem } from '@/hooks/useEntityActions';

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  activity: { icon: <EventNoteIcon fontSize="small" />, color: '#1976d2' },
  note: { icon: <NoteIcon fontSize="small" />, color: '#ed6c02' },
  deal: { icon: <HandshakeIcon fontSize="small" />, color: '#2e7d32' },
};

const subtypeIcons: Record<string, React.ReactNode> = {
  call: <PhoneIcon fontSize="small" />,
  email: <EmailIcon fontSize="small" />,
  meeting: <GroupsIcon fontSize="small" />,
  task: <TaskAltIcon fontSize="small" />,
};

interface EntityTimelineProps {
  items: TimelineItem[];
  loading?: boolean;
}

export default function EntityTimeline({ items, loading }: EntityTimelineProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Box py={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          No timeline events yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {items.map((item, index) => {
        const config = typeConfig[item.type] ?? typeConfig.activity;
        const icon = subtypeIcons[item.subtype] ?? config.icon;
        const isLast = index === items.length - 1;

        return (
          <Box key={item.id} display="flex" gap={2}>
            {/* Timeline connector */}
            <Box display="flex" flexDirection="column" alignItems="center" sx={{ minWidth: 32 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: `${config.color}15`,
                  color: config.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flexGrow: 1,
                    bgcolor: 'divider',
                    minHeight: 24,
                  }}
                />
              )}
            </Box>

            {/* Content */}
            <Box pb={isLast ? 0 : 2.5} sx={{ flex: 1, minWidth: 0 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                  {item.title}
                </Typography>
                <Chip
                  label={item.type}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: `${config.color}15`,
                    color: config.color,
                    fontWeight: 600,
                  }}
                />
              </Box>
              {item.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {item.description}
                </Typography>
              )}
              <Box display="flex" gap={1} mt={0.5}>
                {item.user && (
                  <Typography variant="caption" color="text.secondary">
                    {item.user}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(item.occurred_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
