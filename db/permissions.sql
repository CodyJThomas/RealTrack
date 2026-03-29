-- ============================================================
-- RealTrack — Role Permissions
-- Run this in the Supabase SQL Editor (once).
--
-- WHY THIS IS NEEDED:
-- RLS policies control which *rows* a user can see/edit, but
-- they do not grant the *right to use a table* in the first place.
-- Without explicit GRANTs to the `authenticated` role, any
-- authenticated user gets "permission denied" even when RLS
-- would allow the operation.
--
-- The `anon` role is the unauthenticated Supabase client role.
-- The `authenticated` role is automatically used for any signed-in
-- user — regardless of which user it is.
-- ============================================================


-- ------------------------------------------------------------
-- SCHEMA USAGE
-- Required for any role to access objects in `public`.
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;


-- ------------------------------------------------------------
-- TABLE PERMISSIONS — authenticated users
-- Each signed-in user can read and write all tables.
-- RLS policies (in schema.sql) then restrict them to only
-- their own rows. Both layers must pass for any operation.
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers     TO authenticated;


-- ------------------------------------------------------------
-- TABLE PERMISSIONS — anon role
-- The anon key is used by the Supabase JS client before and
-- during authentication. It needs SELECT on profiles so the
-- auth flow can resolve the session.
-- No write access for unauthenticated users.
-- ------------------------------------------------------------
GRANT SELECT ON public.profiles TO anon;


-- ------------------------------------------------------------
-- FUNCTION PERMISSIONS
-- check_tier_limit: called by the frontend before insert to
--   enforce free tier caps. Must be callable by authenticated users.
-- evaluate_client_flag: called server-side after visit/offer
--   inserts. Already SECURITY DEFINER so it runs as postgres,
--   but the caller still needs EXECUTE permission.
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.check_tier_limit(UUID, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_client_flag(UUID)       TO authenticated;


-- ------------------------------------------------------------
-- SEQUENCE PERMISSIONS (if using serial/bigserial IDs)
-- Not needed here since all PKs use uuid_generate_v4(),
-- but included as a no-op safety net.
-- ------------------------------------------------------------
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ------------------------------------------------------------
-- VERIFY — confirm grants are in place
-- Expected: authenticated should appear in grantee column
-- for SELECT, INSERT, UPDATE, DELETE on each table.
-- ------------------------------------------------------------
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee IN ('anon', 'authenticated')
ORDER  BY table_name, grantee, privilege_type;
