-- ============================================================
-- RealTrack — Pro Demo Account Seed Data
-- Account: Mike Hargrove (demo account, paid tier)
-- Theme: 90s Cleveland Indians players as clients
--        West side Cleveland suburb addresses and pricing
--        Two years of realistic activity data
--
-- BEFORE RUNNING:
-- 1. Create the demo account via the app signup screen
--    Email: demo@realtrack.app  Password: (your choice)
-- 2. Run Script 1 below to set that account to paid tier
-- 3. Run Script 2 to insert all demo data
-- ============================================================


-- ------------------------------------------------------------
-- SCRIPT 1: Set demo account to paid tier + display name
-- Run this first, replace email if different
-- ------------------------------------------------------------
UPDATE public.profiles
SET tier = 'paid', full_name = 'Mike Hargrove'
WHERE email = 'demo@realtrack.app';

-- Verify:
SELECT id, email, full_name, tier FROM public.profiles
WHERE email = 'demo@realtrack.app';


-- ------------------------------------------------------------
-- SCRIPT 2: Insert all demo data
-- Uses a DO block so we can reference IDs across inserts
-- Replace email on line 1 if different from demo@realtrack.app
-- ------------------------------------------------------------

DO $$
DECLARE
  v_uid        UUID;

  -- agent IDs
  v_a1 UUID; v_a2 UUID; v_a3 UUID; v_a4 UUID; v_a5 UUID;

  -- client IDs
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID;
  v_c6 UUID; v_c7 UUID; v_c8 UUID;

  -- deal IDs
  v_d1 UUID; v_d2 UUID; v_d3 UUID; v_d4 UUID; v_d5 UUID;
  v_d6 UUID; v_d7 UUID; v_d8 UUID; v_d9 UUID; v_d10 UUID;

BEGIN

  SELECT id INTO v_uid FROM auth.users
  WHERE email = 'demo@realtrack.app';

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Demo user not found. Create the account first via the app signup screen.';
  END IF;


  -- ----------------------------------------------------------
  -- AGENTS
  -- Five west side brokerages, mix of categories
  -- ----------------------------------------------------------

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Roberto Alomar', 'Howard Hanna Rocky River',
    '(216) 555-0181', 'Preferred', 5,
    'Extremely reliable. Responds within the hour. Specializes in Rocky River and Bay Village lakefront properties. Always brings pre-qualified buyers.')
  RETURNING id INTO v_a1;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Eddie Murray', 'RE/MAX Westlake',
    '(440) 555-0147', 'Reliable', 4,
    'Solid agent. Good communicator and fair on counteroffers. Occasionally slow to return calls on Fridays. Strong in Westlake and North Olmsted.')
  RETURNING id INTO v_a2;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Carlos Baerga', 'Keller Williams Lakewood',
    '(216) 555-0122', 'Neutral', 3,
    'Decent agent but negotiation style is unpredictable. Some deals go smoothly, others drag. Best on straightforward transactions under $400K.')
  RETURNING id INTO v_a3;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Orel Hershiser', 'Coldwell Banker Bay Village',
    '(440) 555-0193', 'Difficult', 2,
    'Consistently submits lowball offers on behalf of buyers. Has let two deals fall through at the last minute. Proceed with caution and build in extra timeline.')
  RETURNING id INTO v_a4;

  INSERT INTO public.agents (id, user_id, full_name, brokerage, phone, category, rating, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Matt Williams', 'Berkshire Hathaway Avon Lake',
    '(440) 555-0156', 'Preferred', 5,
    'Best agent I work with in Avon Lake and Westlake. Meticulous with paperwork, manages client expectations well, and deals close on schedule.')
  RETURNING id INTO v_a5;

  -- Agent tags
  INSERT INTO public.agent_tags (agent_id, tag) VALUES
    (v_a1, 'fast responder'), (v_a1, 'lakefront specialist'), (v_a1, 'pre-qualified buyers'),
    (v_a2, 'fair offers'), (v_a2, 'good communicator'), (v_a2, 'slow Fridays'),
    (v_a3, 'unpredictable'), (v_a3, 'best under 400K'),
    (v_a4, 'low-balls'), (v_a4, 'last minute fallout'), (v_a4, 'slow follow-up'),
    (v_a5, 'quick close'), (v_a5, 'great paperwork'), (v_a5, 'on schedule');


  -- ----------------------------------------------------------
  -- CLIENTS
  -- 90s Cleveland Indians players as buyers/sellers
  -- Spread across west side suburbs at realistic price points
  -- ----------------------------------------------------------

  -- Client 1: Albert Belle — high value, demanding, flagged
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Albert Belle', '(216) 555-0134', 'abelle@email.com',
    500000, 650000, true,
    'High-maintenance client. Very specific requirements — wants Bay Village or Rocky River lakefront only. Has toured 8 properties over 14 months. Both offers came in significantly below ask. Retainer required before any further showings.')
  RETURNING id INTO v_c1;

  -- Client 2: Manny Ramirez — solid client, active deal
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Manny Ramirez', '(216) 555-0199', 'mramirez@email.com',
    380000, 480000, false,
    'Reliable buyer. Flexible on location within the west side. Prefers newer construction or fully updated homes. Second offer on Westlake property currently under contract.')
  RETURNING id INTO v_c2;

  -- Client 3: Kenny Lofton — closed deal, good client
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Kenny Lofton', '(216) 555-0111', 'klofton@email.com',
    300000, 380000, false,
    'Excellent client. Clear on what he wants, reasonable with offers. Closed on Lakewood colonial in March 2024. May be looking to upsize in 12-18 months.')
  RETURNING id INTO v_c3;

  -- Client 4: Jim Thome — flagged, high visit count
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Jim Thome', '(440) 555-0178', 'jthome@email.com',
    420000, 520000, false,
    'Genuine buyer but extremely indecisive. Has toured 7 properties over 8 months with only one offer submitted. Offer was fair but seller rejected. Needs more direction on decision making.')
  RETURNING id INTO v_c4;

  -- Client 5: Sandy Alomar Jr. — active, under contract
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Sandy Alomar Jr.', '(440) 555-0165', 'salomar@email.com',
    440000, 560000, false,
    'Smooth process so far. Very decisive, liked the second property we toured. Currently under contract on Bay Village colonial. Closing scheduled in 3 weeks.')
  RETURNING id INTO v_c5;

  -- Client 6: Omar Vizquel — new client, one visit
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Omar Vizquel', '(216) 555-0188', 'ovizquel@email.com',
    350000, 450000, false,
    'New client referred by Kenny Lofton. Looking for a move-in ready home in Rocky River or Westlake. First showing went well.')
  RETURNING id INTO v_c6;

  -- Client 7: Jose Mesa — flagged, unrealistic offers
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Jose Mesa', '(216) 555-0177', 'jmesa@email.com',
    280000, 360000, false,
    'Has submitted three offers, all 18-22% below list price. Sellers are not engaging. Has good budget range for Lakewood but needs realistic expectation setting before next offer.')
  RETURNING id INTO v_c7;

  -- Client 8: Charles Nagy — closed, seller side
  INSERT INTO public.clients (id, user_id, full_name, phone, email, budget_min, budget_max, retainer_required, notes)
  VALUES (gen_random_uuid(), v_uid,
    'Charles Nagy', '(440) 555-0144', 'cnagy@email.com',
    0, 0, false,
    'Seller client. Listed and sold North Olmsted ranch in January 2024. Clean transaction, well-priced from the start. Likely to refer family members.')
  RETURNING id INTO v_c8;


  -- ----------------------------------------------------------
  -- VISITS — two years of showing history
  -- Suburbs: Lakewood, Rocky River, Westlake, Bay Village,
  --          Avon Lake, North Olmsted, Fairview Park
  -- ----------------------------------------------------------

  INSERT INTO public.visits (user_id, client_id, address, visit_date, outcome, notes) VALUES
    -- Albert Belle (8 visits, flagged)
    (v_uid, v_c1, '412 Lake Rd, Bay Village OH 44140',         '2023-03-10', 'Interested',  'Strong interest but called the kitchen dated.'),
    (v_uid, v_c1, '88 Cahoon Rd, Bay Village OH 44140',        '2023-04-02', 'Passed',      'Too close to the main road. Noise concern.'),
    (v_uid, v_c1, '1204 Wooster Rd, Rocky River OH 44116',     '2023-05-18', 'Interested',  'Loved the lot. Wants lakefront only going forward.'),
    (v_uid, v_c1, '333 Riverside Dr, Rocky River OH 44116',    '2023-07-22', 'Made offer',  'Submitted at $520K, asking was $610K. Rejected.'),
    (v_uid, v_c1, '77 Lake Ave, Bay Village OH 44140',         '2023-09-14', 'Passed',      'Too small at 2,100 sq ft.'),
    (v_uid, v_c1, '501 Porter Creek Dr, Bay Village OH 44140', '2023-11-05', 'Interested',  'Best fit so far. Stunning lake views.'),
    (v_uid, v_c1, '200 Columbia Rd, Bay Village OH 44140',     '2024-01-20', 'Made offer',  'Offered $575K on $640K ask. Seller walked.'),
    (v_uid, v_c1, '19 Bassett Rd, Bay Village OH 44140',       '2024-04-08', 'Interested',  'Very positive. Retainer fee applied before this showing.'),

    -- Manny Ramirez (3 visits)
    (v_uid, v_c2, '3344 Clague Rd, North Olmsted OH 44070',    '2023-08-11', 'Passed',      'Layout did not work for his family.'),
    (v_uid, v_c2, '28700 Tremaine Dr, Westlake OH 44145',      '2023-09-25', 'Interested',  'Great neighborhood, newer build, strong interest.'),
    (v_uid, v_c2, '2190 Crocker Rd, Westlake OH 44145',        '2023-11-15', 'Made offer',  'First offer at $420K rejected. Second at $445K accepted.'),

    -- Kenny Lofton (2 visits, closed)
    (v_uid, v_c3, '1540 Westwood Ave, Lakewood OH 44107',      '2023-10-03', 'Passed',      'Liked the neighborhood but too close to busy intersection.'),
    (v_uid, v_c3, '12210 Lake Ave, Lakewood OH 44107',         '2023-11-29', 'Made offer',  'Perfect fit. Colonial with great yard. Offer submitted same day.'),

    -- Jim Thome (7 visits, flagged)
    (v_uid, v_c4, '22950 Mastick Rd, Fairview Park OH 44126',  '2023-06-05', 'Undecided',   'Liked the space but wanted to keep looking.'),
    (v_uid, v_c4, '4455 Dover Center Rd, Westlake OH 44145',   '2023-07-19', 'Passed',      'Backyard too small.'),
    (v_uid, v_c4, '1700 Hilliard Blvd, Rocky River OH 44116',  '2023-08-30', 'Interested',  'Strong showing. Did not move to offer.'),
    (v_uid, v_c4, '30555 Bainbridge Rd, Westlake OH 44145',    '2023-10-12', 'Made offer',  'Offered $455K on $475K ask. Rejected by seller.'),
    (v_uid, v_c4, '900 Normandy Rd, Rocky River OH 44116',     '2024-01-08', 'Undecided',   'Good bones but needs full kitchen update.'),
    (v_uid, v_c4, '5600 Woodview Dr, Westlake OH 44145',       '2024-02-22', 'Interested',  'Best showing yet. Still has not committed.'),
    (v_uid, v_c4, '1225 Lakeview Ave, Rocky River OH 44116',   '2024-04-15', 'Undecided',   'Third showing with no offer. Recommending retainer next visit.'),

    -- Sandy Alomar Jr. (2 visits, under contract)
    (v_uid, v_c5, '610 Dover Rd, Westlake OH 44145',           '2024-02-10', 'Passed',      'Nice home but too far from the lake for his preference.'),
    (v_uid, v_c5, '488 Wolf Rd, Bay Village OH 44140',         '2024-03-01', 'Made offer',  'Immediate strong interest. Offer submitted next morning.'),

    -- Omar Vizquel (1 visit, new)
    (v_uid, v_c6, '2255 Wooster Pike, Rocky River OH 44116',   '2024-04-20', 'Interested',  'Great first showing. Wants to see two more in the area.'),

    -- Jose Mesa (5 visits, flagged)
    (v_uid, v_c7, '15400 Madison Ave, Lakewood OH 44107',      '2023-09-08', 'Made offer',  'Offered $265K on $325K ask. Seller did not respond.'),
    (v_uid, v_c7, '11800 Edgewater Dr, Lakewood OH 44107',     '2023-10-20', 'Made offer',  'Offered $270K on $340K ask. Flat rejection.'),
    (v_uid, v_c7, '14322 Athens Ave, Lakewood OH 44107',       '2023-12-04', 'Interested',  'Liked this one. Held off on offer.'),
    (v_uid, v_c7, '1350 Westwood Ave, Lakewood OH 44107',      '2024-02-14', 'Made offer',  'Offered $290K on $355K ask. Third lowball. Seller annoyed.'),
    (v_uid, v_c7, '13900 Lake Ave, Lakewood OH 44107',         '2024-03-28', 'Interested',  'Showed genuine interest. Needs expectation reset before offering.'),

    -- Charles Nagy (1 visit, seller side)
    (v_uid, v_c8, '26800 Lorain Rd, North Olmsted OH 44070',   '2023-11-10', 'Made offer',  'Listing walkthrough with seller. Priced at $299K, very fair for the market.');


  -- ----------------------------------------------------------
  -- DEALS — active, closed, under contract, fallen through
  -- ----------------------------------------------------------

  -- Deal 1: Albert Belle — fallen through (lowball)
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a4, v_c1,
    '333 Riverside Dr, Rocky River OH 44116',
    'Fallen Through', 520000, 610000, NULL,
    'Seller asked $610K, Belle offered $520K. Agent Hershiser advised holding firm. Deal fell apart after two weeks.')
  RETURNING id INTO v_d1;

  -- Deal 2: Albert Belle — active (most recent)
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a1, v_c1,
    '19 Bassett Rd, Bay Village OH 44140',
    'Active', 605000, 635000, NULL,
    'Roberto Alomar representing seller. Best shot at a deal for Belle. Retainer applied. Negotiation ongoing.')
  RETURNING id INTO v_d2;

  -- Deal 3: Manny Ramirez — closed
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a2, v_c2,
    '2190 Crocker Rd, Westlake OH 44145',
    'Closed', 445000, 455000, 450000,
    'Smooth negotiation. Eddie Murray on seller side was fair. Closed in 31 days with no inspection issues.')
  RETURNING id INTO v_d3;

  -- Deal 4: Kenny Lofton — closed
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a3, v_c3,
    '12210 Lake Ave, Lakewood OH 44107',
    'Closed', 345000, 355000, 349000,
    'Baerga on seller side was slow but deal got done. Lofton very happy with the outcome.')
  RETURNING id INTO v_d4;

  -- Deal 5: Jim Thome — fallen through
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a2, v_c4,
    '30555 Bainbridge Rd, Westlake OH 44145',
    'Fallen Through', 455000, 475000, NULL,
    'Thome hesitated too long after offer submission. Seller accepted another offer while waiting for a counter decision.')
  RETURNING id INTO v_d5;

  -- Deal 6: Sandy Alomar Jr. — under contract
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a1, v_c5,
    '488 Wolf Rd, Bay Village OH 44140',
    'Under Contract', 530000, 545000, NULL,
    'Roberto Alomar on seller side again. Alomar moved fast. Inspection complete, closing in 3 weeks.')
  RETURNING id INTO v_d6;

  -- Deal 7: Jose Mesa — fallen through (lowball x3)
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a4, v_c7,
    '1350 Westwood Ave, Lakewood OH 44107',
    'Fallen Through', 290000, 355000, NULL,
    'Third lowball from Mesa. Hershiser advised the offer was market-appropriate which it was not. Seller stopped responding.')
  RETURNING id INTO v_d7;

  -- Deal 8: Charles Nagy (seller) — closed
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a5, v_c8,
    '26800 Lorain Rd, North Olmsted OH 44070',
    'Closed', 299000, 305000, 301000,
    'Nagy listed at fair market value. Matt Williams (agent) brought a strong buyer within 12 days. Clean close.')
  RETURNING id INTO v_d8;

  -- Deal 9: Albert Belle — first fallen through
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a4, v_c1,
    '200 Columbia Rd, Bay Village OH 44140',
    'Fallen Through', 575000, 640000, NULL,
    'Belle offered $575K on a $640K ask. Hershiser advised this was competitive. It was not. Seller walked immediately.')
  RETURNING id INTO v_d9;

  -- Deal 10: Manny Ramirez — first offer (rejected, led to deal 3)
  INSERT INTO public.deals (id, user_id, agent_id, client_id, address, stage, our_offer, their_offer, final_price, notes)
  VALUES (gen_random_uuid(), v_uid, v_a2, v_c2,
    '2190 Crocker Rd, Westlake OH 44145',
    'Closed', 420000, 455000, 450000,
    'First offer at $420K rejected. Came back at $445K. Seller countered at $455K. Met in the middle at $450K.')
  RETURNING id INTO v_d10;


  -- ----------------------------------------------------------
  -- OFFERS — full negotiation history per deal
  -- ----------------------------------------------------------

  INSERT INTO public.offers (deal_id, offer_date, amount, direction, status, notes) VALUES
    -- Deal 1: Belle / Rocky River fallen through
    (v_d1, '2023-07-22', 520000, 'sent',     'Rejected',  'Significantly below ask. Seller did not counter.'),
    (v_d1, '2023-07-25', 610000, 'received', 'Withdrawn', 'Seller held firm at ask. Belle refused to move up.'),

    -- Deal 2: Belle / Bay Village active
    (v_d2, '2024-04-10', 605000, 'sent',     'Countered', 'Retainer applied. First serious offer from Belle.'),
    (v_d2, '2024-04-12', 635000, 'received', 'Pending',   'Seller countered at ask. Negotiation ongoing.'),

    -- Deal 3: Ramirez / Westlake closed
    (v_d3, '2023-11-16', 445000, 'sent',     'Accepted',  'Second offer. Met seller partway. Accepted within 24 hours.'),
    (v_d3, '2023-11-14', 455000, 'received', 'Countered', 'Seller countered first offer at $455K.'),

    -- Deal 4: Lofton / Lakewood closed
    (v_d4, '2023-11-29', 345000, 'sent',     'Countered', 'Initial offer, came in below ask.'),
    (v_d4, '2023-12-01', 355000, 'received', 'Countered', 'Seller countered at ask.'),
    (v_d4, '2023-12-03', 349000, 'sent',     'Accepted',  'Split the difference. Accepted same day.'),

    -- Deal 5: Thome / Westlake fallen through
    (v_d5, '2023-10-12', 455000, 'sent',     'Rejected',  'Seller found another buyer while Thome delayed his counter decision.'),

    -- Deal 6: Alomar / Bay Village under contract
    (v_d6, '2024-03-02', 530000, 'sent',     'Countered', 'Strong opening offer. Seller countered quickly.'),
    (v_d6, '2024-03-04', 545000, 'received', 'Accepted',  'Alomar accepted the counter without hesitation. Under contract.'),

    -- Deal 7: Mesa / Lakewood fallen through
    (v_d7, '2024-02-14', 290000, 'sent',     'Rejected',  'Third lowball in five months. Seller stopped responding after this.'),

    -- Deal 8: Nagy seller / North Olmsted closed
    (v_d8, '2023-12-01', 299000, 'received', 'Countered', 'Buyer came in at ask. Seller held.'),
    (v_d8, '2023-12-02', 305000, 'received', 'Accepted',  'Buyer went above ask. Nagy accepted immediately.'),

    -- Deal 9: Belle / Columbia Rd fallen through
    (v_d9, '2024-01-20', 575000, 'sent',     'Rejected',  'Seller asking $640K. $575K offer not even acknowledged.'),

    -- Deal 10: Ramirez first offer
    (v_d10,'2023-11-13', 420000, 'sent',     'Rejected',  'First offer. Seller came back at $455K.'),
    (v_d10,'2023-11-14', 455000, 'received', 'Countered', 'Seller countered at full ask.'),
    (v_d10,'2023-11-16', 445000, 'sent',     'Accepted',  'Ramirez came up to $445K. Seller accepted.');


  -- ----------------------------------------------------------
  -- AUTO-FLAG all clients based on visit/offer history
  -- ----------------------------------------------------------
  PERFORM public.evaluate_client_flag(v_c1);
  PERFORM public.evaluate_client_flag(v_c2);
  PERFORM public.evaluate_client_flag(v_c3);
  PERFORM public.evaluate_client_flag(v_c4);
  PERFORM public.evaluate_client_flag(v_c5);
  PERFORM public.evaluate_client_flag(v_c6);
  PERFORM public.evaluate_client_flag(v_c7);
  PERFORM public.evaluate_client_flag(v_c8);

  RAISE NOTICE 'Demo data inserted successfully for Mike Hargrove (%)' , v_uid;

END $$;


-- ------------------------------------------------------------
-- VERIFY — quick health check after running
-- ------------------------------------------------------------
SELECT 'agents'  AS tbl, COUNT(*) FROM public.agents  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@realtrack.app')
UNION ALL
SELECT 'clients', COUNT(*) FROM public.clients WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@realtrack.app')
UNION ALL
SELECT 'visits',  COUNT(*) FROM public.visits  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@realtrack.app')
UNION ALL
SELECT 'deals',   COUNT(*) FROM public.deals   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@realtrack.app')
UNION ALL
SELECT 'offers',  COUNT(*) FROM public.offers  WHERE deal_id IN (SELECT id FROM public.deals WHERE user_id = (SELECT id FROM auth.users WHERE email = 'demo@realtrack.app'));