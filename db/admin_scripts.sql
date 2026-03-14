-- ============================================================
-- RealTrack — Admin SQL Scripts
-- Run individually in the Supabase SQL Editor as needed.
-- Never run these in bulk — each section is standalone.
-- ============================================================


-- ------------------------------------------------------------
-- SCRIPT 1: SET A USER TO PAID TIER
-- Upgrades a specific user to the paid tier by email.
-- Replace the email address with your friend's email.
-- Safe to run multiple times (upsert behavior via UPDATE).
-- ------------------------------------------------------------
UPDATE public.profiles
SET tier = 'paid'
WHERE email = 'your-friends-email@example.com';

-- Verify it took effect:
SELECT id, email, tier FROM public.profiles
WHERE email = 'your-friends-email@example.com';


-- ------------------------------------------------------------
-- SCRIPT 2: DUMMY DATA FOR FREE TIER TESTING
-- Inserts sample agents, clients, visits, deals, and offers
-- scoped to your account. Replace the email with yours.
-- Respects the free tier cap of 5 agents and 5 clients.
-- Run once — re-running will create duplicates.
-- ------------------------------------------------------------

DO $$
DECLARE
  v_user_id     UUID;
  v_agent1_id   UUID;
  v_agent2_id   UUID;
  v_agent3_id   UUID;
  v_client1_id  UUID;
  v_client2_id  UUID;
  v_client3_id  UUID;
  v_deal1_id    UUID;
  v_deal2_id    UUID;
  v_deal3_id    UUID;
BEGIN

  -- Get your user ID from your email
  SELECT id INTO v_user_id FROM auth.users
  WHERE email = 'your@email.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check the email address.';
  END IF;

  -- ── Agents ──────────────────────────────────────────────
  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Sandra Lee',  'Compass',        '(216) 555-0101', 'Preferred', 5, 'Always prepared. Fast responses on counters. Closes on time.')
  RETURNING id INTO v_agent1_id;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Tom Briggs',  'Century 21',     '(216) 555-0182', 'Difficult', 2, 'Consistently low-balls. Slow to respond. Two fallen-through deals.')
  RETURNING id INTO v_agent2_id;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Maria Vega',  'Keller Williams','(216) 555-0143', 'Reliable',  4, 'Professional and communicative. Good at managing buyer expectations.')
  RETURNING id INTO v_agent3_id;

  -- ── Agent tags ───────────────────────────────────────────
  INSERT INTO public.agent_tags (agent_id, tag) VALUES
    (v_agent1_id, 'fast responder'),
    (v_agent1_id, 'fair offers'),
    (v_agent2_id, 'low-balls'),
    (v_agent2_id, 'slow replies'),
    (v_agent3_id, 'great communicator'),
    (v_agent3_id, 'quick close');

  -- ── Clients ──────────────────────────────────────────────
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Robert Chen', '(216) 555-0177', 'rchen@email.com', 280000, 350000, true,  'High visit count, consistently below-market offers. Retainer required.')
  RETURNING id INTO v_client1_id;

  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Amy Solis',   '(216) 555-0134', 'asolis@email.com',480000, 550000, false, 'Offers 15-20% below list. Has declined two counteroffers.')
  RETURNING id INTO v_client2_id;

  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'James Holbrook','(216) 555-0159','jholbrook@email.com',420000,480000, false, 'Reasonable client. Second offer accepted. Smooth process.')
  RETURNING id INTO v_client3_id;

  -- ── Visits ───────────────────────────────────────────────
  INSERT INTO public.visits (user_id, client_id, address, visit_date, outcome, notes) VALUES
    (v_user_id, v_client1_id, '142 Maple St',    '2025-01-10', 'Interested',  'Liked the layout, asked about basement finishing.'),
    (v_user_id, v_client1_id, '88 Birch Ave',    '2025-01-18', 'Passed',      'Too close to highway. Noise concern.'),
    (v_user_id, v_client1_id, '310 Oak Dr',      '2025-02-02', 'Interested',  'Strong interest but offer came in very low.'),
    (v_user_id, v_client1_id, '21 Elm Ct',       '2025-02-14', 'Passed',      'Kitchen too small.'),
    (v_user_id, v_client1_id, '77 Pine Ln',      '2025-02-28', 'Made offer',  'Best fit so far. Offer submitted below ask.'),
    (v_user_id, v_client2_id, '500 Cedar Blvd',  '2025-02-05', 'Interested',  'Loved the open floor plan.'),
    (v_user_id, v_client2_id, '14 Willow Way',   '2025-02-19', 'Made offer',  'Submitted offer, seller countered, client declined.'),
    (v_user_id, v_client2_id, '230 Spruce Rd',   '2025-03-03', 'Interested',  'Second showing requested.'),
    (v_user_id, v_client3_id, '99 Aspen Ct',     '2025-03-01', 'Interested',  'Very positive showing.'),
    (v_user_id, v_client3_id, '45 Chestnut Ave', '2025-03-10', 'Made offer',  'Offer accepted on second attempt.');

  -- ── Deals ────────────────────────────────────────────────
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES
    (gen_random_uuid(), v_user_id, v_agent1_id, v_client3_id, '45 Chestnut Ave', 'Closed',         460000, 470000, 465000, 'Smooth negotiation. Closed in 28 days.')
  RETURNING id INTO v_deal1_id;

  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES
    (gen_random_uuid(), v_user_id, v_agent2_id, v_client1_id, '77 Pine Ln',      'Fallen Through',  295000, 340000, NULL,   'Client offer too low. Agent unwilling to counter reasonably.')
  RETURNING id INTO v_deal2_id;

  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES
    (gen_random_uuid(), v_user_id, v_agent3_id, v_client2_id, '14 Willow Way',   'Active',          510000, 525000, NULL,   'Ongoing negotiation. Client hesitant on price.')
  RETURNING id INTO v_deal3_id;

  -- ── Offers ───────────────────────────────────────────────
  INSERT INTO public.offers (deal_id, offer_date, amount, direction, status, notes) VALUES
    (v_deal1_id, '2025-03-10', 460000, 'sent',     'Accepted',  'First offer accepted after minor counter.'),
    (v_deal1_id, '2025-03-08', 470000, 'received', 'Countered', 'Seller countered at asking.'),
    (v_deal2_id, '2025-02-28', 295000, 'sent',     'Rejected',  'Well below market. Seller rejected immediately.'),
    (v_deal2_id, '2025-03-05', 340000, 'received', 'Withdrawn', 'Seller withdrew after no reasonable counter.'),
    (v_deal3_id, '2025-02-19', 510000, 'sent',     'Countered', 'Initial offer submitted.'),
    (v_deal3_id, '2025-02-21', 525000, 'received', 'Pending',   'Seller holding firm at asking price.');

  -- ── Auto-flag clients based on visit/offer data ──────────
  PERFORM public.evaluate_client_flag(v_client1_id);
  PERFORM public.evaluate_client_flag(v_client2_id);
  PERFORM public.evaluate_client_flag(v_client3_id);

  RAISE NOTICE 'Dummy data inserted successfully for user %', v_user_id;

END $$;


-- ------------------------------------------------------------
-- SCRIPT 3: CLEAR ALL DATA FOR A SPECIFIC USER
-- Deletes all agents, clients, visits, deals, and offers
-- for a given user email. Cascading deletes handle child
-- records automatically (tags, offers) via foreign keys.
-- Does NOT delete the user's auth account or profile row.
-- Replace the email with the account you want to clear.
-- WARNING: this is irreversible. Back up data first if needed.
-- ------------------------------------------------------------

DO $$
DECLARE
  v_user_id UUID;
BEGIN

  SELECT id INTO v_user_id FROM auth.users
  WHERE email = 'your@email.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check the email address.';
  END IF;

  -- Offers cascade-delete when deals are deleted
  -- Agent tags cascade-delete when agents are deleted
  DELETE FROM public.visits WHERE user_id = v_user_id;
  DELETE FROM public.deals  WHERE user_id = v_user_id;
  DELETE FROM public.agents WHERE user_id = v_user_id;
  DELETE FROM public.clients WHERE user_id = v_user_id;

  RAISE NOTICE 'All data cleared for user %', v_user_id;

END $$;