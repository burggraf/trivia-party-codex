-- Migration: add host-facing RLS policies for game events and rounds
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = off;
SET xmloption = content;
SET client_min_messages = warning;

ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts manage their game events" ON public.game_events;
CREATE POLICY "Hosts manage their game events"
ON public.game_events
FOR ALL
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts manage their event rounds" ON public.event_rounds;
CREATE POLICY "Hosts manage their event rounds"
ON public.event_rounds
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.game_events ge
    WHERE ge.id = event_rounds.event_id
      AND ge.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.game_events ge
    WHERE ge.id = event_rounds.event_id
      AND ge.host_id = auth.uid()
  )
);
