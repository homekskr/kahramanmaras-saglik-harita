-- =====================================================
-- PENDING PHOTOS SCHEMA
-- Date: 2026-02-04
-- =====================================================

-- Add pending_image columns to facilities table
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS pending_image_1 TEXT,
ADD COLUMN IF NOT EXISTS pending_image_2 TEXT,
ADD COLUMN IF NOT EXISTS pending_image_3 TEXT;

-- Refresh view to include these new columns (optional, but good for admin panel usage)
DROP VIEW IF EXISTS facilities_full;

CREATE OR REPLACE VIEW facilities_full AS
SELECT 
    f.id,
    f.name,
    f.kurum_kodu,
    f.facility_type_id,
    ft.name as facility_type_name,
    ft.icon as facility_type_icon,
    f.district_id,
    d.name as district_name,
    f.address,
    f.phone,
    f.email,
    f.website,
    f.latitude,
    f.longitude,
    f.is_active,
    f.image_1,
    f.image_2,
    f.image_3,
    f.pending_image_1,
    f.pending_image_2,
    f.pending_image_3,
    f.facebook,
    f.instagram,
    f.twitter,
    f.nsosyal,
    f.created_at,
    f.updated_at
FROM facilities f
LEFT JOIN facility_types ft ON f.facility_type_id = ft.id
LEFT JOIN districts d ON f.district_id = d.id;

GRANT SELECT ON facilities_full TO anon, authenticated;
