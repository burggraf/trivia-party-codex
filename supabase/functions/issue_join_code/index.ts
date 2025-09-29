import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('ANON_KEY') ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing Supabase environment configuration for issue_join_code edge function.');
}

type IssueJoinCodePayload = {
  event_id?: string;
};

type SupabaseError = {
  code?: string;
  message: string;
};

const ACTIVE_STATUSES = ['live', 'paused'];
const JOIN_CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH)).forEach((value) => {
    code += alphabet[value % alphabet.length];
  });
  return code;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let payload: IssueJoinCodePayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { event_id } = payload;

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'event_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false
      },
      global: {
        headers: authHeader ? { Authorization: authHeader } : undefined
      }
    });

    const { data: event, error: fetchError } = await supabaseClient
      .from('game_events')
      .select('id, status')
      .eq('id', event_id)
      .single();

    if (fetchError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const joinCode = generateJoinCode();

      const { data, error } = await adminClient
        .from('game_events')
        .update({ join_code: joinCode, join_code_expires_at: expiresAt })
        .eq('id', event_id)
        .select('join_code, join_code_expires_at, status')
        .single();

      if (!error && data) {
        // Guard against conflicting active sessions with same code (index covers live/paused only)
        if (ACTIVE_STATUSES.includes(data.status ?? '') || ACTIVE_STATUSES.includes(event.status ?? '')) {
          // Index prevents duplicates in this case; still return data
        }

        return new Response(
          JSON.stringify({ join_code: data.join_code, expires_at: data.join_code_expires_at }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const supabaseError = error as SupabaseError | null;
      if (supabaseError?.code !== '23505') {
        console.error('Failed to issue join code', supabaseError?.message ?? error);
        return new Response(JSON.stringify({ error: 'Failed to issue join code' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unable to generate unique join code' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error issuing join code', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
