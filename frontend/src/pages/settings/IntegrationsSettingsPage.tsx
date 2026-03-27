import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StorageIcon from '@mui/icons-material/Storage';

const integrations = [
  {
    id: 'email',
    name: 'Email (IMAP/SMTP)',
    description: 'Connect your email account to send and receive emails directly in the CRM.',
    icon: <EmailIcon />,
    status: 'available' as const,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'Sync your activities and meetings with Google Calendar.',
    icon: <CalendarTodayIcon />,
    status: 'coming_soon' as const,
  },
  {
    id: 'storage',
    name: 'Cloud Storage',
    description: 'Connect Google Drive, Dropbox, or OneDrive for file attachments.',
    icon: <StorageIcon />,
    status: 'coming_soon' as const,
  },
];

export default function IntegrationsSettingsPage() {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Integrations
      </Typography>

      {integrations.map((integration) => (
        <Card key={integration.id} sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.50',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {integration.icon}
            </Box>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {integration.name}
                </Typography>
                <Chip
                  label={integration.status === 'available' ? 'Available' : 'Coming Soon'}
                  size="small"
                  color={integration.status === 'available' ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {integration.description}
              </Typography>
            </Box>
            <Button
              variant={integration.status === 'available' ? 'contained' : 'outlined'}
              disabled={integration.status === 'coming_soon'}
            >
              {integration.status === 'available' ? 'Configure' : 'Coming Soon'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
