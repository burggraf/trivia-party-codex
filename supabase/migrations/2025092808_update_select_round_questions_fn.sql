-- Migration: update select_round_questions with fallback pool
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
  used_ids uuid[] := '{}';
  selected_ids uuid[] := '{}';
  fallback_ids uuid[] := '{}';
  selected_count integer := 0;
  needed integer := 0;
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

  SELECT coalesce(array_agg(DISTINCT prior_usage.question_id), '{}')
    INTO used_ids
  FROM (
    SELECT unnest(er.question_ids) AS question_id
    FROM public.event_rounds er
    WHERE er.event_id = p_event_id
      AND (p_round_index IS NULL OR er.round_index <> p_round_index)
  ) AS prior_usage;

  SELECT coalesce(array_agg(candidate_id), '{}'), COUNT(candidate_id)::integer
    INTO selected_ids, selected_count
  FROM (
    SELECT q.id AS candidate_id
    FROM public.questions q
    WHERE q.category = ANY (p_categories)
      AND NOT (q.id = ANY (used_ids))
    ORDER BY random()
    LIMIT p_limit
  ) AS candidates;

  needed := p_limit - selected_count;

  IF needed > 0 THEN
    SELECT coalesce(array_agg(extra_id), '{}')
      INTO fallback_ids
    FROM (
      SELECT q.id AS extra_id
      FROM public.questions q
      WHERE NOT (q.id = ANY (used_ids))
        AND NOT (q.id = ANY (selected_ids))
      ORDER BY random()
      LIMIT needed
    ) AS fallback;

    IF fallback_ids IS NOT NULL THEN
      selected_ids := selected_ids || fallback_ids;
      selected_count := COALESCE(array_length(selected_ids, 1), 0);
    END IF;
  END IF;

  IF selected_count IS NULL OR selected_count < p_limit THEN
    RAISE EXCEPTION 'Unable to satisfy requested number of questions for event %',
      p_event_id
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN QUERY SELECT unnest(selected_ids);
END;
$$;
