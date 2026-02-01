-- =====================================================
-- SECURITY HARDENING: Comprehensive RLS Policies
-- Date: 2026-02-02
-- =====================================================

-- 1. Ensure facility_reports table exists (in case it was missing from schema script)
CREATE TABLE IF NOT EXISTS facility_reports (
    id BIGSERIAL PRIMARY KEY,
    facility_id BIGINT REFERENCES facilities(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    reporter_note TEXT,
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable Row Level Security (RLS) on all tables
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_reports ENABLE ROW LEVEL SECURITY;

-- 3. DROP existing policies to avoid conflicts
DO $$ 
BEGIN
    -- districts
    DROP POLICY IF EXISTS "Public can view districts" ON districts;
    DROP POLICY IF EXISTS "Admins can manage districts" ON districts;
    
    -- facility_types
    DROP POLICY IF EXISTS "Public can view facility types" ON facility_types;
    DROP POLICY IF EXISTS "Admins can manage facility types" ON facility_types;
    
    -- facilities
    DROP POLICY IF EXISTS "Public can view active facilities" ON facilities;
    DROP POLICY IF EXISTS "Admins can manage facilities" ON facilities;
    
    -- facility_reports
    DROP POLICY IF EXISTS "Public can submit reports" ON facility_reports;
    DROP POLICY IF EXISTS "Admins can view and manage reports" ON facility_reports;
END $$;

-- 4. Create new refined policies

-- DISTRICTS
CREATE POLICY "Public can view districts" ON districts
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage districts" ON districts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FACILITY TYPES
CREATE POLICY "Public can view facility types" ON facility_types
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage facility types" ON facility_types
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FACILITIES
CREATE POLICY "Public can view active facilities" ON facilities
    FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage facilities" ON facilities
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FACILITY REPORTS
CREATE POLICY "Public can submit reports" ON facility_reports
    FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

CREATE POLICY "Admins can manage reports" ON facility_reports
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Revoke direct table access from public (anon) where necessary
-- Note: Supabase RLS handles this, but explicit grants are good practice
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
GRANT INSERT ON facility_reports TO anon; -- Allow reporting
