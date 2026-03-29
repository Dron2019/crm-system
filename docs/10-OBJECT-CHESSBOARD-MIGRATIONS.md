# Database Migration Files for Object Chessboard

## Migration Files Creation Order

Execute these migrations in the specified order to create the Object Chessboard database structure.

### Migration Sequence (16 files total):

1. `2026_03_29_100001_create_projects_table.php`
2. `2026_03_29_100002_create_custom_field_definitions_table.php`
3. `2026_03_29_100003_create_project_documents_table.php`
4. `2026_03_29_100004_create_buildings_table.php`
5. `2026_03_29_100005_create_sections_table.php`
6. `2026_03_29_100006_create_apartments_table.php`
7. `2026_03_29_100007_create_reservations_table.php`
8. `2026_03_29_100008_create_apartment_status_history_table.php`
9. `2026_03_29_100009_create_apartment_pricing_history_table.php`
10. `2026_03_29_100010_create_apartment_media_table.php`
11. `2026_03_29_100011_create_custom_field_values_table.php`
12. `2026_03_29_100012_create_apartment_statuses_table.php`
13. `2026_03_29_100013_create_apartment_status_transitions_table.php`
14. `2026_03_29_100014_connect_apartments_to_statuses.php`
15. `2026_03_29_100015_add_apartment_id_to_deals_table.php`
16. `2026_03_29_100016_create_chessboard_views_and_triggers.php`

## 1. Create Projects Table

**File:** `database/migrations/2026_03_29_100001_create_projects_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('slug')->unique()->nullable();
            $table->string('country')->default('Ukraine');
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->enum('status', ['planning', 'sales', 'construction', 'completed', 'frozen'])
                  ->default('sales');
            $table->date('start_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->uuid('manager_id')->nullable();
            $table->text('description')->nullable();
            $table->text('logo_url')->nullable();
            $table->string('site_url', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('manager_id')->references('id')->on('users')->nullOnDelete();
            
            $table->index(['team_id', 'status']);
            $table->index(['team_id', 'city']);
            $table->index('manager_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
```

## 2. Create Custom Field Definitions Table

**File:** `database/migrations/2026_03_29_100002_create_custom_field_definitions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('entity_type', ['project', 'building', 'apartment']);
            $table->string('field_key', 100);
            $table->string('label');
            $table->enum('field_type', ['text', 'number', 'boolean', 'date', 'select', 'multiselect', 'url'])
                  ->default('text');
            $table->json('options')->nullable(); // for select/multiselect
            $table->boolean('is_required')->default(false);
            $table->boolean('is_filterable')->default(false);
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['entity_type', 'field_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_definitions');
    }
};
```

## 3. Create Project Documents Table  

**File:** `database/migrations/2026_03_29_100003_create_project_documents_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->enum('category', [
                'permit', 'license', 'ownership', 'technical', 
                'declaration', 'contract', 'other'
            ])->default('other');
            $table->string('title');
            $table->text('file_url');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->boolean('is_public')->default(false);
            $table->uuid('uploaded_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            
            $table->index('project_id');
            $table->index('category');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_documents');
    }
};
```

## 4. Create Buildings Table

**File:** `database/migrations/2026_03_29_100004_create_buildings_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('project_id');
            $table->string('name');
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->smallInteger('floors_count')->default(0);
            $table->enum('status', ['planning', 'sales', 'construction', 'completed', 'frozen'])
                  ->default('sales');
            $table->date('delivery_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->restrictOnDelete();
            
            $table->index(['team_id', 'project_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
```

## 5. Create Sections Table

**File:** `database/migrations/2026_03_29_100005_create_sections_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('building_id');
            $table->string('name', 100);
            $table->smallInteger('floors_count')->default(0);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
            
            $table->index(['team_id', 'building_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
```

## 6. Create Apartments Table

**File:** `database/migrations/2026_03_29_100006_create_apartments_table.php`

```php  
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('project_id'); // shortcut for queries
            $table->uuid('building_id');
            $table->uuid('section_id')->nullable();
            $table->string('number', 10);
            $table->smallInteger('floor');
            $table->tinyInteger('rooms');
            $table->decimal('area', 8, 2);
            $table->decimal('balcony_area', 8, 2)->nullable();
            $table->decimal('price', 15, 2);
            $table->decimal('price_per_sqm', 10, 2);
            $table->uuid('status_id');
            $table->string('layout_type', 50)->nullable();
            $table->boolean('has_balcony')->default(false);
            $table->boolean('has_terrace')->default(false);
            $table->boolean('has_loggia')->default(false);
            $table->decimal('ceiling_height', 4, 2)->nullable();
            $table->json('custom_fields')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->restrictOnDelete();
            $table->foreign('building_id')->references('id')->on('buildings')->restrictOnDelete();
            $table->foreign('section_id')->references('id')->on('sections')->nullOnDelete();
            
            $table->unique(['building_id', 'number']);
            $table->index(['team_id', 'project_id', 'status_id']);
            $table->index(['building_id', 'floor']);
            $table->index(['project_id', 'rooms']);
            $table->index(['project_id', 'status_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartments');
    }
};
```

## 7. Create Reservations Table

**File:** `database/migrations/2026_03_29_100007_create_reservations_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('apartment_id');
            $table->uuid('client_id')->nullable(); // FK to contacts
            $table->uuid('deal_id')->nullable(); // FK to deals  
            $table->uuid('manager_id')->nullable(); // FK to users
            $table->enum('status', ['active', 'expired', 'converted', 'cancelled'])->default('active');
            $table->decimal('deposit_amount', 15, 2)->nullable();
            $table->string('deposit_currency', 3)->default('USD');
            $table->timestamp('expires_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            $table->foreign('client_id')->references('id')->on('contacts')->nullOnDelete();
            $table->foreign('deal_id')->references('id')->on('deals')->nullOnDelete();
            $table->foreign('manager_id')->references('id')->on('users')->nullOnDelete();
            
            $table->index(['team_id', 'status']);
            $table->index('apartment_id');
            $table->index(['client_id', 'status']);
            $table->index(['manager_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
```

## 8. Create Apartment Status History Table

**File:** `database/migrations/2026_03_29_100008_create_apartment_status_history_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_status_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('apartment_id');
            $table->string('old_status', 20);
            $table->string('new_status', 20);
            $table->uuid('changed_by')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
            
            $table->index('apartment_id');
            $table->index(['apartment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_status_history');
    }
};
```

## 9. Create Apartment Pricing History Table

**File:** `database/migrations/2026_03_29_100009_create_apartment_pricing_history_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_pricing_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('apartment_id');
            $table->decimal('old_price', 15, 2);
            $table->decimal('new_price', 15, 2);
            $table->decimal('old_price_per_sqm', 10, 2);
            $table->decimal('new_price_per_sqm', 10, 2);
            $table->uuid('changed_by')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
            
            $table->index('apartment_id');
            $table->index(['apartment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_pricing_history');
    }
};
```

## 10. Create Apartment Media Table

**File:** `database/migrations/2026_03_29_100010_create_apartment_media_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('apartment_id');
            $table->enum('type', ['photo', 'floorplan', '3d_tour', 'video']);
            $table->string('title')->nullable();
            $table->text('file_url');
            $table->text('thumbnail_url')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            
            $table->index(['apartment_id', 'type']);
            $table->index(['apartment_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_media');
    }
};
```

## 11. Create Custom Field Values Table

**File:** `database/migrations/2026_03_29_100011_create_custom_field_values_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('definition_id');
            $table->uuid('project_id')->nullable();
            $table->uuid('building_id')->nullable();
            $table->uuid('apartment_id')->nullable();
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 6)->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->date('value_date')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();

            $table->foreign('definition_id')->references('id')->on('custom_field_definitions')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();

            // Ensure one definition can have only one value per object
            $table->unique(['definition_id', 'project_id']);
            $table->unique(['definition_id', 'building_id']);
            $table->unique(['definition_id', 'apartment_id']);
            
            $table->index('project_id');
            $table->index('building_id');
            $table->index('apartment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_values');
    }
};
```

## 12. Create Apartment Statuses Table

**File:** `database/migrations/2026_03_29_100012_create_apartment_statuses_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->string('name');
            $table->string('color', 7)->default('#6B7280'); // Hex color
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->boolean('can_reserve')->default(true);
            $table->boolean('can_sell')->default(false);
            $table->smallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->index(['team_id', 'is_active']);
            $table->index(['team_id', 'sort_order']);
        });

        // Insert default statuses for existing teams
        DB::statement('
            INSERT INTO apartment_statuses (id, team_id, name, color, is_default, can_reserve, can_sell, sort_order, created_at, updated_at)
            SELECT 
                UUID(),
                t.id,
                "Free", 
                "#22C55E",
                1,
                1,
                0,
                1,
                NOW(),
                NOW()
            FROM teams t
        ');

        DB::statement('
            INSERT INTO apartment_statuses (id, team_id, name, color, is_default, can_reserve, can_sell, sort_order, created_at, updated_at)
            SELECT 
                UUID(),
                t.id,
                "Reserved", 
                "#F59E0B",
                0,
                0,
                0,
                2,
                NOW(),
                NOW()
            FROM teams t
        ');

        DB::statement('
            INSERT INTO apartment_statuses (id, team_id, name, color, is_default, can_reserve, can_sell, sort_order, created_at, updated_at)
            SELECT 
                UUID(),
                t.id,
                "Sold", 
                "#3B82F6",
                0,
                0,
                1,
                3,
                NOW(),
                NOW()
            FROM teams t
        ');

        DB::statement('
            INSERT INTO apartment_statuses (id, team_id, name, color, is_default, can_reserve, can_sell, sort_order, created_at, updated_at)
            SELECT 
                UUID(),
                t.id,
                "Blocked", 
                "#EF4444",
                0,
                0,
                0,
                4,
                NOW(),
                NOW()
            FROM teams t
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_statuses');
    }
};
```

## 13. Create Apartment Status Transitions Table

**File:** `database/migrations/2026_03_29_100013_create_apartment_status_transitions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartment_status_transitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('from_status_id');
            $table->uuid('to_status_id');
            $table->string('required_permission')->nullable(); // e.g., 'apartments.sell'
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->cascadeOnDelete();
            $table->foreign('from_status_id')->references('id')->on('apartment_statuses')->cascadeOnDelete();
            $table->foreign('to_status_id')->references('id')->on('apartment_statuses')->cascadeOnDelete();
            
            $table->unique(['from_status_id', 'to_status_id']);
            $table->index(['team_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_status_transitions');
    }
};
```

## 14. Connect Apartments to Status System

**File:** `database/migrations/2026_03_29_100014_connect_apartments_to_statuses.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Set default status for all existing apartments
        DB::statement('
            UPDATE apartments a
            JOIN apartment_statuses s ON s.team_id = a.team_id 
            SET a.status_id = s.id 
            WHERE s.is_default = 1
        ');

        // Add foreign key constraint
        Schema::table('apartments', function (Blueprint $table) {
            $table->foreign('status_id')->references('id')->on('apartment_statuses')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropForeign(['status_id']);
        });
    }
};
```

## 15. Add Apartment ID to Deals Table

**File:** `database/migrations/2026_03_29_100012_add_apartment_id_to_deals_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->uuid('apartment_id')->nullable()->after('company_id');
            
            $table->foreign('apartment_id')->references('id')->on('apartments')->nullOnDelete();
            $table->index('apartment_id');
        });
    }

    public function down(): void
    {
        Schema::table('deals', function (Blueprint $table) {
            $table->dropForeign(['apartment_id']);
            $table->dropIndex(['apartment_id']);
            $table->dropColumn('apartment_id');
        });
    }
};
```

## 16. Create Views and Triggers

**File:** `database/migrations/2026_03_29_100013_create_chessboard_views_and_triggers.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Create chessboard view for efficient data retrieval
        DB::statement('
            CREATE OR REPLACE VIEW v_chessgrid AS
            SELECT
                a.id,
                a.number,
                a.floor,
                a.rooms,
                a.area,
                a.balcony_area,
                a.price,
                a.price_per_sqm,
                a.status,
                a.layout_type,
                a.has_balcony,
                a.has_terrace,
                a.has_loggia,
                a.ceiling_height,
                a.custom_fields,
                a.created_at,
                a.updated_at,
                p.id AS project_id,
                p.name AS project_name,
                p.status AS project_status,
                b.id AS building_id,
                b.name AS building_name,
                s.id AS section_id,
                s.name AS section_name,
                r.id AS reservation_id,
                r.status AS reservation_status,
                r.client_id,
                r.deal_id,
                r.manager_id,
                r.expires_at,
                c.first_name AS client_first_name,
                c.last_name AS client_last_name,
                CONCAT(c.first_name, " ", COALESCE(c.last_name, "")) AS client_full_name,
                u.name AS manager_name
            FROM apartments a
            JOIN projects p ON p.id = a.project_id
            JOIN buildings b ON b.id = a.building_id
            LEFT JOIN sections s ON s.id = a.section_id
            LEFT JOIN reservations r ON r.apartment_id = a.id AND r.status = "active"
            LEFT JOIN contacts c ON c.id = r.client_id
            LEFT JOIN users u ON u.id = r.manager_id
        ');

        // Create project stats view for dashboard
        DB::statement('
            CREATE OR REPLACE VIEW v_project_stats AS
            SELECT
                p.id AS project_id,
                p.name AS project_name,
                p.status AS project_status,
                COUNT(a.id) AS total_apartments,
                SUM(CASE WHEN a.status = "free" THEN 1 ELSE 0 END) AS free_apartments,
                SUM(CASE WHEN a.status = "reserved" THEN 1 ELSE 0 END) AS reserved_apartments,
                SUM(CASE WHEN a.status = "sold" THEN 1 ELSE 0 END) AS sold_apartments,
                SUM(CASE WHEN a.status = "blocked" THEN 1 ELSE 0 END) AS blocked_apartments,
                AVG(a.price) AS avg_price,
                SUM(a.price) AS total_value,
                COUNT(d.expires_at IS NOT NULL AND d.expires_at < CURDATE()) AS expired_docs_count
            FROM projects p
            LEFT JOIN apartments a ON a.project_id = p.id
            LEFT JOIN project_documents d ON d.project_id = p.id
            GROUP BY p.id, p.name, p.status
        ');

        // Trigger: Log apartment status changes
        DB::statement('
            CREATE TRIGGER trg_apt_status_log
            AFTER UPDATE ON apartments
            FOR EACH ROW
            BEGIN
                IF OLD.status <> NEW.status THEN
                    INSERT INTO apartment_status_history (id, apartment_id, old_status, new_status, changed_by, created_at, updated_at)
                    VALUES (UUID(), NEW.id, OLD.status, NEW.status, @user_id, NOW(), NOW());
                END IF;
            END
        ');

        // Trigger: Sync apartment status with reservation changes
        DB::statement('
            CREATE TRIGGER trg_reservation_sync_apartment
            AFTER UPDATE ON reservations
            FOR EACH ROW
            BEGIN
                -- Reservation activated -> apartment becomes reserved
                IF OLD.status <> "active" AND NEW.status = "active" THEN
                    UPDATE apartments SET status = "reserved" WHERE id = NEW.apartment_id;
                END IF;
                
                -- Reservation cancelled/expired -> apartment becomes free (if no other active reservations)
                IF OLD.status = "active" AND NEW.status IN ("cancelled", "expired") THEN
                    IF (SELECT COUNT(*) FROM reservations WHERE apartment_id = NEW.apartment_id AND status = "active") = 0 THEN
                        UPDATE apartments SET status = "free" WHERE id = NEW.apartment_id;
                    END IF;
                END IF;
                
                -- Reservation converted -> apartment becomes sold
                IF OLD.status <> "converted" AND NEW.status = "converted" THEN
                    UPDATE apartments SET status = "sold" WHERE id = NEW.apartment_id;
                END IF;
            END
        ');
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS trg_reservation_sync_apartment');
        DB::statement('DROP TRIGGER IF EXISTS trg_apt_status_log');
        DB::statement('DROP VIEW IF EXISTS v_project_stats');
        DB::statement('DROP VIEW IF EXISTS v_chessgrid');
    }
};
```

## Migration Execution Commands

Run these commands in order to create the database structure:

```bash
# Create migration files (if not already created)
php artisan make:migration create_projects_table
php artisan make:migration create_custom_field_definitions_table
# ... etc for all tables

# Run all migrations
php artisan migrate

# If you need to rollback
php artisan migrate:rollback --step=16

# Check migration status
php artisan migrate:status
```

## Post-Migration Setup

After running the migrations, you should:

1. **Seed initial data** (optional):
   ```bash
   php artisan db:seed --class=ProjectsSeeder
   ```

2. **Update model factories** for testing:
   ```bash
   php artisan make:factory ProjectFactory
   php artisan make:factory ApartmentFactory
   ```

3. **Create policies** for authorization:
   ```bash
   php artisan make:policy ProjectPolicy
   php artisan make:policy ApartmentPolicy
   ```

4. **Run tests** to verify database structure:
   ```bash
   php artisan test --filter=ChessboardTest
   ```

This database structure provides a solid foundation for the Object Chessboard module while maintaining consistency with your existing CRM architecture.