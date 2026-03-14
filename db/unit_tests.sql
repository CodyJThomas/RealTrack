-- ============================================================
-- RealTrack — SQL Unit Tests
-- Run these individually in the Supabase SQL Editor to verify
-- data integrity, relationships, and business logic functions.
-- These are read-only SELECT queries and safe to run anytime.
-- ============================================================


-- ------------------------------------------------------------
-- 1. CONFIRM USER + PROFILE EXISTS
-- Verifies that the auth trigger worked correctly and every
-- authenticated user has a matching row in public.profiles.
-- Expected: one row per user, tier = 'free' for new accounts.
-- ------------------------------------------------------------
SELECT
  u.id,
  u.email,
  u.created_at        AS auth_created,
  p.tier,
  p.stripe_customer_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;


-- ------------------------------------------------------------
-- 2. CONFIRM CLIENT WAS SAVED
-- Verifies the client record exists with correct field values.
-- Expected: Penelope the Cat appears with her user_id attached.
-- ------------------------------------------------------------
SELECT
  id,
  full_name,
  phone,
  email,
  budget_min,
  budget_max,
  retainer_required,
  flag_reason,
  notes,
  created_at
FROM public.clients
ORDER BY created_at DESC;


-- ------------------------------------------------------------
-- 3. CONFIRM AGENTS SAVED CORRECTLY
-- Checks all agent records including category and rating.
-- Expected: any agents you have added appear here.
-- ------------------------------------------------------------
SELECT
  a.id,
  a.full_name,
  a.brokerage,
  a.category,
  a.rating,
  a.notes,
  array_agg(t.tag) AS tags
FROM public.agents a
LEFT JOIN public.agent_tags t ON t.agent_id = a.id
GROUP BY a.id
ORDER BY a.full_name;


-- ------------------------------------------------------------
-- 4. CONFIRM RLS IS ENFORCED
-- Checks that every record in agents and clients has a valid
-- user_id that matches a real profile. If any rows return NULL
-- for profile_id, the foreign key or RLS policy has a gap.
-- Expected: profile_id is never NULL.
-- ------------------------------------------------------------
SELECT
  'agents'       AS table_name,
  a.id,
  a.full_name,
  a.user_id,
  p.id           AS profile_id
FROM public.agents a
LEFT JOIN public.profiles p ON p.id = a.user_id

UNION ALL

SELECT
  'clients'      AS table_name,
  c.id,
  c.full_name,
  c.user_id,
  p.id           AS profile_id
FROM public.clients c
LEFT JOIN public.profiles p ON p.id = c.user_id

ORDER BY table_name, full_name;


-- ------------------------------------------------------------
-- 5. TEST TIER LIMIT FUNCTION
-- Calls check_tier_limit directly for your user.
-- Replace the email below with your login email.
-- Expected: TRUE if under 5 records, FALSE if at the cap.
-- ------------------------------------------------------------
SELECT
  public.check_tier_limit(id, 'agents')  AS can_add_agent,
  public.check_tier_limit(id, 'clients') AS can_add_client
FROM auth.users
WHERE email = 'your@email.com';


-- ------------------------------------------------------------
-- 6. VISIT AND OFFER COUNTS PER CLIENT
-- Shows a summary of client activity — useful for spotting
-- clients who are close to triggering the auto-flag threshold.
-- Expected: visit and offer counts match what you have logged.
-- ------------------------------------------------------------
SELECT
  c.full_name,
  c.flag_reason,
  c.retainer_required,
  COUNT(DISTINCT v.id)  AS visit_count,
  COUNT(DISTINCT o.id)  AS offer_count
FROM public.clients c
LEFT JOIN public.visits v  ON v.client_id = c.id
LEFT JOIN public.deals  d  ON d.client_id = c.id
LEFT JOIN public.offers o  ON o.deal_id   = d.id
GROUP BY c.id
ORDER BY visit_count DESC;


-- ------------------------------------------------------------
-- 7. TEST AUTO-FLAG FUNCTION DIRECTLY
-- Manually calls evaluate_client_flag for a specific client.
-- Replace the client name filter to target a specific record.
-- Run query 6 above before and after to see flag_reason change.
-- NOTE: this WILL update the client record if thresholds are met.
-- ------------------------------------------------------------
SELECT public.evaluate_client_flag(id)
FROM public.clients
WHERE full_name = 'Penelope the Cat';


-- ------------------------------------------------------------
-- 8. DEALS AND OFFERS SUMMARY
-- Full picture of all deals, their stages, and linked offers.
-- Expected: any deals you have logged appear with offer detail.
-- ------------------------------------------------------------
SELECT
  d.address,
  d.stage,
  d.our_offer,
  d.their_offer,
  o.amount        AS offer_amount,
  o.direction,
  o.status        AS offer_status,
  o.offer_date,
  c.full_name     AS client_name,
  a.full_name     AS agent_name
FROM public.deals d
LEFT JOIN public.offers  o ON o.deal_id   = d.id
LEFT JOIN public.clients c ON c.id        = d.client_id
LEFT JOIN public.agents  a ON a.id        = d.agent_id
ORDER BY d.created_at DESC;


-- ------------------------------------------------------------
-- 9. ORPHAN CHECK
-- Looks for any visits or offers that reference a client or
-- deal that no longer exists. Should always return zero rows.
-- Expected: empty result set.
-- ------------------------------------------------------------
SELECT 'orphaned visit' AS issue, v.id, v.client_id
FROM public.visits v
LEFT JOIN public.clients c ON c.id = v.client_id
WHERE c.id IS NULL

UNION ALL

SELECT 'orphaned offer' AS issue, o.id, o.deal_id
FROM public.offers o
LEFT JOIN public.deals d ON d.id = o.deal_id
WHERE d.id IS NULL;


-- ------------------------------------------------------------
-- 10. FULL RECORD COUNT SUMMARY
-- Quick health check showing how many rows exist in each table.
-- Useful as a sanity check after any bulk operation or migration.
-- ------------------------------------------------------------
SELECT 'profiles'   AS table_name, COUNT(*) AS row_count FROM public.profiles
UNION ALL
SELECT 'agents',      COUNT(*) FROM public.agents
UNION ALL
SELECT 'agent_tags',  COUNT(*) FROM public.agent_tags
UNION ALL
SELECT 'clients',     COUNT(*) FROM public.clients
UNION ALL
SELECT 'visits',      COUNT(*) FROM public.visits
UNION ALL
SELECT 'deals',       COUNT(*) FROM public.deals
UNION ALL
SELECT 'offers',      COUNT(*) FROM public.offers
ORDER BY table_name;