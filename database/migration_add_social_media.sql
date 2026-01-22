-- =====================================================
-- MIGRATION: Sosyal Medya Kolonlarını Ekle
-- Tarih: 2026-01-23
-- Açıklama: facilities tablosuna sosyal medya kolonları eklenir
-- =====================================================

-- Sosyal medya kolonlarını ekle
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS nsosyal TEXT;

-- facilities_full view'ını güncelle
CREATE OR REPLACE VIEW facilities_full AS
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
WHERE f.is_active = true
ORDER BY ft.display_order, f.name;

-- View erişim izinlerini yeniden ver
GRANT SELECT ON facilities_full TO anon, authenticated;
