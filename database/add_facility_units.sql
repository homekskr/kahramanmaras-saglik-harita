-- =====================================================
-- ASM BİRİM YÖNETİMİ
-- facility_units tablosu ve ilgili yapılar
-- =====================================================

-- Birimler Tablosu
CREATE TABLE IF NOT EXISTS facility_units (
    id BIGSERIAL PRIMARY KEY,
    facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    unit_code TEXT NOT NULL,            -- Örn: 46.10.01
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performans için index
CREATE INDEX IF NOT EXISTS idx_facility_units_facility_id ON facility_units(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_units_active ON facility_units(is_active);

-- updated_at trigger
CREATE TRIGGER update_facility_units_updated_at
    BEFORE UPDATE ON facility_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE facility_units ENABLE ROW LEVEL SECURITY;

-- Herkese okuma izni (aktif birimler)
CREATE POLICY "Public can view active facility units" ON facility_units
    FOR SELECT USING (is_active = true);

-- Kimliği doğrulanmış kullanıcılara tam yönetim izni
CREATE POLICY "Authenticated users can manage facility units" ON facility_units
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon kullanıcıya da okuma izni (harita için)
GRANT SELECT ON facility_units TO anon;
GRANT ALL ON facility_units TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE facility_units_id_seq TO authenticated;

-- =====================================================
-- TEST VERİSİ (İsteğe bağlı - silmek için yorum satırına al)
-- =====================================================
-- INSERT INTO facility_units (facility_id, unit_code, display_order)
-- SELECT f.id, birim.code, birim.ord
-- FROM facilities f
-- CROSS JOIN (VALUES
--     ('46.10.01', 1),
--     ('46.10.02', 2),
--     ('46.10.03', 3)
-- ) AS birim(code, ord)
-- WHERE f.name ILIKE '%örnek asm adı%'
-- ON CONFLICT DO NOTHING;
