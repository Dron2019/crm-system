# CRM System — Frontend Architecture

> Companion to [01-DEVELOPMENT-GUIDE.md](01-DEVELOPMENT-GUIDE.md)  
> React 18+ · TypeScript · MUI v6 · TanStack Query · Zustand

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [MUI Theme & Design System](#2-mui-theme--design-system)
3. [Component Patterns](#3-component-patterns)
4. [State Management](#4-state-management)
5. [Routing & Navigation](#5-routing--navigation)
6. [Forms & Validation](#6-forms--validation)
7. [Key UI Components](#7-key-ui-components)
8. [Performance Optimization](#8-performance-optimization)
9. [Accessibility](#9-accessibility)
10. [Internationalization](#10-internationalization)

---

## 1. Architecture Overview

### Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                    PAGES                             │
│  Route-level components. Compose modules.             │
│  Handle layout, data loading, error boundaries.       │
├─────────────────────────────────────────────────────┤
│                    MODULES                            │
│  Feature-specific code (contacts, deals, etc.)        │
│  Components, hooks, API calls, local state.           │
├─────────────────────────────────────────────────────┤
│                    SHARED                             │
│  Reusable components, hooks, utilities.               │
│  Theme, API client, types, permissions.               │
├─────────────────────────────────────────────────────┤
│                  PROVIDERS                            │
│  Theme, Auth, QueryClient, Echo, Snackbar.           │
└─────────────────────────────────────────────────────┘
```

### Import Rules

```
Pages       → can import from: modules, shared
Modules     → can import from: shared, own module
Shared      → can import from: shared only (no circular)
Providers   → can import from: shared
```

---

## 2. MUI Theme & Design System

### Theme Configuration

```typescript
// src/shared/theme/theme.ts
import { createTheme, type ThemeOptions } from '@mui/material/styles';

const baseTheme: ThemeOptions = {
    palette: {
        primary: {
            main: '#4F46E5',           // Indigo 600
            light: '#818CF8',
            dark: '#3730A3',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#0EA5E9',           // Sky 500
            light: '#38BDF8',
            dark: '#0284C7',
        },
        success: {
            main: '#10B981',           // Emerald 500
        },
        warning: {
            main: '#F59E0B',           // Amber 500
        },
        error: {
            main: '#EF4444',           // Red 500
        },
        background: {
            default: '#F8FAFC',        // Slate 50
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1E293B',        // Slate 800
            secondary: '#64748B',      // Slate 500
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
        h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 },
        h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
        h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
        body1: { fontSize: '0.875rem', lineHeight: 1.6 },
        body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 8,
    },
    spacing: 8,                        // 8px base unit
};

export const lightTheme = createTheme(baseTheme);
```

### Component Overrides

```typescript
// src/shared/theme/components.ts
import { type Components, type Theme } from '@mui/material/styles';

export const componentOverrides: Components<Theme> = {
    MuiButton: {
        defaultProps: {
            disableElevation: true,
        },
        styleOverrides: {
            root: {
                borderRadius: 6,
                padding: '8px 16px',
            },
            sizeSmall: {
                padding: '4px 12px',
                fontSize: '0.8125rem',
            },
        },
    },
    MuiCard: {
        defaultProps: {
            variant: 'outlined',
        },
        styleOverrides: {
            root: {
                borderRadius: 12,
                borderColor: '#E2E8F0',
            },
        },
    },
    MuiTextField: {
        defaultProps: {
            size: 'small',
            variant: 'outlined',
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 6,
                fontWeight: 500,
            },
        },
    },
    MuiTableCell: {
        styleOverrides: {
            head: {
                fontWeight: 600,
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            },
        },
    },
    MuiDialog: {
        defaultProps: {
            PaperProps: {
                elevation: 0,
            },
        },
        styleOverrides: {
            paper: {
                borderRadius: 16,
            },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                borderRadius: 0,
            },
        },
    },
};
```

### Dark Mode

```typescript
// src/shared/theme/darkMode.ts
export const darkPalette: PaletteOptions = {
    mode: 'dark',
    primary: {
        main: '#818CF8',              // Lighter indigo for dark bg
    },
    background: {
        default: '#0F172A',           // Slate 900
        paper: '#1E293B',             // Slate 800
    },
    text: {
        primary: '#F1F5F9',
        secondary: '#94A3B8',
    },
};

// Theme toggle via Zustand store
interface ThemeStore {
    mode: 'light' | 'dark' | 'system';
    setMode: (mode: 'light' | 'dark' | 'system') => void;
    resolvedMode: 'light' | 'dark';
}
```

### Design Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg.default` | `#F8FAFC` | `#0F172A` | Page background |
| `bg.paper` | `#FFFFFF` | `#1E293B` | Cards, modals |
| `border.default` | `#E2E8F0` | `#334155` | Dividers, borders |
| `text.primary` | `#1E293B` | `#F1F5F9` | Headings, body |
| `text.secondary` | `#64748B` | `#94A3B8` | Labels, metadata |
| `primary.main` | `#4F46E5` | `#818CF8` | CTAs, active state |
| Spacing unit | `8px` | `8px` | All spacing |
| Border radius | `8px` | `8px` | Default radius |
| Card radius | `12px` | `12px` | Cards |
| Modal radius | `16px` | `16px` | Dialogs |

---

## 3. Component Patterns

### File Naming Convention

```
PascalCase.tsx          — React components
camelCase.ts            — Utilities, hooks, API
camelCase.test.tsx      — Tests
```

### Component Template

```typescript
// src/modules/contacts/components/ContactCard.tsx
import { Card, CardContent, Avatar, Typography, Chip, Stack, IconButton, Box } from '@mui/material';
import { MoreVert as MoreIcon, Email as EmailIcon, Phone as PhoneIcon } from '@mui/icons-material';
import type { Contact } from '@/shared/types/api';

interface ContactCardProps {
    contact: Contact;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');

    return (
        <Card>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {contact.first_name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                            {fullName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {contact.job_title} {contact.company?.name && `at ${contact.company.name}`}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <MoreIcon fontSize="small" />
                    </IconButton>
                </Stack>
                {/* ... */}
            </CardContent>
        </Card>
    );
}
```

### Container / Presentational Split

```
ContactsPage (Container)
  ├── useContacts()               — data fetching
  ├── useContactFilters()         — filter state
  ├── ContactToolbar              — filter controls
  ├── ContactList (Presentational)
  │     └── ContactCard           — single contact
  ├── ContactDetailDrawer         
  │     └── ContactForm           — create/edit form
  └── DeleteConfirmDialog
```

### Common Patterns

```typescript
// 1. Loading skeleton
import { Skeleton } from '@mui/material';

function ContactCardSkeleton() {
    return (
        <Card>
            <CardContent>
                <Stack direction="row" spacing={2}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

// 2. Empty state
function EmptyContacts({ onAdd }: { onAdd: () => void }) {
    return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
            <ContactsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No contacts yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add your first contact to get started
            </Typography>
            <Button variant="contained" onClick={onAdd} startIcon={<AddIcon />}>
                Add Contact
            </Button>
        </Box>
    );
}

// 3. Error boundary with retry
function ErrorFallback({ error, resetErrorBoundary }) {
    return (
        <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={resetErrorBoundary}>Retry</Button>
        }>
            Something went wrong loading this data.
        </Alert>
    );
}
```

---

## 4. State Management

### State Categories

| Category | Solution | Example |
|---|---|---|
| **Server state** | TanStack Query | Contacts list, deal details |
| **Client state** | Zustand | Sidebar open, theme mode |
| **URL state** | React Router | Filters, pagination, search query |
| **Form state** | React Hook Form | Contact form, deal form |
| **Ephemeral state** | `useState` | Dialog open, tooltip hover |

### Zustand Stores

```typescript
// src/shared/stores/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
    // Sidebar
    sidebarOpen: boolean;
    toggleSidebar: () => void;

    // Command palette
    commandPaletteOpen: boolean;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;

    // Theme
    themeMode: 'light' | 'dark' | 'system';
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;

    // Active team
    currentTeamId: string | null;
    setCurrentTeamId: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

            commandPaletteOpen: false,
            openCommandPalette: () => set({ commandPaletteOpen: true }),
            closeCommandPalette: () => set({ commandPaletteOpen: false }),

            themeMode: 'system',
            setThemeMode: (mode) => set({ themeMode: mode }),

            currentTeamId: null,
            setCurrentTeamId: (id) => set({ currentTeamId: id }),
        }),
        { name: 'crm-app-store' }
    )
);
```

### TanStack Query Configuration

```typescript
// src/app/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,    // 2 minutes
            gcTime: 1000 * 60 * 10,       // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
        },
        mutations: {
            onError: (error) => {
                // Global error handler for mutations
                showErrorSnackbar(error);
            },
        },
    },
});
```

---

## 5. Routing & Navigation

### Route Structure

```typescript
// src/app/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
    // Auth routes (no sidebar)
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            { path: 'login', element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },
            { path: 'forgot-password', element: <ForgotPasswordPage /> },
            { path: 'invitation/:token', element: <AcceptInvitationPage /> },
        ],
    },
    // App routes (authenticated, sidebar)
    {
        path: '/',
        element: <AuthGuard><AppLayout /></AuthGuard>,
        children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },
            { path: 'dashboard', element: <DashboardPage /> },
            
            // Contacts
            { path: 'contacts', element: <ContactsPage /> },
            { path: 'contacts/:id', element: <ContactDetailPage /> },
            
            // Companies
            { path: 'companies', element: <CompaniesPage /> },
            { path: 'companies/:id', element: <CompanyDetailPage /> },
            
            // Deals
            { path: 'deals', element: <DealsPage /> },               // Pipeline board
            { path: 'deals/list', element: <DealsListPage /> },       // Table view
            { path: 'deals/:id', element: <DealDetailPage /> },
            
            // Activities
            { path: 'activities', element: <ActivitiesPage /> },
            { path: 'calendar', element: <CalendarPage /> },
            
            // Communication
            { path: 'emails', element: <EmailsPage /> },
            { path: 'emails/templates', element: <EmailTemplatesPage /> },
            
            // Reports
            { path: 'reports', element: <ReportsPage /> },
            { path: 'reports/:id', element: <ReportDetailPage /> },
            
            // Settings
            {
                path: 'settings',
                element: <SettingsLayout />,
                children: [
                    { index: true, element: <Navigate to="general" replace /> },
                    { path: 'general', element: <GeneralSettingsPage /> },
                    { path: 'members', element: <MembersSettingsPage /> },
                    { path: 'roles', element: <RolesSettingsPage /> },
                    { path: 'pipelines', element: <PipelineSettingsPage /> },
                    { path: 'custom-fields', element: <CustomFieldsSettingsPage /> },
                    { path: 'integrations', element: <IntegrationsSettingsPage /> },
                    { path: 'webhooks', element: <WebhooksSettingsPage /> },
                    { path: 'billing', element: <BillingSettingsPage /> },
                ],
            },
        ],
    },
]);
```

### Sidebar Navigation

```typescript
// src/shared/layouts/AppLayout/Sidebar.tsx
const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { divider: true },
    { label: 'Contacts', icon: <PeopleIcon />, path: '/contacts', permission: 'contacts.view' },
    { label: 'Companies', icon: <BusinessIcon />, path: '/companies', permission: 'contacts.view' },
    { label: 'Deals', icon: <HandshakeIcon />, path: '/deals', permission: 'deals.view' },
    { label: 'Activities', icon: <TaskIcon />, path: '/activities', permission: 'activities.view' },
    { label: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { divider: true },
    { label: 'Emails', icon: <EmailIcon />, path: '/emails' },
    { label: 'Reports', icon: <BarChartIcon />, path: '/reports', permission: 'reports.view' },
    { divider: true },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings', permission: 'settings.view' },
];
```

---

## 6. Forms & Validation

### Form Architecture

```typescript
// React Hook Form + Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const contactSchema = z.object({
    first_name: z.string().min(1, 'First name is required').max(255),
    last_name: z.string().max(255).optional(),
    email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
    phone: z.string().max(50).regex(/^[\d\s+\-().]*$/, 'Invalid phone').optional().or(z.literal('')),
    job_title: z.string().max(255).optional(),
    company_id: z.string().uuid().optional().nullable(),
    source: z.enum(['web', 'referral', 'cold', 'event', 'partner', 'other']).optional(),
    tag_ids: z.array(z.string().uuid()).optional(),
    custom_fields: z.record(z.unknown()).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

// src/modules/contacts/components/ContactForm.tsx
export function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
    const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: contact ?? { first_name: '' },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
                <Stack direction="row" spacing={2}>
                    <Controller
                        name="first_name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="First Name"
                                required
                                fullWidth
                                error={!!errors.first_name}
                                helperText={errors.first_name?.message}
                            />
                        )}
                    />
                    <Controller
                        name="last_name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Last Name"
                                fullWidth
                                error={!!errors.last_name}
                                helperText={errors.last_name?.message}
                            />
                        )}
                    />
                </Stack>
                {/* ... more fields */}
                
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="submit" variant="contained" loading={isSubmitting}>
                        {contact ? 'Update' : 'Create'}
                    </Button>
                </Stack>
            </Stack>
        </form>
    );
}
```

### Custom Field Renderer

```typescript
// src/shared/components/CustomFieldRenderer.tsx
// Dynamically renders form fields based on CustomFieldDefinition

interface CustomFieldRendererProps {
    definitions: CustomFieldDefinition[];
    control: Control;
    prefix?: string;  // e.g., "custom_fields"
}

export function CustomFieldRenderer({ definitions, control, prefix = 'custom_fields' }: CustomFieldRendererProps) {
    return (
        <Stack spacing={2}>
            {definitions.map((def) => (
                <Controller
                    key={def.slug}
                    name={`${prefix}.${def.slug}`}
                    control={control}
                    render={({ field }) => {
                        switch (def.field_type) {
                            case 'text':
                                return <TextField {...field} label={def.name} required={def.is_required} />;
                            case 'number':
                                return <TextField {...field} label={def.name} type="number" />;
                            case 'date':
                                return <DatePicker label={def.name} value={field.value} onChange={field.onChange} />;
                            case 'select':
                                return (
                                    <TextField {...field} label={def.name} select>
                                        {def.options?.map((opt) => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </TextField>
                                );
                            case 'boolean':
                                return <FormControlLabel label={def.name} control={<Switch checked={!!field.value} onChange={field.onChange} />} />;
                            case 'url':
                                return <TextField {...field} label={def.name} type="url" />;
                            default:
                                return <TextField {...field} label={def.name} />;
                        }
                    }}
                />
            ))}
        </Stack>
    );
}
```

---

## 7. Key UI Components

### App Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🔵 CRM Logo    Global Search (Cmd+K)      🔔  👤  ⚙️      │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Dashboard │   Page Title                        [+ Add]     │
│  ─── ── ── │   ─────────────────────────────────────────     │
│  Contacts  │                                                 │
│  Companies │   ┌──────────────────────────────────────┐     │
│  Deals     │   │                                      │     │
│  Activities│   │         Page Content Area             │     │
│  Calendar  │   │                                      │     │
│  ─── ── ── │   │   (Table, Kanban Board, Forms, etc.) │     │
│  Emails    │   │                                      │     │
│  Reports   │   │                                      │     │
│  ─── ── ── │   │                                      │     │
│  Settings  │   └──────────────────────────────────────┘     │
│            │                                                 │
│  ▼ Teams   │                           Showing 1-25 of 1250 │
│  📊 Acme   │                           ◀  1  2  3  ...  ▶   │
└────────────┴─────────────────────────────────────────────────┘
```

### DataTable Component

```typescript
// src/shared/components/DataTable/DataTable.tsx
// Features: sorting, filtering, column visibility, bulk actions, export

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    loading?: boolean;
    pagination: PaginationMeta;
    onPaginationChange: (page: number, perPage: number) => void;
    sorting: SortingState;
    onSortingChange: (sort: SortingState) => void;
    filters?: FilterState;
    onFilterChange?: (filters: FilterState) => void;
    bulkActions?: BulkAction[];
    onRowClick?: (row: T) => void;
    emptyState?: ReactNode;
}

// Usage:
<DataTable
    columns={[
        { id: 'name', header: 'Name', cell: (row) => <ContactNameCell contact={row} /> },
        { id: 'email', header: 'Email', cell: (row) => row.email },
        { id: 'company', header: 'Company', cell: (row) => row.company?.name },
        { id: 'lead_score', header: 'Score', cell: (row) => <LeadScoreBadge score={row.lead_score} /> },
        { id: 'owner', header: 'Owner', cell: (row) => <UserAvatar user={row.owner} size="small" /> },
        { id: 'created_at', header: 'Created', cell: (row) => formatRelative(row.created_at) },
    ]}
    data={contacts}
    loading={isLoading}
    pagination={meta}
    onPaginationChange={handlePageChange}
    sorting={sorting}
    onSortingChange={handleSort}
    onRowClick={(contact) => navigate(`/contacts/${contact.id}`)}
    bulkActions={[
        { label: 'Assign Owner', icon: <PersonIcon />, action: handleBulkAssign },
        { label: 'Add Tag', icon: <TagIcon />, action: handleBulkTag },
        { label: 'Export', icon: <DownloadIcon />, action: handleBulkExport },
        { label: 'Delete', icon: <DeleteIcon />, action: handleBulkDelete, color: 'error' },
    ]}
/>
```

### Pipeline / Kanban Board

```typescript
// src/modules/deals/components/PipelineBoard.tsx
// Drag-and-drop Kanban board using @dnd-kit

function PipelineBoard({ pipelineId }: { pipelineId: string }) {
    const { data: board } = useQuery(pipelineBoardOptions(pipelineId));
    const moveDeal = useMoveDeal();

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const dealId = active.id as string;
        const targetStageId = over.data.current?.stageId;
        const targetPosition = over.data.current?.position;

        if (targetStageId) {
            moveDeal.mutate({ dealId, stageId: targetStageId, position: targetPosition });
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', minHeight: '70vh', pb: 2 }}>
                {board?.stages.map((stage) => (
                    <StageColumn key={stage.id} stage={stage}>
                        <SortableContext items={stage.deals.map(d => d.id)}>
                            {stage.deals.map((deal) => (
                                <SortableDealCard key={deal.id} deal={deal} />
                            ))}
                        </SortableContext>
                    </StageColumn>
                ))}
            </Box>
        </DndContext>
    );
}

// Stage column header with stats
function StageColumn({ stage, children }: { stage: Stage; children: ReactNode }) {
    return (
        <Paper sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, borderBottom: 3, borderColor: stage.color }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">{stage.name}</Typography>
                    <Chip label={stage.deals_count} size="small" />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    {formatCurrency(stage.total_value)}
                </Typography>
            </Box>
            <Stack spacing={1} sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
                {children}
            </Stack>
        </Paper>
    );
}
```

### Command Palette (Global Search)

```typescript
// src/shared/components/CommandPalette.tsx
// Triggered by Cmd+K / Ctrl+K

function CommandPalette() {
    const { commandPaletteOpen, closeCommandPalette } = useAppStore();
    const [query, setQuery] = useState('');
    const { data: results } = useQuery({
        queryKey: ['search', query],
        queryFn: () => apiClient.get(`/search?q=${encodeURIComponent(query)}`),
        enabled: query.length > 1,
    });

    useHotkeys('mod+k', () => useAppStore.getState().openCommandPalette());

    return (
        <Dialog open={commandPaletteOpen} onClose={closeCommandPalette} fullWidth maxWidth="sm"
            PaperProps={{ sx: { position: 'fixed', top: '20%', borderRadius: 3 } }}>
            <TextField
                autoFocus
                placeholder="Search contacts, deals, companies..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
            />
            <Divider />
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {results?.contacts?.map((c) => (
                    <ListItemButton key={c.id} onClick={() => { navigate(`/contacts/${c.id}`); closeCommandPalette(); }}>
                        <ListItemIcon><PersonIcon /></ListItemIcon>
                        <ListItemText primary={c.name} secondary={c.email} />
                    </ListItemButton>
                ))}
                {/* ... deals, companies */}
            </List>
        </Dialog>
    );
}
```

### Entity Timeline

```typescript
// src/shared/components/EntityTimeline/EntityTimeline.tsx
// Unified activity feed for contacts, deals, companies

function EntityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
    const { data: timeline } = useQuery(timelineOptions(entityType, entityId));

    return (
        <Timeline>
            {timeline?.map((entry) => (
                <TimelineItem key={entry.id}>
                    <TimelineSeparator>
                        <TimelineDot color={getTimelineColor(entry.type)} sx={{ p: 0.5 }}>
                            {getTimelineIcon(entry.type)}
                        </TimelineDot>
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                            <Typography variant="subtitle2">{entry.subject}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatRelative(entry.created_at)}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {entry.description}
                        </Typography>
                        {entry.type === 'note' && (
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.body_html) }} />
                            </Paper>
                        )}
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
}
```

---

## 8. Performance Optimization

### Code Splitting

```typescript
// Lazy load route pages
const ContactsPage = lazy(() => import('@/modules/contacts/pages/ContactsPage'));
const DealsPage = lazy(() => import('@/modules/deals/pages/DealsPage'));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'));

// Wrap in Suspense with loading fallback
<Suspense fallback={<PageSkeleton />}>
    <ContactsPage />
</Suspense>
```

### Virtualization for Large Lists

```typescript
// Use react-window for lists > 100 items
import { FixedSizeList } from 'react-window';

function VirtualizedContactList({ contacts }: { contacts: Contact[] }) {
    return (
        <FixedSizeList height={600} itemCount={contacts.length} itemSize={72} width="100%">
            {({ index, style }) => (
                <div style={style}>
                    <ContactListItem contact={contacts[index]} />
                </div>
            )}
        </FixedSizeList>
    );
}
```

### Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    mui: ['@mui/material', '@mui/icons-material'],
                    query: ['@tanstack/react-query'],
                    charts: ['recharts'],
                    editor: ['@tiptap/react', '@tiptap/starter-kit'],
                    dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
                },
            },
        },
    },
});
```

### Key Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Bundle Size (gzipped) | < 250KB initial, < 500KB total |
| API Response Time | < 200ms (p95) |

---

## 9. Accessibility

### MUI Accessibility Defaults

MUI provides built-in accessibility. Maintain these:

- All interactive elements are focusable and keyboard-navigable
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1 (WCAG AA)
- Focus visible styles

### Additional Requirements

```typescript
// Icon buttons must have aria-label
<IconButton aria-label="Delete contact" onClick={handleDelete}>
    <DeleteIcon />
</IconButton>

// Tables with sortable columns
<TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleSort('name')}>
    Name
</TableSortLabel>

// Skip navigation link
<a href="#main-content" className="skip-link">Skip to main content</a>

// Announce dynamic content
<Alert role="status" aria-live="polite">Contact saved successfully</Alert>
```

---

## 10. Internationalization

### Setup (Phase 2+)

```typescript
// Using react-i18next
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
        en: { translation: require('./locales/en.json') },
        de: { translation: require('./locales/de.json') },
        fr: { translation: require('./locales/fr.json') },
        es: { translation: require('./locales/es.json') },
    },
});

// Usage
const { t } = useTranslation();
<Typography>{t('contacts.title')}</Typography>

// Date/number formatting — use Intl
const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
```

---

*Next: [06-AI-FEATURES.md](06-AI-FEATURES.md) — AI/ML integration, prompt engineering, model selection*
