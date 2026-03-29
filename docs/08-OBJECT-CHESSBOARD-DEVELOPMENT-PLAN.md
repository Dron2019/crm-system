# Object Chessboard Module - Development Plan

## Overview
This document outlines the development plan for integrating the "Object Chessboard" (apartment management) module into the existing CRM system. The module will provide a visual grid interface for managing apartments by floors and sections, integrated with existing deals, contacts, and users.

## Current CRM Analysis

### Existing Database Structure
- **Primary Keys**: UUID-based (`CHAR(36)`) 
- **Multi-tenancy**: Team-based with `team_id` foreign keys
- **Soft Deletes**: Enabled on most models
- **Engine**: InnoDB with utf8mb4_unicode_ci collation

### Key Existing Models
- `users` - CRM managers/staff (UUID id)
- `contacts` - Clients/leads (UUID id)
- `deals` - Sales/contracts (UUID id, connects to contact_id, company_id, assigned_to)
- `companies` - Corporate clients (UUID id)

### Frontend Stack
- **UI Framework**: Material-UI (MUI) with custom theme
- **State Management**: Zustand stores
- **Routing**: React Router with lazy loading
- **TypeScript**: Full type safety
- **Design System**: Custom theme with brand colors (#336BFA primary, #ec4899 secondary)

## Development Phases

### Phase 1: Database Schema Setup  ⏱️ 4-5 days

#### 1.1 Create Core Tables
Create 13 new tables following the existing UUID/team structure:

```sql
-- Core hierarchy: projects → buildings → sections → apartments
- projects (residential complexes)
- buildings (individual buildings) 
- sections (building sections/entrances)
- apartments (individual units)

-- Associated data tables
- reservations (links apartments to CRM deals/contacts)
- apartment_status_history (status change log)
- apartment_pricing_history (price change log)
- apartment_media (photos, floor plans)
- project_documents (permits, licenses)
- custom_field_definitions (configurable fields schema)
- custom_field_values (custom field data)
- apartment_statuses (configurable status definitions)
- apartment_status_transitions (allowed status changes)
```

#### 1.2 Database Relationships
- **projects.manager_id** → `users.id`
- **reservations.client_id** → `contacts.id` 
- **reservations.deal_id** → `deals.id`
- **reservations.manager_id** → `users.id`

#### 1.3 MySQL Triggers
- Auto-log apartment status changes
- Sync apartment status with reservation status  
- Prevent duplicate active reservations

#### 1.4 Views for Performance
- `v_chessgrid` - Complete apartment data for UI rendering
- `v_project_stats` - Dashboard statistics
- `v_project_custom_fields` - Custom fields with values

### Phase 2: Laravel Backend Implementation ⏱️ 6-7 days

#### 2.1 Models & Relationships
```php
// New Eloquent models with existing CRM integration
App\Models\Project::class
App\Models\Building::class  
App\Models\Section::class
App\Models\Apartment::class
App\Models\Reservation::class
App\Models\ApartmentStatusHistory::class
App\Models\ApartmentPricingHistory::class
App\Models\ApartmentMedia::class
App\Models\ProjectDocument::class
App\Models\CustomFieldDefinition::class
App\Models\CustomFieldValue::class
App\Models\ApartmentStatus::class
App\Models\ApartmentStatusTransition::class
```

#### 2.2 API Controllers
```php
// RESTful controllers following existing patterns
App\Http\Controllers\ProjectController::class
App\Http\Controllers\BuildingController::class
App\Http\Controllers\ApartmentController::class
App\Http\Controllers\ReservationController::class
App\Http\Controllers\ChessboardController::class // Main chessboard API
App\Http\Controllers\ApartmentStatusController::class
App\Http\Controllers\CustomFieldController::class
```

#### 2.3 Key API Endpoints
```
GET /api/projects                    - List all projects
GET /api/projects/{id}/buildings     - Buildings in project
GET /api/buildings/{id}/chessboard   - Apartment grid data
POST /api/apartments/{id}/reserve    - Create reservation
PUT /api/reservations/{id}/convert   - Convert to deal
GET /api/chessboard/stats           - Dashboard statistics
GET /api/apartment-statuses         - List configurable statuses
POST /api/apartment-statuses        - Create new status
PUT /api/apartments/{id}/status     - Change apartment status
GET /api/custom-fields/apartments   - Get apartment custom fields
POST /api/custom-fields/apartments  - Create apartment custom field
```

#### 2.4 Business Logic Services
- **ReservationService**: Manage apartment reservations
- **ChessboardService**: Grid data aggregation  
- **IntegrationService**: CRM deals synchronization
- **CustomFieldsService**: Dynamic field management for apartments
- **ApartmentStatusService**: Manage configurable statuses and transitions
- **ApartmentService**: Core apartment operations with custom fields

#### 2.5 Events & Listeners
```php
// Integrate with existing event system
ReservationCreated::class → SendNotification::class
ReservationConverted::class → CreateDeal::class, UpdateApartmentStatus::class  
ApartmentStatusChanged::class → WriteAuditLog::class
```

### Phase 3: Frontend Implementation ⏱️ 8-9 days

#### 3.1 New Routes & Navigation
Add to existing router structure:
```typescript
// New routes in src/router.tsx
/objects                    - Projects list page
/objects/:projectId         - Project overview  
/objects/:projectId/buildings/:buildingId/chessboard  - Main chessboard view
/objects/reservations       - Reservations management
/objects/settings          - Object settings
/objects/settings/statuses  - Apartment status configuration
/objects/settings/custom-fields - Apartment custom fields setup
```

Add navigation items to `AppLayout.tsx`:
```typescript
{
  text: 'Objects',
  icon: <ApartmentIcon />,
  path: '/objects',
}
```

#### 3.2 Core Components
Following existing MUI design patterns:

**ChessboardGrid Component**  
- Interactive apartment grid visualization
- Floor/section layout with apartment cards
- Dynamic status color coding (configurable statuses)
- Filters (rooms, area, price, status, custom fields)
- Real-time updates via WebSocket
- Custom fields display and filtering

**ApartmentCard Component**
- Compact apartment display in grid
- Dynamic status indicator with configurable colors
- Room count, area, price, custom fields preview
- Quick actions (reserve, view details, edit, change status)
- Hover states with additional info and custom fields

**ObjectsDataTable Component**  
- Extends existing `DataTable.tsx`  
- Projects/buildings listing with search/sort
- Statistics columns (total/available/sold apartments)
- Bulk operations support

**ReservationManager Component**
- Create/edit reservations
- Link to existing contacts and deals
- Conversion workflow to deals
- Status management

#### 3.3 Pages Implementation

**ProjectsPage (`/objects`)**
- Projects overview with statistics cards
- DataTable with projects list  
- Quick filters (city, status, manager)
- Create new project button

**ProjectDetailPage (`/objects/:id`)**  
- Project information dashboard
- Buildings overview cards
- Documents management
- Custom fields display
- Statistics charts

**ChessboardPage (`/objects/.../chessboard`)**
- Main apartment grid interface  
- Advanced filtering sidebar
- Apartment details panel
- Bulk operations toolbar
- Export functionality

**ReservationsPage (`/objects/reservations`)**
- All reservations management
- Integration with existing deals workflow
- Status tracking and conversion pipeline

#### 3.4 State Management
New Zustand stores:
```typescript
// src/stores/objectsStore.ts
interface ObjectsStore {
  projects: Project[];
  selectedProject: Project | null;
  apartments: Apartment[];
  reservations: Reservation[];
  filters: ChessboardFilters;
  // ... actions
}

// src/stores/chessboardStore.ts  
interface ChessboardStore {
  gridData: ApartmentGridData;
  selectedApartment: Apartment | null;
  viewMode: 'grid' | 'list';
  // ... actions  
}
```

#### 3.5 Type Definitions
```typescript  
// src/types/objects.ts
interface Project {
  id: string;
  name: string;
  status: 'planning' | 'sales' | 'construction' | 'completed';
  manager_id: string;
  manager?: User;
  custom_fields: Record<string, any>;
  // ... other fields
}

interface ApartmentStatus {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  can_reserve: boolean;
  can_sell: boolean;
}

interface Apartment {  
  id: string;
  number: string;
  floor: number;
  rooms: number;
  area: number;
  price: number;
  status_id: string;
  status?: ApartmentStatus;
  custom_fields: Record<string, any>;
  reservation?: Reservation;
  // ... other fields
}

interface Reservation {
  id: string;
  apartment_id: string;
  client_id?: string;
  deal_id?: string;  
  manager_id: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  expires_at: string;
  // ... other fields
}
```

#### 3.6 UI/UX Design Integration
- **Consistent with existing MUI theme**
- **Configurable status colors** from apartment status settings:
  - Default status palette with admin customization
  - Support for hex colors and theme color references
  - Status transitions with visual feedback
- **Grid layout** responsive design
- **Tooltip interactions** for apartment details and custom fields
- **Loading states** with MUI skeletons
- **Professional data visualization** charts
- **Custom fields integration** in all UI components

### Phase 4: Deals Integration ⏱️ 2-3 days

#### 4.1 Extend Deal Model
Add apartment connection to existing Deal model:
```php
// Add to Deal model
public function apartment(): BelongsTo
{
    return $this->belongsTo(Apartment::class);
}

// Add migration for deals table
Schema::table('deals', function (Blueprint $table) {
    $table->uuid('apartment_id')->nullable()->after('company_id');
    $table->foreign('apartment_id')->references('id')->on('apartments')->nullOnDelete();
});
```

#### 4.2 Deal Creation Workflow
- **From Chessboard**: Reserve apartment → Create deal automatically
- **From Reservations**: Convert reservation → Create deal with apartment link
- **Deal Pipeline**: Add apartment-specific stages (viewing, reserved, contract, completed)

#### 4.3 Deal Detail Enhancement
Extend existing `DealDetailPage` to show apartment information when deal has `apartment_id`:
- Apartment details card  
- Link back to chessboard
- Apartment media gallery
- Related documents

### Phase 5: Advanced Features ⏱️ 4-5 days

#### 5.1 Custom Fields System
- **Admin configuration** of custom fields for apartments (matching deals/contacts pattern)
- **Dynamic form generation** based on field definitions  
- **Filtering support** for custom fields in chessboard
- **Validation** and type casting
- **Bulk edit** custom fields for multiple apartments
- **Custom field templates** for different apartment types

#### 5.2 Configurable Status System
- **Admin interface** for creating/managing apartment statuses
- **Status color customization** with color picker
- **Status transitions** - define which status changes are allowed
- **Status permissions** - role-based status change permissions
- **Status history tracking** with user attribution
- **Default status** configuration for new apartments

#### 5.3 Document Management
- **Project documents** upload/management
- **Apartment media** (photos, floor plans, 3D tours)
- **Document expiration tracking**
- **Integration with existing file storage**

#### 5.4 Reporting & Analytics
- **Dashboard widgets** for apartment statistics
- **Sales performance** by project/building  
- **Occupancy reports** and trends
- **Revenue analytics** 
- **Export capabilities** (PDF, Excel)

#### 5.5 Advanced Search & Filters
- **Multi-criteria filtering** (price range, area, rooms, floor, status, custom fields)
- **Saved filter presets** including custom field filters
- **Real-time search** with debouncing
- **Map integration** for location-based search
- **Custom field-based filtering** with dynamic UI generation

### Phase 6: Testing & Polish ⏱️ 2-3 days

#### 6.1 Backend Testing
- **Unit tests** for models and services
- **Feature tests** for API endpoints
- **Integration tests** for CRM connectivity
- **Database triggers testing**

#### 6.2 Frontend Testing  
- **Component unit tests** with React Testing Library
- **Integration tests** for complete workflows
- **E2E tests** with Cypress for critical paths
- **Accessibility testing**

#### 6.3 Performance Optimization
- **Database query optimization** 
- **API response caching**
- **Frontend lazy loading**
- **Image optimization**

## Technical Specifications

### Database Constraints
- All new tables use `team_id` for multi-tenancy
- UUID primary keys consistent with existing schema  
- Soft deletes where appropriate
- Proper foreign key constraints with cascade rules
- Indexes for performance on common queries

### API Standards
- RESTful endpoints following existing patterns
- Consistent error handling and validation
- Paginated responses for large datasets  
- API versioning for future compatibility
- Rate limiting and authentication

### Security Considerations
- **Team-based access control** - users only see their team's data
- **Role-based permissions** for different user types
- **Input validation** and SQL injection prevention  
- **File upload security** for documents and media
- **Audit logging** for sensitive operations

### Performance Requirements  
- **Grid loading** under 2 seconds for 500+ apartments
- **Real-time updates** via WebSocket for concurrent users
- **Optimized queries** with proper eager loading
- **Caching strategy** for frequently accessed data
- **Progressive loading** for large projects

## Deployment Strategy

### Database Migration
1. **Backup** existing database
2. **Run migrations** in staging environment first  
3. **Test data migration** scripts
4. **Production deployment** with rollback plan

### Feature Rollout
1. **Feature flags** for gradual rollout
2. **Beta testing** with selected teams  
3. **A/B testing** for UI components
4. **Gradual user migration** from existing systems

### Training & Documentation
1. **User documentation** with screenshots and workflows
2. **Admin guides** for configuration and management
3. **API documentation** for future integrations  
4. **Video tutorials** for complex features

**Estimated Timeline: 25-31 days**

- **Phase 1**: Database Setup (4-5 days) - *Extended for status configuration tables*
- **Phase 2**: Backend API (6-7 days) - *Extended for custom fields and status management*
- **Phase 3**: Frontend UI (8-9 days) - *Extended for dynamic status handling and custom fields*
- **Phase 4**: Deals Integration (2-3 days)
- **Phase 5**: Advanced Features (4-5 days) - *Extended for status configuration UI*
- **Phase 6**: Testing & Polish (2-3 days)

## Risk Mitigation

### Technical Risks
- **Database performance** - Implement proper indexing and query optimization
- **Complex UI state** - Use proven state management patterns
- **Integration conflicts** - Thorough testing of existing CRM functionality

### Business Risks  
- **User adoption** - Gradual rollout with training
- **Data migration** - Extensive testing and backup procedures
- **Scope creep** - Clear requirements documentation and change management

### Mitigation Strategies
- **Regular stakeholder reviews** at end of each phase
- **Continuous integration/deployment** for quick feedback
- **Documentation-first** approach for all changes
- **Rollback procedures** for each deployment phase

---

*This plan integrates seamlessly with your existing CRM architecture while providing a modern, efficient apartment management system that enhances your current sales workflow.*