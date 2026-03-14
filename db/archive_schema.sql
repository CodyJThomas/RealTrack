-- ============================================================
-- RealTrack — Archive & Soft Delete Schema Update
-- Run this in the Supabase SQL Editor before deploying
-- the updated index.html. Safe to run once.
-- ============================================================


-- ------------------------------------------------------------
-- ADD archived_at COLUMNS
-- NULL = active record (normal view)
-- Timestamp = archived (hidden from normal views, recoverable)
-- This is a non-destructive soft delete pattern — data is
-- never permanently removed unless explicitly hard deleted.
-- ------------------------------------------------------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;


-- ------------------------------------------------------------
-- ADD deal stage to agents column (for quick link feature)
-- Agents table already has deals linked via deals.agent_id
-- No schema change needed for agent quick-link on offers —
-- the existing deals.agent_id foreign key handles it.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- INDEXES for archive filtering
-- Speeds up the common query pattern WHERE archived_at IS NULL
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agents_archived_at
  ON public.agents(archived_at);

CREATE INDEX IF NOT EXISTS idx_clients_archived_at
  ON public.clients(archived_at);


-- ------------------------------------------------------------
-- VERIFY — confirm columns exist and are null by default
-- Expected: all existing rows show NULL for archived_at
-- ------------------------------------------------------------
SELECT id, full_name, archived_at FROM public.agents  LIMIT 5;
SELECT id, full_name, archived_at FROM public.clients LIMIT 5;