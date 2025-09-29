-- Migration: create game_events and event_rounds tables
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'game_event_status'
  ) THEN
    CREATE TYPE game_event_status AS ENUM (
      'draft',
      'scheduled',
      'live',
      'paused',
      'completed',
      'cancelled'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 80),
  venue text NULL CHECK (char_length(venue) <= 120),
  scheduled_at timestamptz NULL,
  status game_event_status NOT NULL DEFAULT 'draft',
  join_code text UNIQUE,
  join_code_expires_at timestamptz,
  round_count smallint NOT NULL CHECK (round_count BETWEEN 1 AND 10),
  questions_per_round smallint NOT NULL CHECK (questions_per_round BETWEEN 3 AND 10),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.game_events IS 'Trivia events configured by hosts';
COMMENT ON COLUMN public.game_events.join_code IS 'Active join code while the event is live or paused';

ALTER TABLE public.game_events
  ADD CONSTRAINT game_events_join_code_active CHECK (
    (join_code IS NULL AND join_code_expires_at IS NULL)
    OR (join_code IS NOT NULL AND join_code_expires_at IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.set_game_events_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_game_events_updated_at ON public.game_events;
CREATE TRIGGER trg_game_events_updated_at
  BEFORE UPDATE ON public.game_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_game_events_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_game_events_active_join_code
  ON public.game_events (join_code)
  WHERE status IN ('live', 'paused');

CREATE TABLE IF NOT EXISTS public.event_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.game_events (id) ON DELETE CASCADE,
  round_index smallint NOT NULL CHECK (round_index >= 0),
  categories text[] NOT NULL CHECK (array_length(categories, 1) >= 1),
  question_ids uuid[] NOT NULL,
  reveal_state text NOT NULL CHECK (reveal_state IN ('pending', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (event_id, round_index)
);

COMMENT ON TABLE public.event_rounds IS 'Round configuration for a trivia event';

CREATE OR REPLACE FUNCTION public.set_event_rounds_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_rounds_updated_at ON public.event_rounds;
CREATE TRIGGER trg_event_rounds_updated_at
  BEFORE UPDATE ON public.event_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_rounds_updated_at();

CREATE OR REPLACE FUNCTION public.validate_event_round_question_count()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  expected_count smallint;
BEGIN
  SELECT questions_per_round INTO expected_count
  FROM public.game_events
  WHERE id = NEW.event_id;

  IF expected_count IS NULL THEN
    RAISE EXCEPTION 'Game event % not found', NEW.event_id USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF array_length(NEW.question_ids, 1) IS DISTINCT FROM expected_count THEN
    RAISE EXCEPTION 'Round % must contain exactly % questions', NEW.round_index, expected_count USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_rounds_question_count ON public.event_rounds;
CREATE TRIGGER trg_event_rounds_question_count
  BEFORE INSERT OR UPDATE ON public.event_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_round_question_count();

CREATE INDEX IF NOT EXISTS idx_event_rounds_event ON public.event_rounds (event_id);
