# Object Chessboard Implementation Guide

## File Structure for New Module

### Backend Files to Create

```
database/migrations/
├── 2026_03_29_100001_create_projects_table.php
├── 2026_03_29_100002_create_custom_field_definitions_table.php
├── 2026_03_29_100003_create_project_documents_table.php
├── 2026_03_29_100004_create_buildings_table.php
├── 2026_03_29_100005_create_sections_table.php
├── 2026_03_29_100006_create_apartments_table.php
├── 2026_03_29_100007_create_reservations_table.php
├── 2026_03_29_100008_create_apartment_status_history_table.php
├── 2026_03_29_100009_create_apartment_pricing_history_table.php
├── 2026_03_29_100010_create_apartment_media_table.php
├── 2026_03_29_100011_create_custom_field_values_table.php
├── 2026_03_29_100012_create_apartment_statuses_table.php
├── 2026_03_29_100013_create_apartment_status_transitions_table.php
├── 2026_03_29_100014_connect_apartments_to_statuses.php
├── 2026_03_29_100015_add_apartment_id_to_deals_table.php
└── 2026_03_29_100016_create_chessboard_views_and_triggers.php

app/Models/
├── Project.php
├── Building.php
├── Section.php
├── Apartment.php
├── Reservation.php
├── ApartmentStatusHistory.php
├── ApartmentPricingHistory.php
├── ApartmentMedia.php
├── ProjectDocument.php
├── CustomFieldDefinition.php
├── CustomFieldValue.php
├── ApartmentStatus.php
└── ApartmentStatusTransition.php
├── ApartmentMedia.php
├── ProjectDocument.php
├── CustomFieldDefinition.php
└── CustomFieldValue.php

app/Http/Controllers/
├── ProjectController.php
├── BuildingController.php
├── ApartmentController.php
├── ReservationController.php
├── ChessboardController.php
└── ProjectDocumentController.php

app/Http/Resources/
├── ProjectResource.php
├── BuildingResource.php
├── ApartmentResource.php
├── ChessboardResource.php
└── ReservationResource.php

app/Http/Requests/
├── StoreProjectRequest.php
├── UpdateProjectRequest.php
├── StoreApartmentRequest.php
├── UpdateApartmentRequest.php
├── StoreReservationRequest.php
└── UpdateReservationRequest.php

app/Services/
├── ChessboardService.php
├── ReservationService.php
└── CustomFieldsService.php

app/Events/
├── ReservationCreated.php
├── ReservationConverted.php
└── ApartmentStatusChanged.php

app/Listeners/
├── SendReservationNotification.php
├── CreateDealFromReservation.php
└── UpdateApartmentStatusFromReservation.php
```

### Frontend Files to Create

```
src/pages/
├── ObjectsPage.tsx                    # Projects list
├── ProjectDetailPage.tsx              # Project overview
├── ChessboardPage.tsx                 # Main chessboard interface
├── ReservationsPage.tsx               # Reservations management
└── ApartmentDetailPage.tsx            # Apartment details modal

src/components/chessboard/
├── ChessboardGrid.tsx                 # Main grid component
├── ApartmentCard.tsx                  # Individual apartment cell
├── ChessboardFilters.tsx              # Filter sidebar
├── ReservationModal.tsx               # Create/edit reservation
├── ApartmentDetailsPanel.tsx          # Right panel details
├── FloorNavigation.tsx                # Floor selector
├── SectionTabs.tsx                    # Section navigation
└── ChessboardToolbar.tsx              # Action buttons

src/components/objects/
├── ProjectCard.tsx                    # Project overview card
├── BuildingCard.tsx                   # Building overview card  
├── CustomFieldsForm.tsx               # Dynamic fields form
├── DocumentUploader.tsx               # File upload component
├── ApartmentMediaGallery.tsx          # Image gallery
└── ObjectsStats.tsx                   # Statistics widgets

src/stores/
├── objectsStore.ts                    # Projects/buildings store
├── chessboardStore.ts                 # Chessboard state
└── reservationsStore.ts               # Reservations management

src/types/
└── objects.ts                         # All object-related types

src/hooks/
├── useChessboardData.tsx              # Chessboard data management
├── useReservations.tsx                # Reservations CRUD
├── useCustomFields.tsx                # Dynamic fields
└── useObjectsStats.tsx                # Statistics data
```

## Key Implementation Examples

### 1. Backend Model Example: Apartment.php

```php
<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Apartment extends Model
{
    use BelongsToTeam, HasUuidPrimaryKey, SoftDeletes;

    protected $fillable = [
        'team_id',
        'project_id',
        'building_id', 
        'section_id',
        'number',
        'floor',
        'rooms',
        'area',
        'balcony_area',
        'price',
        'price_per_sqm',
        'status_id',
        'layout_type',
        'has_balcony',
        'has_terrace',
        'has_loggia',
        'ceiling_height',
        'custom_fields',
    ];

    protected $casts = [
        'area' => 'decimal:2',
        'balcony_area' => 'decimal:2', 
        'price' => 'decimal:2',
        'price_per_sqm' => 'decimal:2',
        'ceiling_height' => 'decimal:2',
        'has_balcony' => 'boolean',
        'has_terrace' => 'boolean',
        'has_loggia' => 'boolean',
        'custom_fields' => 'array',
    ];

    // Relationships
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function building(): BelongsTo  
    {
        return $this->belongsTo(Building::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(ApartmentStatus::class, 'status_id');
    }

    public function customFieldValues(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class, 'apartment_id');
    }

    public function activeReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)->where('status', 'active');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(ApartmentMedia::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ApartmentStatusHistory::class);
    }

    public function pricingHistory(): HasMany
    {
        return $this->hasMany(ApartmentPricingHistory::class);
    }

    // Scopes
    public function scopeAvailable($query)
    {
        return $query->where('status', 'free');
    }

    public function scopeByFloor($query, $floor)
    {
        return $query->where('floor', $floor);
    }

    public function scopeByRooms($query, $rooms)
    {
        return $query->where('rooms', $rooms);
    }
}
```

### 2. Backend Model Example: ApartmentStatus.php

```php
<?php

namespace App\Models;

use App\Domain\Shared\Traits\BelongsToTeam;
use App\Domain\Shared\Traits\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApartmentStatus extends Model
{
    use BelongsToTeam, HasUuidPrimaryKey;

    protected $fillable = [
        'team_id',
        'name',
        'color',
        'is_active',
        'is_default',
        'can_reserve',
        'can_sell',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'can_reserve' => 'boolean',
        'can_sell' => 'boolean',
    ];

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'status_id');
    }

    public function transitionsFrom(): HasMany
    {
        return $this->hasMany(ApartmentStatusTransition::class, 'from_status_id');
    }

    public function transitionsTo(): HasMany
    {
        return $this->hasMany(ApartmentStatusTransition::class, 'to_status_id');
    }

    public function canTransitionTo(ApartmentStatus $status): bool
    {
        return $this->transitionsFrom()
            ->where('to_status_id', $status->id)
            ->where('is_active', true)
            ->exists();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByTeam($query, $teamId)
    {
        return $query->where('team_id', $teamId);
    }
}
```

### 3. API Controller Example: ChessboardController.php

```php
<?php

namespace App\Http\Controllers;

use App\Http\Resources\ChessboardResource;
use App\Models\Building;
use App\Services\ChessboardService;
use Illuminate\Http\Request;

class ChessboardController extends Controller
{
    public function __construct(
        private ChessboardService $chessboardService
    ) {}

    public function show(Request $request, Building $building)
    {
        $this->authorize('view', $building);

        $filters = $request->validate([
            'floors' => 'nullable|array',
            'rooms' => 'nullable|array', 
            'status' => 'nullable|array',
            'price_min' => 'nullable|numeric',
            'price_max' => 'nullable|numeric',
            'area_min' => 'nullable|numeric',
            'area_max' => 'nullable|numeric',
        ]);

        $chessboardData = $this->chessboardService->getChessboardData(
            $building,
            $filters
        );

        return new ChessboardResource($chessboardData);
    }

    public function stats(Request $request, Building $building)
    {
        $this->authorize('view', $building);

        $stats = $this->chessboardService->getBuildingStats($building);

        return response()->json($stats);
    }
}
```

### 4. Frontend Store Example: chessboardStore.ts

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '@/lib/api';

interface ChessboardFilters {
  floors: number[];
  rooms: number[];  
  status: string[];
  priceRange: [number, number];
  areaRange: [number, number];
}

interface ChessboardState {
  // State
  gridData: ApartmentGridData | null;
  selectedApartment: Apartment | null;
  filters: ChessboardFilters;
  viewMode: 'grid' | 'list'; 
  loading: boolean;
  error: string | null;

  // Actions  
  loadChessboard: (buildingId: string, filters?: Partial<ChessboardFilters>) => Promise<void>;
  setFilters: (filters: Partial<ChessboardFilters>) => void;
  selectApartment: (apartment: Apartment | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const initialFilters: ChessboardFilters = {
  floors: [],
  rooms: [],
  status: [],
  priceRange: [0, Infinity],
  areaRange: [0, Infinity],
};

export const useChessboardStore = create<ChessboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      gridData: null,
      selectedApartment: null, 
      filters: initialFilters,
      viewMode: 'grid',
      loading: false,
      error: null,

      // Actions
      loadChessboard: async (buildingId, filters = {}) => {
        set({ loading: true, error: null });
        try {
          const response = await api.get(`/buildings/${buildingId}/chessboard`, {
            params: { ...get().filters, ...filters }
          });
          set({ 
            gridData: response.data,
            loading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load chessboard',
            loading: false 
          });
        }
      },

      setFilters: (newFilters) => {
        const updatedFilters = { ...get().filters, ...newFilters };
        set({ filters: updatedFilters });
        // Auto-refresh when filters change
        if (get().gridData) {
          get().loadChessboard(get().gridData!.building.id, updatedFilters);
        }
      },

      selectApartment: (apartment) => {
        set({ selectedApartment: apartment });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      refreshData: async () => {
        if (get().gridData) {
          await get().loadChessboard(get().gridData.building.id);
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'chessboard-store' }
  )
);
```

### 5. Main Component Example: ChessboardGrid.tsx

```tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Skeleton,
  Alert,
  useTheme,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useChessboardStore } from '@/stores/chessboardStore';
import ApartmentCard from './ApartmentCard';
import ChessboardFilters from './ChessboardFilters';
import ApartmentDetailsPanel from './ApartmentDetailsPanel';
import ChessboardToolbar from './ChessboardToolbar';

interface ChessboardGridProps {
  buildingId: string;
}

export default function ChessboardGrid({ buildingId }: ChessboardGridProps) {
  const theme = useTheme();
  const {
    gridData,
    selectedApartment,
    loading,
    error,
    loadChessboard,
    selectApartment,
    clearError,
  } = useChessboardStore();

  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    loadChessboard(buildingId);
  }, [buildingId, loadChessboard]);

  if (loading && !gridData) {
    return (
      <Box p={3}>
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={clearError} sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!gridData) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="text.secondary">
          No apartments found for this building.
        </Typography>
      </Box>
    );
  }

  const { building, sections, apartments, stats } = gridData;

  // Group apartments by floor and section
  const apartmentsByFloorAndSection = apartments.reduce((acc, apt) => {
    if (!acc[apt.floor]) acc[apt.floor] = {};
    if (!acc[apt.floor][apt.section_id || 'main']) {
      acc[apt.floor][apt.section_id || 'main'] = [];
    }
    acc[apt.floor][apt.section_id || 'main'].push(apt);
    return acc;
  }, {} as Record<number, Record<string, Apartment[]>>);

  const floors = Object.keys(apartmentsByFloorAndSection)
    .map(Number)
    .sort((a, b) => b - a); // Highest floor first

  return (
    <Box display="flex" height="calc(100vh - 64px)">
      {/* Filters Sidebar */}
      {filtersOpen && (
        <Paper
          sx={{
            width: 300,
            p: 2,
            borderRadius: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ChessboardFilters
            stats={stats}
            onClose={() => setFiltersOpen(false)}
          />
        </Paper>
      )}

      {/* Main Grid Area */}
      <Box flex="1" overflow="auto">
        <ChessboardToolbar
          building={building}
          stats={stats}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen(!filtersOpen)}
        />

        <Box p={2}>
          {floors.map((floor) => (
            <Paper key={floor} sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Floor {floor}
              </Typography>
              
              {sections.map((section) => {
                const sectionApartments = 
                  apartmentsByFloorAndSection[floor]?.[section.id] || [];
                
                if (sectionApartments.length === 0) return null;

                return (
                  <Box key={section.id} mb={2}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      {section.name}
                    </Typography>
                    
                    <Grid container spacing={1}>
                      {sectionApartments
                        .sort((a, b) => a.number.localeCompare(b.number))
                        .map((apartment) => (
                          <Grid item key={apartment.id}>
                            <ApartmentCard
                              apartment={apartment}
                              selected={selectedApartment?.id === apartment.id}
                              onClick={() => selectApartment(apartment)}
                            />
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                );
              })}
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Details Panel */}
      {selectedApartment && (
        <Paper
          sx={{
            width: 400,
            borderRadius: 0,
            borderLeft: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ApartmentDetailsPanel
            apartment={selectedApartment}
            onClose={() => selectApartment(null)}
          />
        </Paper>
      )}
    </Box>
  );
}
```

### 6. Apartment Card Component: ApartmentCard.tsx

```tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { useCurrencyStore } from '@/stores/currencyStore';

interface ApartmentCardProps {
  apartment: Apartment;
  selected?: boolean;
  onClick: () => void;
}

export default function ApartmentCard({
  apartment,
  selected = false,
  onClick,
}: ApartmentCardProps) {
  const theme = useTheme();
  const formatMoney = useCurrencyStore((s) => s.format);

  // Use the apartment's status configuration
  const statusColor = apartment.status?.color || theme.palette.grey[500];
  const statusName = apartment.status?.name || 'Unknown';

  return (
    <Card
      onClick={onClick}
      sx={{
        minWidth: 140,
        minHeight: 120,
        cursor: 'pointer',
        border: selected ? `2px solid ${theme.palette.primary.main}` : 'none',
        borderLeft: `4px solid ${statusColor}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
        transition: 'all 0.15s ease-in-out',
        backgroundColor: selected 
          ? alpha(theme.palette.primary.main, 0.05)
          : 'background.paper',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Apartment Number */}
        <Typography variant="h6" fontWeight={600} noWrap>
          {apartment.number}
        </Typography>

        {/* Rooms and Area */}
        <Typography variant="body2" color="text.secondary" noWrap>
          {apartment.rooms}R • {apartment.area}m²
        </Typography>

        {/* Price */}
        <Typography 
          variant="body2" 
          fontWeight={600} 
          color="primary"
          mt={0.5}
        >
          {formatMoney(apartment.price, 'USD')}
        </Typography>

        {/* Status Chip */}
        <Box mt={1}>
          <Chip
            label={statusName}
            size="small"
            sx={{
              backgroundColor: alpha(statusColor, 0.1),
              color: statusColor,
              fontWeight: 500,
              fontSize: '0.7rem',
            }}
          />
        </Box>

        {/* Reservation Info */}
        {apartment.reservation && (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {apartment.reservation.client?.full_name || 'Reserved'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
```

## Integration Points with Existing CRM

### 1. Extend Deal Model Relationships
Add apartment connection to existing Deal model:

```php  
// In app/Models/Deal.php - add relationship
public function apartment(): BelongsTo
{
    return $this->belongsTo(Apartment::class);
}
```

### 2. Update Deal Creation Workflow
Modify existing deal forms to include apartment selection:

```tsx
// In existing DealFormPage.tsx - add apartment field
const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

// Add apartment selector component
<ApartmentSelector 
  value={selectedApartment}
  onChange={setSelectedApartment}
  projectId={dealData.project_id}
/>
```

### 3. Navigation Integration
Add to existing navigation in `AppLayout.tsx`:

```tsx
const navItems = [
  // ... existing items
  {
    text: 'Objects',
    icon: <ApartmentIcon />,
    path: '/objects',
    badge: pendingReservationsCount,
  },
  // ... rest of items
];
```

### 4. Dashboard Widget Integration
Add apartment stats to existing dashboard:

```tsx  
// New dashboard widget component
<Grid item xs={12} md={6} lg={3}>
  <ObjectsStatsWidget />
</Grid>
```

This implementation guide provides concrete examples and file structures that developers can follow to implement the Object Chessboard module while maintaining consistency with the existing CRM architecture and design patterns.