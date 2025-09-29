-- Migration: create teams and player_sessions tables
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.game_events (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  join_secret text NOT NULL CHECK (char_length(join_secret) = 8),
  total_score integer NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_event_name ON public.teams (event_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_join_secret ON public.teams (join_secret);

CREATE TABLE IF NOT EXISTS public.player_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  session_token text NOT NULL UNIQUE,
  joined_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  last_active_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_player_sessions_team ON public.player_sessions (team_id);

CREATE OR REPLACE FUNCTION public.set_player_sessions_last_active()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_active_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_sessions_last_active ON public.player_sessions;
CREATE TRIGGER trg_player_sessions_last_active
  BEFORE UPDATE ON public.player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_player_sessions_last_active();

-- Helper to enforce team size limit at 6 players
CREATE OR REPLACE FUNCTION public.enforce_team_size_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT COUNT(*) INTO member_count FROM public.player_sessions WHERE team_id = NEW.team_id;
  IF member_count >= 6 THEN
    RAISE EXCEPTION 'Team % already has the maximum number of players', NEW.team_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_sessions_team_limit ON public.player_sessions;
CREATE TRIGGER trg_player_sessions_team_limit
  BEFORE INSERT ON public.player_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_team_size_limit();

-- Helper to enforce event-wide team limit of 30
CREATE OR REPLACE FUNCTION public.enforce_event_team_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  team_total integer;
BEGIN
  SELECT COUNT(*) INTO team_total FROM public.teams WHERE event_id = NEW.event_id;
  IF team_total >= 30 THEN
    RAISE EXCEPTION 'Event % already has the maximum number of teams', NEW.event_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_event_limit ON public.teams;
CREATE TRIGGER trg_teams_event_limit
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_team_limit();
