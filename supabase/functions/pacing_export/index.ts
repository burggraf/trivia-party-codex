import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration for pacing_export function');
}

interface CompletedEventRow {
  id: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    const { data: events, error } = await adminClient
      .from('game_events')
      .select('id')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const completedEvents = (events ?? []) as CompletedEventRow[];
    let purged = 0;

    for (const event of completedEvents) {
      const { error: purgeError } = await adminClient.rpc('purge_event_metrics', {
        p_event_id: event.id
      });

      if (purgeError) {
        console.error(`Failed to purge metrics for event ${event.id}`, purgeError.message);
        continue;
      }

      purged += 1;
    }

    return new Response(
      JSON.stringify({ processed: completedEvents.length, purged }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected pacing export error', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
