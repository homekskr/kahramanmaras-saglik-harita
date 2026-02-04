-- =====================================================
-- REFRESH FACILITIES VIEW
-- Date: 2026-02-04
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS facilities_full;

-- Recreate the view with all columns including new image columns
-- Removed neighborhoods join as the table might not exist
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
    -- f.neighborhood_id, -- Commented out if table doesn't exist
    -- n.name as neighborhood_name, -- Commented out if table doesn't exist
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
    f.facebook,
    f.instagram,
    f.twitter,
    f.nsosyal,
    f.created_at,
    f.updated_at
FROM facilities f
LEFT JOIN facility_types ft ON f.facility_type_id = ft.id
LEFT JOIN districts d ON f.district_id = d.id;
-- LEFT JOIN neighborhoods n ON f.neighborhood_id = n.id; -- Removed

-- Grant permissions
GRANT SELECT ON facilities_full TO anon, authenticated;
