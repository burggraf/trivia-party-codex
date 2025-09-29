-- Migration: create purge_event_metrics helper
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.purge_event_metrics(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'event_id is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  DELETE FROM public.event_metrics WHERE event_id = p_event_id;
  DELETE FROM public.broadcast_snapshots WHERE event_id = p_event_id;
END;
$$;

COMMENT ON FUNCTION public.purge_event_metrics(uuid)
  IS 'Removes pacing analytics and cached broadcast snapshot data once an event completes.';
