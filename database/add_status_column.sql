-- =====================================================
-- DATABASE UPDATE: Tesis Durum Yönetimi (is_active)
-- Tarih: 2026-02-03
-- =====================================================

-- 1. facilities tablosuna is_active kolonunu ekle
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Mevcut kayıtları aktif olarak işaretle
UPDATE facilities SET is_active = true WHERE is_active IS NULL;

-- 3. facilities_full view'ını güncelle (Filtreyi kaldır, admin paneli tümünü görebilsin)
DROP VIEW IF EXISTS facilities_full;

CREATE VIEW facilities_full AS
SELECT 
    f.id,
    f.name,
    f.address,
    f.phone,
    f.email,
    f.website,
    f.facebook,
    f.instagram,
    f.twitter,
    f.nsosyal,
    f.latitude,
    f.longitude,
    f.description,
    f.image_url,
    f.kurum_kodu,
    f.is_active,
    f.created_at,
    f.updated_at,
    d.id as district_id,
    d.name as district_name,
    ft.id as facility_type_id,
    ft.name as facility_type_name,
    ft.icon as facility_type_icon,
    ft.color as facility_type_color
FROM facilities f
LEFT JOIN districts d ON f.district_id = d.id
LEFT JOIN facility_types ft ON f.facility_type_id = ft.id
ORDER BY ft.display_order, f.name;

-- 4. View izinlerini tekrar ver
GRANT SELECT ON facilities_full TO anon, authenticated;
