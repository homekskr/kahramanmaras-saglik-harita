-- =====================================================
-- FIX RLS INFINITE RECURSION
-- Date: 2026-02-04
-- =====================================================

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER allows this function to bypass RLS on user_roles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- 2. Update user_roles policies to use the secure function
-- This prevents the policy from recursively checking the table itself via RLS
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles" ON user_roles
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles" ON user_roles
    FOR UPDATE TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles" ON user_roles
    FOR DELETE TO authenticated
    USING (is_admin());

-- 3. Update facilities policies for Admins to use the new function (Optimization)
DROP POLICY IF EXISTS "Admins can view facilities" ON facilities;
CREATE POLICY "Admins can view facilities" ON facilities
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert facilities" ON facilities;
CREATE POLICY "Admins can insert facilities" ON facilities
    FOR INSERT TO authenticated
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update facilities" ON facilities;
CREATE POLICY "Admins can update facilities" ON facilities
    FOR UPDATE TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete facilities" ON facilities;
CREATE POLICY "Admins can delete facilities" ON facilities
    FOR DELETE TO authenticated
    USING (is_admin());

-- 4. Ensure "Users can view their own role" is present and correct
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
