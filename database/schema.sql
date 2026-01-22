-- =====================================================
-- SAĞLIK TESİSLERİ HARİTA UYGULAMASI
-- Supabase Database Schema
-- =====================================================

-- İlçeler Tablosu
CREATE TABLE IF NOT EXISTS districts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tesis Türleri Tablosu
CREATE TABLE IF NOT EXISTS facility_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '🏥',
    color TEXT DEFAULT '#48bb78',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sağlık Tesisleri Tablosu
CREATE TABLE IF NOT EXISTS facilities (
    id BIGSERIAL PRIMARY KEY,
    district_id BIGINT REFERENCES districts(id) ON DELETE CASCADE,
    facility_type_id BIGINT REFERENCES facility_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    facebook TEXT,
    instagram TEXT,
    twitter TEXT,
    nsosyal TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    kurum_kodu TEXT UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district_id);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type_id);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active);
CREATE INDEX IF NOT EXISTS idx_facilities_location ON facilities(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public can view districts" ON districts
    FOR SELECT USING (true);

CREATE POLICY "Public can view facility types" ON facility_types
    FOR SELECT USING (true);

CREATE POLICY "Public can view active facilities" ON facilities
    FOR SELECT USING (is_active = true);

-- =====================================================
-- ÖRNEK VERİLER (Kahramanmaraş)
-- =====================================================

-- İlçeler
INSERT INTO districts (name, center_lat, center_lng) VALUES
('Onikişubat', 37.5847, 36.9228),
('Dulkadiroğlu', 37.5847, 36.9228),
('Afşin', 38.2478, 36.9167),
('Andırın', 37.5764, 36.3508),
('Çağlayancerit', 37.7453, 37.3506),
('Ekinözü', 37.9333, 37.1833),
('Elbistan', 38.2056, 37.1956),
('Göksun', 38.0214, 36.4958),
('Nurhak', 37.9667, 37.4333),
('Pazarcık', 37.4833, 37.2833),
('Türkoğlu', 37.3833, 36.8500)
ON CONFLICT (name) DO NOTHING;

-- Tesis Türleri
INSERT INTO facility_types (name, icon, color, display_order) VALUES
('Hastane', '🏥', '#e53e3e', 1),
('Hastane Ek Bina', '🏢', '#dd6b20', 2),
('İlçe Sağlık Müdürlüğü', '🏛️', '#3182ce', 3),
('Toplum Sağlığı Merkezi', '🏘️', '#38a169', 4),
('Aile Sağlığı Merkezi', '👨‍⚕️', '#805ad5', 5),
('112 Acil Sağlık İstasyonu', '🚑', '#c53030', 6),
('Ağız ve Diş Sağlığı Merkezi', '🦷', '#00b5d8', 7),
('Diğer', '📍', '#718096', 99)
ON CONFLICT (name) DO NOTHING;

-- Örnek Sağlık Tesisleri (Kahramanmaraş merkez için)
INSERT INTO facilities (district_id, facility_type_id, name, address, phone, latitude, longitude) VALUES
(
    (SELECT id FROM districts WHERE name = 'Onikişubat' LIMIT 1),
    (SELECT id FROM facility_types WHERE name = 'Hastane' LIMIT 1),
    'Kahramanmaraş Necip Fazıl Şehir Hastanesi',
    'Yenişehir Mahallesi, Kahramanmaraş',
    '0344 000 00 00',
    37.5847,
    36.9228
),
(
    (SELECT id FROM districts WHERE name = 'Dulkadiroğlu' LIMIT 1),
    (SELECT id FROM facility_types WHERE name = 'İlçe Sağlık Müdürlüğü' LIMIT 1),
    'Dulkadiroğlu İlçe Sağlık Müdürlüğü',
    'Dulkadiroğlu, Kahramanmaraş',
    '0344 000 00 01',
    37.5850,
    36.9230
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_types_updated_at BEFORE UPDATE ON facility_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- Facilities with full details view
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

-- Grant access to view
GRANT SELECT ON facilities_full TO anon, authenticated;
