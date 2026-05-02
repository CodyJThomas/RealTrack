-- ============================================================
-- RealTrack Demo Data Seed
-- Run against demo@realtrack.app (e59e8973-dbd0-4cac-b911-cb5be6377478)
-- Cleveland West Side market — celebrity couple narratives
-- ============================================================

DO $$
DECLARE
  uid UUID := 'e59e8973-dbd0-4cac-b911-cb5be6377478';

  -- Client IDs
  c_travis  UUID := gen_random_uuid();
  c_lebron  UUID := gen_random_uuid();
  c_steph   UUID := gen_random_uuid();
  c_baker   UUID := gen_random_uuid();
  c_jj      UUID := gen_random_uuid();
  c_barack  UUID := gen_random_uuid();
  c_jayz    UUID := gen_random_uuid();
  c_denzel  UUID := gen_random_uuid();
  c_george  UUID := gen_random_uuid();
  c_tom     UUID := gen_random_uuid();

  -- Showing IDs — Travis & Taylor
  s_t1 UUID := gen_random_uuid();
  s_t2 UUID := gen_random_uuid();
  s_t3 UUID := gen_random_uuid();
  s_t4 UUID := gen_random_uuid(); -- upcoming May 3

  -- Showing IDs — Jay-Z & Beyoncé
  s_j1 UUID := gen_random_uuid();
  s_j2 UUID := gen_random_uuid();

  -- Showing IDs — LeBron & Savannah
  s_l1 UUID := gen_random_uuid();
  s_l2 UUID := gen_random_uuid();

  -- Showing IDs — Steph & Ayesha
  s_s1 UUID := gen_random_uuid();
  s_s2 UUID := gen_random_uuid();
  s_s3 UUID := gen_random_uuid();
  s_s4 UUID := gen_random_uuid();

  -- Showing IDs — Denzel & Pauletta
  s_d1 UUID := gen_random_uuid();
  s_d2 UUID := gen_random_uuid();
  s_d3 UUID := gen_random_uuid();

  -- Showing IDs — Tom & Rita
  s_to1 UUID := gen_random_uuid();
  s_to2 UUID := gen_random_uuid();
  s_to3 UUID := gen_random_uuid();

  -- Showing IDs — Baker & Emily (7 showings, stalled)
  s_b1 UUID := gen_random_uuid();
  s_b2 UUID := gen_random_uuid();
  s_b3 UUID := gen_random_uuid();
  s_b4 UUID := gen_random_uuid();
  s_b5 UUID := gen_random_uuid();
  s_b6 UUID := gen_random_uuid();
  s_b7 UUID := gen_random_uuid();

  -- Showing IDs — George & Amal (5 showings, stalled)
  s_g1 UUID := gen_random_uuid();
  s_g2 UUID := gen_random_uuid();
  s_g3 UUID := gen_random_uuid();
  s_g4 UUID := gen_random_uuid();
  s_g5 UUID := gen_random_uuid();

  -- Showing IDs — JJ & Kealia (upcoming only)
  s_jj1 UUID := gen_random_uuid();

  -- Deal IDs
  d_lebron UUID := gen_random_uuid();
  d_steph  UUID := gen_random_uuid();

BEGIN

  -- ── Clear existing demo data ──────────────────────────────────
  DELETE FROM public.clients WHERE user_id = uid;
  DELETE FROM public.deals   WHERE user_id = uid;

  -- ── Clients ──────────────────────────────────────────────────
  INSERT INTO public.clients
    (id, user_id, full_name, budget_min, budget_max, retainer_required, flag_reason, pre_approved, source)
  VALUES
    (c_travis, uid, 'Travis & Taylor Kelce',        425000, 550000, false, null,                      true,  'referral'),
    (c_lebron, uid, 'LeBron & Savannah James',       550000, 650000, false, null,                      true,  'referral'),
    (c_steph,  uid, 'Steph & Ayesha Curry',          450000, 540000, false, null,                      true,  'open house'),
    (c_baker,  uid, 'Baker & Emily Mayfield',         280000, 325000, true,  'High visits, low offers', false, 'web'),
    (c_jj,     uid, 'JJ & Kealia Watt',               425000, 500000, false, null,                      true,  'referral'),
    (c_barack, uid, 'Barack & Michelle Obama',        650000, 750000, false, null,                      true,  'referral'),
    (c_jayz,   uid, 'Jay-Z & Beyoncé Carter',         650000, 750000, false, null,                      true,  'referral'),
    (c_denzel, uid, 'Denzel & Pauletta Washington',   500000, 650000, false, null,                      true,  'referral'),
    (c_george, uid, 'George & Amal Clooney',          600000, 725000, false, null,                      true,  'referral'),
    (c_tom,    uid, 'Tom & Rita Hanks',               450000, 575000, false, null,                      true,  'open house');

  -- ── Preferences ──────────────────────────────────────────────
  INSERT INTO public.client_preferences
    (client_id, bedrooms_min, bathrooms_min, price_min, price_max,
     target_neighborhoods, property_types, garage_preference,
     must_haves, dealbreakers, timeline, sqft_min, max_hoa,
     school_districts, style_notes)
  VALUES
    (c_travis, 3, 2,   425000, 550000,
     ARRAY['Rocky River','Westlake'], ARRAY['Single family','Ranch','Two-story'], 'attached',
     ARRAY['Updated kitchen','Open floor plan'], ARRAY['No garage','Busy street'],
     'asap', 1800, null, null, null),

    (c_lebron, 4, 3,   550000, 650000,
     ARRAY['Bay Village'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Private yard','Lake views'], ARRAY['Small lot'],
     'asap', 2800, null, ARRAY['Bay Village City'], null),

    (c_steph,  4, 2,   450000, 540000,
     ARRAY['Westlake','Rocky River'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Home office','Good schools'], ARRAY['HOA over $200'],
     '3-6 months', 2200, 200, ARRAY['Westlake City'], null),

    (c_baker,  3, 2,   280000, 325000,
     ARRAY['Lakewood'], ARRAY['Single family'], null,
     ARRAY['Garage','Yard'], ARRAY['No parking'],
     '1-3 months', null, null, null, null),

    (c_jj,     4, 2,   425000, 500000,
     ARRAY['Avon','Avon Lake'], ARRAY['Single family','Ranch','Two-story'], 'attached',
     ARRAY['Large yard','Home gym space'], ARRAY['HOA'],
     '3-6 months', 2200, null, null, null),

    (c_barack, 5, 3,   650000, 750000,
     ARRAY['Bay Village','Rocky River'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Private yard','Home office','Good schools'], ARRAY['Busy street','Small lot'],
     '3-6 months', 3200, null, ARRAY['Bay Village City','Rocky River City'], null),

    (c_jayz,   4, 3,   650000, 750000,
     ARRAY['Bay Village','Westlake'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Private yard','Home theater','Natural light'], ARRAY['Small lot','No garage'],
     'asap', 3000, null, null, null),

    (c_denzel, 4, 2,   500000, 650000,
     ARRAY['Rocky River','Westlake'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Home office','Formal dining'], ARRAY['Open floor plan only'],
     '6-12 months', 2500, null, null, null),

    (c_george, 4, 3,   600000, 725000,
     ARRAY['Bay Village','Westlake'], ARRAY['Single family','Two-story'], 'attached',
     ARRAY['Architectural character','Updated kitchen','Private yard'],
     ARRAY['Cookie cutter design','Busy street'],
     'flexible', null, null, null,
     'Prefer character homes with unique architectural details. Not interested in standard subdivision builds.'),

    (c_tom,    3, 2,   450000, 575000,
     ARRAY['Lakewood','Rocky River'], ARRAY['Single family','Two-story','Ranch'], 'attached',
     ARRAY['Updated kitchen','Natural light'], ARRAY['No garage'],
     '3-6 months', null, null, null, null);

  -- ── Showings ─────────────────────────────────────────────────
  INSERT INTO public.showings
    (id, client_id, user_id, address, shown_at, price, bedrooms, bathrooms,
     garage, basement, property_type, sqft, year_built, notes)
  VALUES
    -- Travis & Taylor Kelce — HOT (last Apr 28, upcoming May 3)
    (s_t1, c_travis, uid, '19847 Lake Rd, Rocky River OH 44116',     '2026-04-21', 489000, 3, 2,   'attached', false, 'Ranch',     1920, 1998, null),
    (s_t2, c_travis, uid, '21034 Westwood Dr, Rocky River OH 44116', '2026-04-25', 512000, 3, 2.5, 'attached', false, 'Two-story', 2180, 2004, null),
    (s_t3, c_travis, uid, '28741 Detroit Rd, Westlake OH 44145',     '2026-04-28', 535000, 4, 2.5, 'attached', true,  'Two-story', 2650, 2008, null),
    (s_t4, c_travis, uid, '30125 Clemens Rd, Westlake OH 44145',     '2026-05-03', 549000, 4, 2.5, 'attached', true,  'Two-story', 2700, 2011, null),

    -- Jay-Z & Beyoncé Carter — HOT (last Apr 28)
    (s_j1, c_jayz, uid, '550 Cahoon Rd, Bay Village OH 44140',   '2026-04-24', 695000, 4, 3, 'attached', true, 'Two-story', 3100, 2015, null),
    (s_j2, c_jayz, uid, '27184 Wolf Rd, Bay Village OH 44140',   '2026-04-28', 725000, 5, 3, 'attached', true, 'Two-story', 3480, 2018, null),

    -- LeBron & Savannah James — WARM, closed (last Mar 27)
    (s_l1, c_lebron, uid, '550 Cahoon Rd, Bay Village OH 44140', '2026-03-12', 575000, 4, 3, 'attached', true, 'Two-story', 2900, 2012, null),
    (s_l2, c_lebron, uid, '27850 Wolf Rd, Bay Village OH 44140', '2026-03-27', 589000, 4, 3, 'attached', true, 'Two-story', 3050, 2014, 'Great natural light throughout. Client loved the layout.'),

    -- Steph & Ayesha Curry — WARM, under contract (last Apr 6)
    (s_s1, c_steph, uid, '29341 Center Ridge Rd, Westlake OH 44145', '2026-03-15', 462000, 3, 2,   'attached', false, 'Ranch',     1980, 2001, null),
    (s_s2, c_steph, uid, '27893 Center Ridge Rd, Westlake OH 44145', '2026-03-28', 498000, 4, 2.5, 'attached', false, 'Two-story', 2380, 2006, null),
    (s_s3, c_steph, uid, '30125 Clemens Rd, Westlake OH 44145',      '2026-04-01', 515000, 4, 2,   'attached', true,  'Two-story', 2520, 2009, null),
    (s_s4, c_steph, uid, '28741 Detroit Rd, Westlake OH 44145',      '2026-04-06', 498000, 4, 2.5, 'attached', true,  'Two-story', 2650, 2008, null),

    -- Denzel & Pauletta Washington — WARM (last Apr 9)
    (s_d1, c_denzel, uid, '19847 Lake Rd, Rocky River OH 44116',       '2026-03-20', 525000, 4, 2.5, 'attached', false, 'Two-story', 2620, 2005, null),
    (s_d2, c_denzel, uid, '21034 Westwood Dr, Rocky River OH 44116',   '2026-04-02', 548000, 4, 3,   'attached', true,  'Two-story', 2840, 2007, null),
    (s_d3, c_denzel, uid, '18923 Center Ridge Rd, Rocky River OH 44116','2026-04-09', 532000, 4, 2.5, 'attached', false, 'Two-story', 2700, 2003, null),

    -- Tom & Rita Hanks — WARM (last Apr 13)
    (s_to1, c_tom, uid, '1847 Belle Ave, Lakewood OH 44107',    '2026-04-03', 459000, 3, 2, 'attached', false, 'Two-story', 1980, 1995, null),
    (s_to2, c_tom, uid, '14823 Detroit Ave, Lakewood OH 44107', '2026-04-09', 489000, 3, 2, 'none',     false, 'Two-story', 1860, 1988, null),
    (s_to3, c_tom, uid, '2134 Westwood Ave, Lakewood OH 44107', '2026-04-13', 472000, 3, 2, 'detached', false, 'Two-story', 2010, 1992, null),

    -- Baker & Emily Mayfield — STALLED, flagged (last Jan 21)
    (s_b1, c_baker, uid, '11234 Madison Ave, Lakewood OH 44107', '2025-10-15', 339000, 3, 1.5, 'none',     false, 'Two-story', 1480, 1962, null),
    (s_b2, c_baker, uid, '1847 Belle Ave, Lakewood OH 44107',    '2025-11-08', 319000, 3, 2,   'detached', false, 'Ranch',     1620, 1978, null),
    (s_b3, c_baker, uid, '2134 Westwood Ave, Lakewood OH 44107', '2025-11-22', 348000, 3, 2,   'detached', false, 'Two-story', 1790, 1985, null),
    (s_b4, c_baker, uid, '14823 Detroit Ave, Lakewood OH 44107', '2025-12-12', 359000, 3, 2,   'none',     false, 'Two-story', 1720, 1975, null),
    (s_b5, c_baker, uid, '11234 Madison Ave, Lakewood OH 44107', '2026-01-06', 345000, 3, 1.5, 'none',     false, 'Ranch',     1480, 1962, null),
    (s_b6, c_baker, uid, '1234 Clifton Blvd, Lakewood OH 44107', '2026-01-14', 372000, 3, 2,   'detached', false, 'Two-story', 1850, 1990, 'Over stated budget — client requested showing anyway.'),
    (s_b7, c_baker, uid, '2847 W 117th St, Lakewood OH 44107',   '2026-01-21', 379000, 3, 2,   'none',     false, 'Two-story', 1760, 1982, 'Over stated budget again. Retainer conversation needed.'),

    -- George & Amal Clooney — STALLED (last Jan 25)
    (s_g1, c_george, uid, '550 Cahoon Rd, Bay Village OH 44140',       '2025-11-15', 649000, 4, 3,   'attached', true,  'Two-story', 3050, 2010, null),
    (s_g2, c_george, uid, '27184 Wolf Rd, Bay Village OH 44140',       '2025-12-08', 689000, 5, 3,   'attached', true,  'Two-story', 3480, 2014, null),
    (s_g3, c_george, uid, '28904 Lake Rd, Bay Village OH 44140',       '2025-12-29', 715000, 5, 3.5, 'attached', true,  'Two-story', 3620, 2016, null),
    (s_g4, c_george, uid, '19234 Hilliard Blvd, Rocky River OH 44116', '2026-01-15', 625000, 4, 3,   'attached', false, 'Two-story', 2900, 2008, null),
    (s_g5, c_george, uid, '30421 Lake Rd, Westlake OH 44145',          '2026-01-25', 672000, 4, 3,   'attached', true,  'Two-story', 3100, 2012, null),

    -- JJ & Kealia Watt — NEW (upcoming only)
    (s_jj1, c_jj, uid, '35672 Detroit Rd, Avon OH 44011', '2026-05-05', 469000, 4, 2.5, 'attached', true, 'Two-story', 2480, 2015, null);

  -- ── Reactions ────────────────────────────────────────────────
  -- Travis & Taylor — trajectory: yes → maybe → strong_yes (building toward offer)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_t1, c_travis, 'yes',        'Fair',       'Good layout, Nice neighborhood',          null),
    (s_t2, c_travis, 'maybe',      'A bit high', 'Layout concern',                          null),
    (s_t3, c_travis, 'strong_yes', 'Good value', 'Great layout, Love the neighborhood',     null);

  -- Jay-Z & Beyoncé — trajectory: yes → strong_yes (decisive, moving fast)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_j1, c_jayz, 'yes',        'Fair',       'Great natural light, Love the neighborhood', null),
    (s_j2, c_jayz, 'strong_yes', 'Good value', 'Great layout, Perfect size',                 null);

  -- LeBron & Savannah — trajectory: yes → strong_yes → offer (closed)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_l1, c_lebron, 'yes',        'Fair',       'Great natural light',                      null),
    (s_l2, c_lebron, 'strong_yes', 'Good value', 'Great layout, Love the neighborhood',      null);

  -- Steph & Ayesha — mixed: yes → no → maybe → yes (methodical, under contract)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_s1, c_steph, 'yes',   'Fair',       'Good layout, Right size',         null),
    (s_s2, c_steph, 'no',    'Too high',   'Wrong neighborhood',               'Too far from preferred area'),
    (s_s3, c_steph, 'maybe', 'A bit high', 'Worth a second look',              null),
    (s_s4, c_steph, 'yes',   'Fair',       'Good finishes, Good light',        null);

  -- Denzel & Pauletta — measured: maybe → yes → maybe (taking their time)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_d1, c_denzel, 'maybe', 'A bit high', 'Worth a second look, Price is the issue', null),
    (s_d2, c_denzel, 'yes',   'Fair',       'Good layout, Right size',                 null),
    (s_d3, c_denzel, 'maybe', 'Fair',       'Needs some work',                         null);

  -- Tom & Rita — friendly: yes → no → yes (parking was the dealbreaker mid-run)
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_to1, c_tom, 'yes', 'Fair', 'Good layout, Good light',            null),
    (s_to2, c_tom, 'no',  'Fair', 'Parking issues',                     'Street parking only, no garage option'),
    (s_to3, c_tom, 'yes', 'Fair', 'Nice neighborhood, Fair price',      null);

  -- Baker & Emily Mayfield — all no/maybe, budget mismatch, flagged
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_b1, c_baker, 'no',    'Too high', 'Too small, Wrong neighborhood',      'Below expectations for the area'),
    (s_b2, c_baker, 'no',    'Fair',     'Bad layout',                          'Hallway layout does not work'),
    (s_b3, c_baker, 'maybe', 'Fair',     'Good bones, Needs some work',         null),
    (s_b4, c_baker, 'no',    'Too high', 'Wrong neighborhood, Parking issues',  'No street parking options'),
    (s_b5, c_baker, 'maybe', 'Too high', 'Good bones',                          null),
    (s_b6, c_baker, 'no',    'Too high', 'Wrong neighborhood',                  'Not the right part of Lakewood'),
    (s_b7, c_baker, 'no',    'Too high', 'Bad layout, Wrong neighborhood',      'Nothing in budget has the right feel');

  -- George & Amal — architecture snobs: no → maybe → no → no → no
  INSERT INTO public.showing_reactions
    (showing_id, client_id, overall_reaction, price_reaction, reaction_notes, dealbreaker_reason)
  VALUES
    (s_g1, c_george, 'no',    'Fair',    'Not their style',   'Builder grade finishes throughout'),
    (s_g2, c_george, 'maybe', 'Fair',    'Worth a second look', null),
    (s_g3, c_george, 'no',    'Too high','Layout concern',     'Master suite placement does not work'),
    (s_g4, c_george, 'no',    'Fair',    'Not their style',   'No architectural character'),
    (s_g5, c_george, 'no',    'Fair',    'Not their style',   'Subdivision feel, not what they want');

  -- ── Deals ────────────────────────────────────────────────────
  INSERT INTO public.deals
    (id, user_id, client_id, address, stage, our_offer, final_price, representation)
  VALUES
    (d_lebron, uid, c_lebron, '27850 Wolf Rd, Bay Village OH 44140',  'Closed',         589000, 589000, 'buyer'),
    (d_steph,  uid, c_steph,  '28741 Detroit Rd, Westlake OH 44145',  'Under Contract', 498000, null,   'buyer');

  -- ── Offers ───────────────────────────────────────────────────
  INSERT INTO public.offers
    (deal_id, offer_date, amount, direction, status)
  VALUES
    (d_lebron, '2026-03-30', 589000, 'sent', 'Accepted'),
    (d_steph,  '2026-04-08', 498000, 'sent', 'Pending');

END $$;
