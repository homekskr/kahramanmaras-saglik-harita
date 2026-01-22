-- =====================================================
-- VIEW GÜNCELLEME: facilities_full view'ına sosyal medya kolonlarını ekle
-- Tarih: 2026-01-23
-- Açıklama: facilities_full view'ı sosyal medya kolonlarını içerecek şekilde güncellenir
-- =====================================================

-- Önce mevcut view'ı sil (kolon sırası değiştiği için CREATE OR REPLACE çalışmıyor)
DROP VIEW IF EXISTS facilities_full;

-- Yeni view'ı oluştur
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
WHERE f.is_active = true
ORDER BY ft.display_order, f.name;

-- View erişim izinlerini ver
GRANT SELECT ON facilities_full TO anon, authenticated;
