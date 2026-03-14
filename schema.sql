-- ============================================================
-- RealTrack Schema
-- Run this in the Supabase SQL Editor (top to bottom, once)
-- PostgreSQL — compatible with Supabase Auth (auth.users)
-- ============================================================


-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ------------------------------------------------------------
-- USERS (profile extension of Supabase Auth)
-- Supabase manages auth.users internally.
-- This table extends it with app-specific profile data.
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  email         TEXT,
  tier          TEXT NOT NULL DEFAULT 'free'  -- 'free' | 'paid'
                CHECK (tier IN ('free', 'paid')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- AGENTS
-- Other realtors your user interacts with on deals
-- ------------------------------------------------------------
CREATE TABLE public.agents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  brokerage     TEXT,
  phone         TEXT,
  email         TEXT,
  category      TEXT NOT NULL DEFAULT 'Neutral'
                CHECK (category IN ('Preferred', 'Reliable', 'Neutral', 'Difficult', 'Avoid')),
  rating        SMALLINT NOT NULL DEFAULT 3
                CHECK (rating BETWEEN 1 AND 5),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- AGENT TAGS
-- Many tags per agent, stored as individual rows
-- ------------------------------------------------------------
CREATE TABLE public.agent_tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id      UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL
);


-- ------------------------------------------------------------
-- CLIENTS
-- Buyers or sellers your user is working with
-- ------------------------------------------------------------
CREATE TABLE public.clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  budget_min          NUMERIC(12,2),
  budget_max          NUMERIC(12,2),
  retainer_required   BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason         TEXT,        -- NULL = not flagged
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- VISITS
-- Property visits logged per client
-- ------------------------------------------------------------
CREATE TABLE public.visits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,
  visit_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  outcome       TEXT,   -- e.g. 'Interested', 'Passed', 'Made offer'
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- DEALS
-- Transactions involving an agent and optionally a client
-- ------------------------------------------------------------
CREATE TABLE public.deals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  address       TEXT NOT NULL,
  stage         TEXT NOT NULL DEFAULT 'Active'
                CHECK (stage IN ('Active', 'Under Contract', 'Closed', 'Fallen Through', 'Pending')),
  our_offer     NUMERIC(12,2),   -- offer from your user's side
  their_offer   NUMERIC(12,2),   -- offer from agent's side
  final_price   NUMERIC(12,2),   -- closing price if closed
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- OFFERS
-- Individual offer exchanges within a deal (full history)
-- ------------------------------------------------------------
CREATE TABLE public.offers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id       UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  offer_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount        NUMERIC(12,2) NOT NULL,
  direction     TEXT NOT NULL
                CHECK (direction IN ('sent', 'received')),
  status        TEXT NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Countered', 'Withdrawn')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- INDEXES
-- Speeds up common lookups by user_id and foreign keys
-- ------------------------------------------------------------
CREATE INDEX idx_agents_user_id       ON public.agents(user_id);
CREATE INDEX idx_clients_user_id      ON public.clients(user_id);
CREATE INDEX idx_deals_user_id        ON public.deals(user_id);
CREATE INDEX idx_deals_agent_id       ON public.deals(agent_id);
CREATE INDEX idx_deals_client_id      ON public.deals(client_id);
CREATE INDEX idx_visits_client_id     ON public.visits(client_id);
CREATE INDEX idx_offers_deal_id       ON public.offers(deal_id);
CREATE INDEX idx_agent_tags_agent_id  ON public.agent_tags(agent_id);


-- ------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically stamps updated_at on any row change
-- Equivalent to a SQL Server "last modified" trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- Critical — ensures each user only sees their own data.
-- This is Supabase's equivalent of SQL Server row filters.
-- ------------------------------------------------------------
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers    ENABLE ROW LEVEL SECURITY;


-- profiles: user can only read/write their own profile
CREATE POLICY "Own profile only"
  ON public.profiles FOR ALL
  USING (id = auth.uid());

-- agents: user can only access agents they created
CREATE POLICY "Own agents only"
  ON public.agents FOR ALL
  USING (user_id = auth.uid());

-- agent_tags: accessible if the parent agent belongs to the user
CREATE POLICY "Own agent tags only"
  ON public.agent_tags FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- clients: user can only access clients they created
CREATE POLICY "Own clients only"
  ON public.clients FOR ALL
  USING (user_id = auth.uid());

-- visits: user can only access visits they logged
CREATE POLICY "Own visits only"
  ON public.visits FOR ALL
  USING (user_id = auth.uid());

-- deals: user can only access deals they created
CREATE POLICY "Own deals only"
  ON public.deals FOR ALL
  USING (user_id = auth.uid());

-- offers: accessible if the parent deal belongs to the user
CREATE POLICY "Own offers only"
  ON public.offers FOR ALL
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- FREEMIUM ENFORCEMENT FUNCTION
-- Call this before inserting an agent or client to check
-- whether the user has hit their free tier limit.
-- Returns TRUE if the insert is allowed.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_tier_limit(
  p_user_id UUID,
  p_table   TEXT   -- 'agents' or 'clients'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier  TEXT;
  v_count INT;
BEGIN
  SELECT tier INTO v_tier FROM public.profiles WHERE id = p_user_id;

  IF v_tier = 'paid' THEN
    RETURN TRUE;
  END IF;

  IF p_table = 'agents' THEN
    SELECT COUNT(*) INTO v_count FROM public.agents WHERE user_id = p_user_id;
  ELSIF p_table = 'clients' THEN
    SELECT COUNT(*) INTO v_count FROM public.clients WHERE user_id = p_user_id;
  ELSE
    RETURN FALSE;
  END IF;

  RETURN v_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------
-- AUTO-FLAG FUNCTION
-- Checks a client's visit/offer ratio and updates flag_reason.
-- Call this after inserting a visit or offer.
-- Thresholds: 5+ visits with fewer than 2 offers = flagged.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_client_flag(p_client_id UUID)
RETURNS VOID AS $$
DECLARE
  v_visits INT;
  v_offers INT;
BEGIN
  SELECT COUNT(*) INTO v_visits FROM public.visits  WHERE client_id = p_client_id;
  SELECT COUNT(*) INTO v_offers FROM public.offers
    JOIN public.deals ON offers.deal_id = deals.id
    WHERE deals.client_id = p_client_id;

  IF v_visits >= 5 AND v_offers < 2 THEN
    UPDATE public.clients
    SET flag_reason = 'High visits, low offers'
    WHERE id = p_client_id;
  ELSIF v_offers > 0 AND (v_visits::FLOAT / v_offers) > 4 THEN
    UPDATE public.clients
    SET flag_reason = 'High visit-to-offer ratio'
    WHERE id = p_client_id;
  ELSE
    UPDATE public.clients
    SET flag_reason = NULL
    WHERE id = p_client_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;