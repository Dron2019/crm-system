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
                a.team_id,
                a.project_id,
                a.building_id,
                a.section_id,
                a.number,
                a.floor,
                a.rooms,
                a.area,
                a.balcony_area,
                a.price,
                a.price_per_sqm,
                a.status_id,
                ast.name as status_name,
                ast.color as status_color,
                a.layout_type,
                a.has_balcony,
                a.has_terrace,
                a.has_loggia,
                a.ceiling_height,
                r.id as reservation_id,
                r.client_id,
                r.deal_id,
                r.manager_id,
                r.status as reservation_status,
                r.expires_at
            FROM apartments a
            JOIN apartment_statuses ast ON ast.id = a.status_id
            LEFT JOIN reservations r ON r.apartment_id = a.id AND r.status = "active"
        ');

        // Create project stats view for dashboard
        DB::statement('
            CREATE OR REPLACE VIEW v_project_stats AS
            SELECT
                p.id,
                p.name,
                p.status,
                COUNT(DISTINCT a.id) as total_apartments,
                COUNT(DISTINCT CASE WHEN ast.name = "Вільно" THEN a.id END) as available_apartments,
                COUNT(DISTINCT CASE WHEN ast.name = "Продано" THEN a.id END) as sold_apartments,
                COUNT(DISTINCT CASE WHEN ast.name = "Резерв" THEN a.id END) as reserved_apartments,
                COUNT(DISTINCT b.id) as total_buildings,
                COUNT(DISTINCT d.id) as total_deals,
                COUNT(DISTINCT pd.id) as document_count,
                SUM(CASE WHEN pd.expires_at < CURDATE() THEN 1 ELSE 0 END) as expired_docs_count
            FROM projects p
            LEFT JOIN buildings b ON b.project_id = p.id
            LEFT JOIN apartments a ON a.project_id = p.id
            LEFT JOIN apartment_statuses ast ON ast.id = a.status_id
            LEFT JOIN reservations r ON r.apartment_id = a.id
            LEFT JOIN deals d ON d.apartment_id = a.id OR d.id = r.deal_id
            LEFT JOIN project_documents pd ON pd.project_id = p.id
            GROUP BY p.id, p.name, p.status
        ');

        // Trigger: Log apartment status changes
        DB::statement('
            CREATE TRIGGER trg_apt_status_log
            AFTER UPDATE ON apartments
            FOR EACH ROW
            BEGIN
                IF OLD.status_id != NEW.status_id THEN
                    INSERT INTO apartment_status_history (id, team_id, apartment_id, old_status_id, new_status_id, created_at)
                    VALUES (UUID(), NEW.team_id, NEW.id, OLD.status_id, NEW.status_id, NOW());
                END IF;
            END
        ');

        // Trigger: Sync apartment status with reservation changes
        DB::statement('
            CREATE TRIGGER trg_reservation_sync_apartment
            AFTER UPDATE ON reservations
            FOR EACH ROW
            BEGIN
                DECLARE vStatusId CHAR(36);
                
                IF NEW.status = "active" AND OLD.status != "active" THEN
                    SELECT id INTO vStatusId FROM apartment_statuses
                    WHERE team_id = NEW.team_id AND name = "Забронировано" LIMIT 1;
                    UPDATE apartments SET status_id = vStatusId WHERE id = NEW.apartment_id;
                ELSEIF NEW.status IN ("expired", "cancelled") THEN
                    SELECT id INTO vStatusId FROM apartment_statuses
                    WHERE team_id = NEW.team_id AND is_default = 1 LIMIT 1;
                    UPDATE apartments SET status_id = vStatusId WHERE id = NEW.apartment_id;
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
