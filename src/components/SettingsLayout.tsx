import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import SecurityIcon from '@mui/icons-material/Security';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TuneIcon from '@mui/icons-material/Tune';
import WebhookIcon from '@mui/icons-material/Webhook';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import PaymentIcon from '@mui/icons-material/Payment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuthStore } from '@/stores/authStore';

function isAdminRole(user: any): boolean {
  if (user?.is_system_admin) return true;
  const role = user?.current_team_role;
  return role === 'owner' || role === 'admin';
}

export default function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const settingsNav = [
    { label: 'General', icon: <PersonIcon />, path: '/settings' },
    { label: 'Members', icon: <GroupIcon />, path: '/settings/members' },
    { label: 'Security', icon: <SecurityIcon />, path: '/settings/security' },
    { label: 'Pipelines', icon: <ViewKanbanIcon />, path: '/settings/pipelines' },
    { label: 'Custom Fields', icon: <TuneIcon />, path: '/settings/custom-fields' },
    { label: 'Integrations', icon: <IntegrationInstructionsIcon />, path: '/settings/integrations' },
    { label: 'Webhooks', icon: <WebhookIcon />, path: '/settings/webhooks' },
    { label: 'Billing', icon: <PaymentIcon />, path: '/settings/billing' },
    ...(isAdminRole(user)
      ? [
          { label: 'Roles', icon: <AdminPanelSettingsIcon />, path: '/settings/roles' },
          { label: 'Users', icon: <GroupIcon />, path: '/settings/users' },
          { label: 'Teams', icon: <GroupsIcon />, path: '/settings/teams' },
          { label: 'Imports', icon: <CloudUploadIcon />, path: '/settings/imports' },
        ]
      : []),
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Settings
      </Typography>
      <Box display="flex" gap={3} sx={{ flexDirection: { xs: 'column', md: 'row' } }}>
        <Paper sx={{ minWidth: 220, flexShrink: 0 }}>
          <List disablePadding>
            {settingsNav.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
        <Box flex={1} minWidth={0}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
