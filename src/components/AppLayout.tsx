import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  FormControl,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EmailIcon from '@mui/icons-material/Email';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import CommandPalette from '@/components/CommandPalette';
import NotificationBell from '@/components/NotificationBell';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useCurrencyStore } from '@/stores/currencyStore';
import api from '@/lib/api';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Contacts', icon: <PeopleIcon />, path: '/contacts' },
  { label: 'Companies', icon: <BusinessIcon />, path: '/companies' },
  { label: 'Deals', icon: <HandshakeIcon />, path: '/deals' },
  { label: 'Objects', icon: <ApartmentIcon />, path: '/objects' },
  { label: 'Activities', icon: <EventNoteIcon />, path: '/activities' },
  { label: 'Calendar', icon: <CalendarTodayIcon />, path: '/calendar' },
  { label: 'Emails', icon: <EmailIcon />, path: '/emails' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'Team', icon: <GroupIcon />, path: '/team' },
  { label: 'Workflows', icon: <AutoAwesomeIcon />, path: '/workflows' },
  { label: 'Audit Log', icon: <HistoryIcon />, path: '/audit-log' },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const { user, logout, fetchUser } = useAuthStore();
  const { toggleThemeMode, themeMode, setCommandPaletteOpen } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Load currencies and sync user's display currency preference
  const { data: currencies = [] } = useCurrencies();
  const displayCurrency = useCurrencyStore((s) => s.displayCurrency);
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency);
  useEffect(() => {
    if (user?.display_currency) {
      setDisplayCurrency(user.display_currency);
    }
  }, [user?.display_currency, setDisplayCurrency]);

  const handleCurrencyChange = async (event: SelectChangeEvent<string>) => {
    const nextCurrency = event.target.value;
    const prevCurrency = displayCurrency;

    setDisplayCurrency(nextCurrency);

    if (!user) return;

    try {
      setSavingCurrency(true);
      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('name', user.name);
      formData.append('email', user.email);
      formData.append('timezone', user.timezone ?? 'UTC');
      formData.append('display_currency', nextCurrency);

      await api.post('/user/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchUser();
    } catch {
      // Roll back visual state if persistence failed.
      setDisplayCurrency(prevCurrency);
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" fontWeight={700} color="primary">
          CRM System
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}
        color="default"
        elevation={0}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={() => setCommandPaletteOpen(true)} sx={{ mr: 1 }}>
            <SearchIcon />
          </IconButton>
          <FormControl size="small" sx={{ mr: 1, minWidth: 108 }}>
            <Select
              value={displayCurrency || user?.display_currency || 'USD'}
              onChange={handleCurrencyChange}
              disabled={savingCurrency || currencies.length === 0}
              displayEmpty
              sx={{
                '& .MuiSelect-select': {
                  py: 0.75,
                  fontSize: 13,
                  fontWeight: 600,
                },
              }}
            >
              {currencies.map((currency) => (
                <MenuItem key={currency.code} value={currency.code}>
                  {currency.code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <NotificationBell />
          <IconButton onClick={toggleThemeMode} sx={{ mr: 1 }}>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {user?.name?.charAt(0) ?? 'U'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      <CommandPalette />
    </Box>
  );
}
