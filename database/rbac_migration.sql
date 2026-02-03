-- =====================================================
-- RBAC (Role-Based Access Control) Implementation
-- Date: 2026-02-04
-- =====================================================

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'facility_manager')),
    allowed_facility_types BIGINT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 2. Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Update facilities RLS policies for role-based filtering
DROP POLICY IF EXISTS "Admins can manage facilities" ON facilities;
DROP POLICY IF EXISTS "Facility managers can view assigned types" ON facilities;
DROP POLICY IF EXISTS "Facility managers can manage assigned types" ON facilities;

-- Admin: Full access
CREATE POLICY "Admins can manage facilities" ON facilities
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Facility Manager: View only assigned types
CREATE POLICY "Facility managers can view assigned types" ON facilities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() 
            AND role = 'facility_manager'
            AND facility_type_id = ANY(allowed_facility_types)
        )
    );

-- Facility Manager: Manage only assigned types
CREATE POLICY "Facility managers can manage assigned types" ON facilities
    FOR INSERT, UPDATE, DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() 
            AND role = 'facility_manager'
            AND facility_type_id = ANY(allowed_facility_types)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() 
            AND role = 'facility_manager'
            AND facility_type_id = ANY(allowed_facility_types)
        )
    );

-- 5. Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TABLE (
    role TEXT,
    allowed_facility_types BIGINT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.role, ur.allowed_facility_types
    FROM user_roles ur
    WHERE ur.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- =====================================================
-- INSTRUCTIONS FOR ADDING NEW USERS
-- =====================================================
-- After creating users in Supabase Auth, run:
-- 
-- INSERT INTO user_roles (user_id, role, allowed_facility_types)
-- VALUES 
--   ('USER_UUID_1', 'facility_manager', ARRAY[(SELECT id FROM facility_types WHERE name = 'AİLE SAĞLIĞI MERKEZİ')]),
--   ('USER_UUID_2', 'facility_manager', ARRAY[(SELECT id FROM facility_types WHERE name = 'AİLE SAĞLIĞI MERKEZİ')]);
--
-- Replace USER_UUID_1 and USER_UUID_2 with actual UUIDs from auth.users table
