================================================================
ЗАВДАННЯ ДЛЯ РОЗРОБНИКА
Модуль «Шахматка квартир» — інтеграція в існуючу CRM
База даних: MySQL 8+
================================================================

## ЩО ПОТРІБНО ЗРОБИТИ

Додати в існуючу CRM систему новий модуль — «Шахматка квартир».
Це візуальна сітка квартир по поверхах і секціях із прив'язкою
до клієнтів, угод і менеджерів, які вже є в системі.

Модуль НЕ є окремим застосунком — він має органічно
вбудуватись у поточну CRM: спільні таблиці users, clients, deals
використовуються через зовнішні ключі.

----------------------------------------------------------------
КРОК 1. АНАЛІЗ ІСНУЮЧОЇ БД (зробити ПЕРЕД будь-якими змінами)
----------------------------------------------------------------

Перед написанням міграцій розробник зобов'язаний:

1. Переглянути структуру таких таблиць CRM (назви можуть
   відрізнятись — знайти аналоги):
   - таблиця користувачів / менеджерів (users / managers / staff)
   - таблиця клієнтів / лідів (clients / contacts / leads)
   - таблиця угод / продажів (deals / orders / contracts)

2. Зафіксувати:
   - точні назви таблиць і первинних ключів (id / uuid / int?)
   - тип PK: INT AUTO_INCREMENT чи CHAR(36) UUID?
   - кодування: utf8mb4?
   - движок: InnoDB?

3. На основі цього аналізу:
   - підібрати тип для FK у нових таблицях (INT або CHAR(36))
   - прописати реальні назви таблиць у REFERENCES
   - якщо PK у CRM — INT, замінити CHAR(36) на BIGINT UNSIGNED
     у всіх нових таблицях

Не починати міграцію поки аналіз не завершено.

----------------------------------------------------------------
КРОК 2. НОВІ ТАБЛИЦІ — ІЄРАРХІЯ МОДУЛЯ
----------------------------------------------------------------

Ієрархія об'єктів (зверху донизу):

  projects  →  buildings  →  sections  →  apartments
  (ЖК)         (будинок)     (секція/       (квартира)
                              під'їзд)

Додатково до квартири:
  - reservations         (бронювання — зв'язок з CRM)
  - apartment_status_history   (журнал змін статусу)
  - apartment_pricing_history  (журнал цін)
  - apartment_media            (фото, планування)
  - project_documents          (документи ЖК)
  - custom_field_definitions   (схема кастомних полів)
  - custom_field_values        (значення кастомних полів)

----------------------------------------------------------------
КРОК 3. DDL — ТАБЛИЦІ (MySQL 8, InnoDB, utf8mb4)
----------------------------------------------------------------

Нижче наведено повну схему. Розробник адаптує типи FK
та назви REFERENCES до реальної CRM після кроку 1.

Умовні позначки у коментарях:
  [CRM_USERS]   — замінити на реальну таблицю користувачів
  [CRM_CLIENTS] — замінити на реальну таблицю клієнтів
  [CRM_DEALS]   — замінити на реальну таблицю угод
  [PK_TYPE]     — замінити на тип PK з CRM (INT або CHAR(36))


-- *** projects ***
CREATE TABLE projects (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    name             VARCHAR(255)   NOT NULL,
    brand            VARCHAR(255),
    slug             VARCHAR(100)   UNIQUE,
    country          VARCHAR(100)   NOT NULL DEFAULT 'Ukraine',
    city             VARCHAR(100),
    address          TEXT,
    latitude         DECIMAL(10,7),
    longitude        DECIMAL(10,7),
    status           ENUM('planning','sales','construction','completed','frozen')
                     NOT NULL DEFAULT 'sales',
    start_date       DATE,
    delivery_date    DATE,
    manager_id       [PK_TYPE],     -- FK → [CRM_USERS].id
    description      TEXT,
    logo_url         TEXT,
    site_url         VARCHAR(500),
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_projects_status  (status),
    KEY idx_projects_city    (city),
    KEY idx_projects_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** project_documents ***
-- Дозволи, ліцензії, договори, технічні умови по проекту.
-- Поле is_expired обчислюється в коді або через VIEW —
-- MySQL 8 підтримує GENERATED COLUMNS, але з обмеженнями на CURDATE().
CREATE TABLE project_documents (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    project_id       CHAR(36)       NOT NULL,
    category         ENUM('permit','license','ownership',
                          'technical','declaration','contract','other')
                     NOT NULL DEFAULT 'other',
    title            VARCHAR(255)   NOT NULL,
    file_url         TEXT           NOT NULL,
    file_size        BIGINT UNSIGNED,
    mime_type        VARCHAR(100),
    issued_at        DATE,
    expires_at       DATE,
    is_public        TINYINT(1)     NOT NULL DEFAULT 0,
    uploaded_by      [PK_TYPE],     -- FK → [CRM_USERS].id
    notes            TEXT,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_proj_doc_project
        FOREIGN KEY (project_id) REFERENCES projects(id)
        ON DELETE CASCADE,
    KEY idx_proj_docs_project  (project_id),
    KEY idx_proj_docs_category (category),
    KEY idx_proj_docs_expires  (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** custom_field_definitions ***
-- Адмін CRM задає кастомні поля для проектів, будинків або квартир.
CREATE TABLE custom_field_definitions (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    entity_type      ENUM('project','building','apartment') NOT NULL,
    field_key        VARCHAR(100)   NOT NULL,
    label            VARCHAR(255)   NOT NULL,
    field_type       ENUM('text','number','boolean','date',
                          'select','multiselect','url')
                     NOT NULL DEFAULT 'text',
    options          JSON,          -- для select/multiselect: ["Економ","Комфорт"]
    is_required      TINYINT(1)     NOT NULL DEFAULT 0,
    is_filterable    TINYINT(1)     NOT NULL DEFAULT 0,
    sort_order       SMALLINT       NOT NULL DEFAULT 0,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cfd_entity_key (entity_type, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** custom_field_values ***
-- Значення кастомних полів. Рівно один з трьох FK заповнений.
-- Перевірку поліморфного зв'язку реалізувати в коді або тригером.
CREATE TABLE custom_field_values (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    definition_id    CHAR(36)       NOT NULL,
    project_id       CHAR(36),
    building_id      CHAR(36),
    apartment_id     CHAR(36),
    value_text       TEXT,
    value_number     DECIMAL(20,6),
    value_boolean    TINYINT(1),
    value_date       DATE,
    value_json       JSON,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_cfv_definition
        FOREIGN KEY (definition_id)
        REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    -- Унікальність: одне визначення — одне значення на об'єкт
    UNIQUE KEY uq_cfv_project    (definition_id, project_id),
    UNIQUE KEY uq_cfv_building   (definition_id, building_id),
    UNIQUE KEY uq_cfv_apartment  (definition_id, apartment_id),
    KEY idx_cfv_project    (project_id),
    KEY idx_cfv_building   (building_id),
    KEY idx_cfv_apartment  (apartment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ВАЖЛИВО: додати в код або тригер перевірку:
-- рівно один із (project_id, building_id, apartment_id) NOT NULL.


-- *** buildings ***
CREATE TABLE buildings (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    project_id       CHAR(36)       NOT NULL,
    name             VARCHAR(255)   NOT NULL,
    city             VARCHAR(100),
    address          TEXT,
    latitude         DECIMAL(10,7),
    longitude        DECIMAL(10,7),
    floors_count     SMALLINT       NOT NULL DEFAULT 0,
    status           ENUM('planning','sales','construction','completed','frozen')
                     NOT NULL DEFAULT 'sales',
    delivery_date    DATE,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_building_project
        FOREIGN KEY (project_id) REFERENCES projects(id)
        ON DELETE RESTRICT,
    KEY idx_buildings_project (project_id),
    KEY idx_buildings_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** sections ***
CREATE TABLE sections (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    building_id      CHAR(36)       NOT NULL,
    name             VARCHAR(100)   NOT NULL,
    floors_count     SMALLINT       NOT NULL DEFAULT 0,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_section_building
        FOREIGN KEY (building_id) REFERENCES buildings(id)
        ON DELETE CASCADE,
    KEY idx_sections_building (building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** apartments ***
-- Головна таблиця шахматки. project_id — shortcut FK для швидких
-- запитів без JOIN через buildings.
CREATE TABLE apartments (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    project_id       CHAR(36)       NOT NULL,
    building_id      CHAR(36)       NOT NULL,
    section_id       CHAR(36),
    floor            SMALLINT       NOT NULL,
    number           VARCHAR(20)    NOT NULL,
    rooms            TINYINT        NOT NULL DEFAULT 1,
    type             ENUM('studio','1k','2k','3k','4k+',
                          'penthouse','commercial','parking')
                     NOT NULL DEFAULT '1k',
    area_total       DECIMAL(8,2)   NOT NULL,
    area_living      DECIMAL(8,2),
    area_kitchen     DECIMAL(8,2),
    ceiling_height   DECIMAL(4,2),
    orientation      VARCHAR(50),
    finishing        ENUM('none','rough','turnkey','designer')
                     NOT NULL DEFAULT 'none',
    price            DECIMAL(14,2)  NOT NULL,
    -- price_per_m2 обчислюється в коді або VIEW (MySQL обмежує
    -- GENERATED COLUMNS з посиланням на інші колонки в обчисленнях)
    price_per_m2     DECIMAL(10,2)  AS (ROUND(price / area_total, 2)) STORED,
    currency         CHAR(3)        NOT NULL DEFAULT 'UAH',
    status           ENUM('free','reserved','sold','unavailable')
                     NOT NULL DEFAULT 'free',
    floor_plan_url   TEXT,
    notes            TEXT,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_apt_position (building_id, section_id, floor, number),
    CONSTRAINT fk_apt_project
        FOREIGN KEY (project_id)  REFERENCES projects(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_apt_building
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT,
    CONSTRAINT fk_apt_section
        FOREIGN KEY (section_id)  REFERENCES sections(id)  ON DELETE SET NULL,
    KEY idx_apartments_project  (project_id),
    KEY idx_apartments_building (building_id),
    KEY idx_apartments_section  (section_id),
    KEY idx_apartments_status   (status),
    KEY idx_apartments_floor    (floor),
    KEY idx_apartments_rooms    (rooms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** reservations ***
-- Зв'язок між квартирою та клієнтом/угодою з CRM.
-- client_id, deal_id, manager_id — FK до існуючих таблиць CRM.
-- Тип [PK_TYPE] визначається після аналізу кроку 1.
CREATE TABLE reservations (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    apartment_id     CHAR(36)       NOT NULL,
    project_id       CHAR(36)       NOT NULL,
    client_id        [PK_TYPE]      NOT NULL,    -- FK → [CRM_CLIENTS].id
    deal_id          [PK_TYPE],                  -- FK → [CRM_DEALS].id
    manager_id       [PK_TYPE],                  -- FK → [CRM_USERS].id
    reserved_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at       DATETIME,
    amount_hold      DECIMAL(14,2),
    status           ENUM('active','expired','converted','cancelled')
                     NOT NULL DEFAULT 'active',
    notes            TEXT,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                     ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_res_apartment
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_res_project
        FOREIGN KEY (project_id)   REFERENCES projects(id)   ON DELETE RESTRICT,
    -- FK до CRM додати після аналізу (крок 1):
    -- CONSTRAINT fk_res_client  FOREIGN KEY (client_id)  REFERENCES [CRM_CLIENTS](id),
    -- CONSTRAINT fk_res_deal    FOREIGN KEY (deal_id)    REFERENCES [CRM_DEALS](id),
    -- CONSTRAINT fk_res_manager FOREIGN KEY (manager_id) REFERENCES [CRM_USERS](id),
    KEY idx_res_apartment (apartment_id),
    KEY idx_res_client    (client_id),
    KEY idx_res_deal      (deal_id),
    KEY idx_res_status    (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** apartment_status_history ***
CREATE TABLE apartment_status_history (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    apartment_id     CHAR(36)       NOT NULL,
    old_status       VARCHAR(30),
    new_status       VARCHAR(30)    NOT NULL,
    changed_by       [PK_TYPE],     -- FK → [CRM_USERS].id
    reason           TEXT,
    changed_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ash_apartment
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    KEY idx_ash_apartment (apartment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** apartment_pricing_history ***
CREATE TABLE apartment_pricing_history (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    apartment_id     CHAR(36)       NOT NULL,
    price            DECIMAL(14,2)  NOT NULL,
    price_per_m2     DECIMAL(10,2),
    currency         CHAR(3)        NOT NULL DEFAULT 'UAH',
    valid_from       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    set_by           [PK_TYPE],     -- FK → [CRM_USERS].id
    note             TEXT,
    PRIMARY KEY (id),
    CONSTRAINT fk_aph_apartment
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    KEY idx_aph_apartment (apartment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- *** apartment_media ***
CREATE TABLE apartment_media (
    id               CHAR(36)       NOT NULL DEFAULT (UUID()),
    apartment_id     CHAR(36)       NOT NULL,
    type             ENUM('photo','floor_plan','render','3d_tour','document')
                     NOT NULL DEFAULT 'photo',
    url              TEXT           NOT NULL,
    title            VARCHAR(255),
    sort_order       SMALLINT       NOT NULL DEFAULT 0,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_media_apartment
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    KEY idx_media_apartment (apartment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


----------------------------------------------------------------
КРОК 4. ТРИГЕРИ MySQL
----------------------------------------------------------------

Тригер 1: журналювання зміни статусу квартири.
При кожному UPDATE apartments WHERE old.status != new.status —
автоматично вставляти запис у apartment_status_history.

DELIMITER //
CREATE TRIGGER trg_apt_status_log
AFTER UPDATE ON apartments
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO apartment_status_history
            (id, apartment_id, old_status, new_status, changed_at)
        VALUES
            (UUID(), NEW.id, OLD.status, NEW.status, NOW());
    END IF;
END//
DELIMITER ;


Тригер 2: синхронізація статусу квартири при зміні бронювання.
При UPDATE reservations — автоматично оновлювати apartments.status.

DELIMITER //
CREATE TRIGGER trg_reservation_sync_apartment
AFTER UPDATE ON reservations
FOR EACH ROW
BEGIN
    -- Бронювання активоване → квартира стає reserved
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        UPDATE apartments
        SET status = 'reserved'
        WHERE id = NEW.apartment_id AND status = 'free';
    END IF;

    -- Бронювання скасоване або прострочене → квартира знову free
    IF NEW.status IN ('cancelled', 'expired') AND OLD.status = 'active' THEN
        UPDATE apartments
        SET status = 'free'
        WHERE id = NEW.apartment_id AND status = 'reserved';
    END IF;

    -- Угода підписана → квартира sold
    IF NEW.status = 'converted' AND OLD.status = 'active' THEN
        UPDATE apartments
        SET status = 'sold'
        WHERE id = NEW.apartment_id;
    END IF;
END//
DELIMITER ;


Тригер 3 (опціонально): унікальне активне бронювання.
MySQL не підтримує partial unique index. Альтернатива — тригер
або перевірка на рівні коду перед INSERT.

DELIMITER //
CREATE TRIGGER trg_reservation_one_active
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE cnt INT;
    IF NEW.status = 'active' THEN
        SELECT COUNT(*) INTO cnt
        FROM reservations
        WHERE apartment_id = NEW.apartment_id AND status = 'active';
        IF cnt > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Квартира вже має активне бронювання';
        END IF;
    END IF;
END//
DELIMITER ;


----------------------------------------------------------------
КРОК 5. VIEWS для шахматки та дашборду
----------------------------------------------------------------

-- v_chessgrid: один рядок = одна квартира з усіма даними для UI
CREATE OR REPLACE VIEW v_chessgrid AS
SELECT
    a.id,
    a.project_id,
    a.building_id,
    a.section_id,
    a.floor,
    a.number,
    a.rooms,
    a.type,
    a.area_total,
    a.price,
    a.price_per_m2,
    a.currency,
    a.status,
    a.finishing,
    a.floor_plan_url,
    p.name          AS project_name,
    p.brand         AS project_brand,
    b.name          AS building_name,
    b.city          AS building_city,
    s.name          AS section_name,
    r.id            AS reservation_id,
    r.client_id,
    r.deal_id,
    r.manager_id,
    r.reserved_at,
    r.expires_at
FROM apartments a
JOIN  projects    p  ON p.id = a.project_id
JOIN  buildings   b  ON b.id = a.building_id
LEFT JOIN sections   s  ON s.id = a.section_id
LEFT JOIN reservations r
    ON r.apartment_id = a.id AND r.status = 'active';


-- v_project_stats: статистика по кожному ЖК для дашборду
CREATE OR REPLACE VIEW v_project_stats AS
SELECT
    p.id                                                          AS project_id,
    p.name,
    p.status,
    COUNT(a.id)                                                   AS total,
    SUM(a.status = 'free')                                        AS free,
    SUM(a.status = 'reserved')                                    AS reserved,
    SUM(a.status = 'sold')                                        AS sold,
    SUM(a.status = 'unavailable')                                 AS unavailable,
    ROUND(AVG(a.price_per_m2), 2)                                 AS avg_price_per_m2,
    ROUND(SUM(IF(a.status = 'sold', a.price, 0)), 2)              AS revenue,
    SUM(d.expires_at IS NOT NULL AND d.expires_at < CURDATE())    AS expired_docs_count
FROM projects p
LEFT JOIN apartments        a ON a.project_id = p.id
LEFT JOIN project_documents d ON d.project_id = p.id
GROUP BY p.id, p.name, p.status;


-- v_project_custom_fields: зручний перегляд кастомних полів проекту
CREATE OR REPLACE VIEW v_project_custom_fields AS
SELECT
    cfv.project_id,
    cfd.field_key    AS `key`,
    cfd.label,
    cfd.field_type,
    cfd.is_filterable,
    COALESCE(
        cfv.value_text,
        cfv.value_number,
        cfv.value_boolean,
        cfv.value_date,
        cfv.value_json
    )                AS value
FROM custom_field_values      cfv
JOIN custom_field_definitions cfd ON cfd.id = cfv.definition_id
WHERE cfv.project_id IS NOT NULL;


----------------------------------------------------------------
КРОК 6. БІЗНЕС-ЛОГІКА НА РІВНІ КОДУ (не БД)
----------------------------------------------------------------

Реалізувати у backend-сервісі або моделях CRM:

1. ПЕРЕВІРКА ПОЛІМОРФНОГО ЗВ'ЯЗКУ custom_field_values
   Перед INSERT/UPDATE перевіряти, що рівно один з трьох FK
   (project_id, building_id, apartment_id) заповнений.

2. КАСКАДНЕ ОНОВЛЕННЯ СТАТУСУ
   При конвертації угоди (deal.status → 'won' або аналог у CRM):
   - знайти пов'язане активне бронювання
   - встановити reservation.status = 'converted'
   - тригер автоматично поставить apartment.status = 'sold'

3. ПРОСТРОЧЕННЯ БРОНЮВАННЯ
   Scheduled job (cron / queue) що запускається раз на добу:
   UPDATE reservations
   SET status = 'expired'
   WHERE status = 'active'
     AND expires_at IS NOT NULL
     AND expires_at < NOW();
   (тригер автоматично поверне apartment.status = 'free')

4. КАСТОМНІ ПОЛЯ У ФІЛЬТРАХ ШАХМАТКИ
   При побудові запиту фільтрації квартир — якщо фільтр
   відповідає custom_field_definitions.is_filterable = 1,
   додавати JOIN до custom_field_values по apartment_id.

5. ВИДИМІСТЬ ДОКУМЕНТІВ
   project_documents.is_public = 0 — лише для внутрішнього
   використання менеджерами. Не передавати на публічний API.


----------------------------------------------------------------
КРОК 7. ПІДКЛЮЧЕННЯ FK ДО CRM (після аналізу кроку 1)
----------------------------------------------------------------

Виконати після того, як встановлено реальні назви таблиць CRM:

ALTER TABLE reservations
    ADD CONSTRAINT fk_res_client
        FOREIGN KEY (client_id) REFERENCES [CRM_CLIENTS](id),
    ADD CONSTRAINT fk_res_deal
        FOREIGN KEY (deal_id) REFERENCES [CRM_DEALS](id),
    ADD CONSTRAINT fk_res_manager
        FOREIGN KEY (manager_id) REFERENCES [CRM_USERS](id);

ALTER TABLE projects
    ADD CONSTRAINT fk_project_manager
        FOREIGN KEY (manager_id) REFERENCES [CRM_USERS](id);

ALTER TABLE project_documents
    ADD CONSTRAINT fk_doc_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES [CRM_USERS](id);

ALTER TABLE apartment_status_history
    ADD CONSTRAINT fk_ash_changed_by
        FOREIGN KEY (changed_by) REFERENCES [CRM_USERS](id);


----------------------------------------------------------------
КРОК 8. ПРИКЛАДИ РОБОЧИХ ЗАПИТІВ
----------------------------------------------------------------

-- Шахматка конкретного будинку (для рендеру сітки у UI):
SELECT * FROM v_chessgrid
WHERE building_id = ?
ORDER BY floor DESC, number ASC;

-- Усі вільні квартири проекту:
SELECT * FROM v_chessgrid
WHERE project_id = ? AND status = 'free'
ORDER BY floor, number;

-- Статистика по всіх проектах:
SELECT * FROM v_project_stats
ORDER BY name;

-- Кастомні поля конкретного проекту:
SELECT * FROM v_project_custom_fields
WHERE project_id = ?;

-- Додати кастомне поле "Клас житла" для проектів:
INSERT INTO custom_field_definitions
    (id, entity_type, field_key, label, field_type, options, is_filterable, sort_order)
VALUES
    (UUID(), 'project', 'housing_class', 'Клас житла', 'select',
     '["Економ","Комфорт","Бізнес","Преміум","Еліт"]', 1, 1);

-- Встановити значення кастомного поля для проекту:
INSERT INTO custom_field_values (id, definition_id, project_id, value_text)
VALUES (UUID(), '<definition_id>', '<project_id>', 'Бізнес');

-- Документи проекту з прострочені:
SELECT title, category, expires_at
FROM project_documents
WHERE project_id = ?
  AND expires_at < CURDATE()
ORDER BY expires_at;


----------------------------------------------------------------
ПІДСУМОК НОВИХ ТАБЛИЦЬ
----------------------------------------------------------------

  projects                   — девелоперські проекти (ЖК)
  project_documents          — документи ЖК (дозволи, ліцензії)
  custom_field_definitions   — схема кастомних полів
  custom_field_values        — значення кастомних полів
  buildings                  — будинки всередині проекту
  sections                   — секції / під'їзди
  apartments                 — квартири (серце шахматки)
  reservations               — бронювання (зв'язок з CRM)
  apartment_status_history   — журнал статусів квартири
  apartment_pricing_history  — журнал цін
  apartment_media            — фото, планування, 3D-тури

Всього: 11 нових таблиць + 3 VIEW + 3 тригери.

===============================================================