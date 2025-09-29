-- Migration: create select_round_questions RPC
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.select_round_questions(
  p_event_id uuid,
  p_round_index integer,
  p_categories text[],
  p_limit integer
)
RETURNS TABLE(question_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  used_ids uuid[];
BEGIN
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'event_id is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'limit must be greater than zero' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_categories IS NULL OR array_length(p_categories, 1) = 0 THEN
    RAISE EXCEPTION 'at least one category must be provided' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT coalesce(array_agg(DISTINCT unnest(er.question_ids)), '{}')
    INTO used_ids
  FROM public.event_rounds er
  WHERE er.event_id = p_event_id
    AND (er.round_index <> p_round_index OR p_round_index IS NULL);

  RETURN QUERY
  SELECT q.id
  FROM public.questions q
  WHERE q.category = ANY (p_categories)
    AND NOT (q.id = ANY (used_ids))
  ORDER BY random()
  LIMIT p_limit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to satisfy requested number of questions for event % with categories %',
      p_event_id,
      p_categories
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.select_round_questions(uuid, integer, text[], integer)
  IS 'Selects a unique set of question IDs for an event round filtered by category.';
