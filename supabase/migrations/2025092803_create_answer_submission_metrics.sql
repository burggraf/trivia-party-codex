-- Migration: create answer_submissions, event_metrics, and broadcast_snapshots structures
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

CREATE TABLE IF NOT EXISTS public.answer_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.game_events (id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.event_rounds (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  selected_option text NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  correct boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (team_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answer_submissions_event_round ON public.answer_submissions (event_id, round_id);
CREATE INDEX IF NOT EXISTS idx_answer_submissions_question ON public.answer_submissions (question_id);

CREATE TABLE IF NOT EXISTS public.event_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.game_events (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  reveal_timestamp timestamptz NOT NULL,
  submit_timestamp timestamptz
);

CREATE OR REPLACE FUNCTION public.calculate_latency_ms(
  p_reveal timestamptz,
  p_submit timestamptz
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_submit IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN GREATEST(
    0,
    ((extract(epoch FROM p_submit) - extract(epoch FROM p_reveal)) * 1000)::integer
  );
END;
$$;

ALTER TABLE public.event_metrics
  ADD COLUMN latency_ms integer GENERATED ALWAYS AS (
    public.calculate_latency_ms(reveal_timestamp, submit_timestamp)
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_event_metrics_event_question ON public.event_metrics (event_id, question_id);
CREATE INDEX IF NOT EXISTS idx_event_metrics_team ON public.event_metrics (team_id);

CREATE TABLE IF NOT EXISTS public.broadcast_snapshots (
  event_id uuid PRIMARY KEY REFERENCES public.game_events (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION public.set_broadcast_snapshots_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_snapshots_updated_at ON public.broadcast_snapshots;
CREATE TRIGGER trg_broadcast_snapshots_updated_at
  BEFORE UPDATE ON public.broadcast_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_broadcast_snapshots_updated_at();
