import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  Box,
  InputBase,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import { useAppStore } from '@/stores/appStore';

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export default function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const commands = useMemo<CommandItem[]>(
    () => [
      // Navigation
      { id: 'nav-dashboard', label: 'Go to Dashboard', section: 'Navigation', icon: <DashboardIcon fontSize="small" />, action: () => go('/'), keywords: 'home' },
      { id: 'nav-contacts', label: 'Go to Contacts', section: 'Navigation', icon: <PeopleIcon fontSize="small" />, action: () => go('/contacts'), keywords: 'people' },
      { id: 'nav-companies', label: 'Go to Companies', section: 'Navigation', icon: <BusinessIcon fontSize="small" />, action: () => go('/companies'), keywords: 'organizations' },
      { id: 'nav-deals', label: 'Go to Deals', section: 'Navigation', icon: <HandshakeIcon fontSize="small" />, action: () => go('/deals'), keywords: 'pipeline sales' },
      { id: 'nav-activities', label: 'Go to Activities', section: 'Navigation', icon: <EventNoteIcon fontSize="small" />, action: () => go('/activities'), keywords: 'tasks calls meetings' },
      { id: 'nav-pipelines', label: 'Go to Pipelines', section: 'Navigation', icon: <ViewKanbanIcon fontSize="small" />, action: () => go('/pipelines'), keywords: 'kanban stages' },
      { id: 'nav-reports', label: 'Go to Reports', section: 'Navigation', icon: <AssessmentIcon fontSize="small" />, action: () => go('/reports'), keywords: 'analytics charts' },
      { id: 'nav-team', label: 'Go to Team', section: 'Navigation', icon: <GroupIcon fontSize="small" />, action: () => go('/team'), keywords: 'members invite' },
      { id: 'nav-settings', label: 'Go to Settings', section: 'Navigation', icon: <SettingsIcon fontSize="small" />, action: () => go('/settings'), keywords: 'preferences configuration' },
      // Create
      { id: 'create-contact', label: 'New Contact', section: 'Create', icon: <AddIcon fontSize="small" />, action: () => go('/contacts/new'), keywords: 'add person' },
      { id: 'create-company', label: 'New Company', section: 'Create', icon: <AddIcon fontSize="small" />, action: () => go('/companies/new'), keywords: 'add organization' },
      { id: 'create-deal', label: 'New Deal', section: 'Create', icon: <AddIcon fontSize="small" />, action: () => go('/deals/new'), keywords: 'add opportunity' },
    ],
    [go],
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.section.toLowerCase().includes(lower) ||
        c.keywords?.toLowerCase().includes(lower),
    );
  }, [commands, query]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  // Arrow navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIndex]);

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  let flatIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: 480, mt: '-10vh' },
      }}
      TransitionProps={{
        onEntered: () => inputRef.current?.focus(),
      }}
    >
      <Box display="flex" alignItems="center" px={2} py={1} gap={1}>
        <SearchIcon color="action" />
        <InputBase
          inputRef={inputRef}
          placeholder="Type a command or search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          sx={{ fontSize: '0.95rem' }}
        />
        <Chip
          label="ESC"
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20, cursor: 'pointer' }}
          onClick={handleClose}
        />
      </Box>
      <Divider />
      <List dense sx={{ py: 0, maxHeight: 380, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <Box py={4} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No results found.
            </Typography>
          </Box>
        )}
        {Array.from(grouped.entries()).map(([section, items]) => (
          <Box key={section}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {section}
            </Typography>
            {items.map((item) => {
              flatIndex++;
              const isSelected = flatIndex === selectedIndex;
              return (
                <ListItem
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setQuery('');
                  }}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 1,
                    mx: 1,
                    width: 'auto',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              );
            })}
          </Box>
        ))}
      </List>
    </Dialog>
  );
}
