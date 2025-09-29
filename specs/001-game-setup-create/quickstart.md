# Quickstart – Game Event Setup & Live Trivia Play

## Prerequisites
1. Install Node.js 20 LTS and pnpm.
2. Create a Supabase project with the shared `questions` dataset imported and Realtime (Broadcast + Presence) enabled.
3. Provision a host account that will run the venue console (via Supabase Dashboard → Authentication → Add user).
4. Populate `apps/web/.env.local` with the public environment variables:
   ```bash
   VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<anon-key>"
   ```
   > The service-role key is never loaded by the client; use it only through the Supabase CLI when deploying edge functions.

## Setup
```bash
pnpm install
pnpm run supabase:link   # one-time: link local CLI profile to your Supabase project
pnpm run db:migrate      # applies migrations for events, rounds, teams, metrics
```

Deploy edge functions and configure the scheduled pacing export:
```bash
# Set secrets expected by Deno edge functions
npx supabase secrets set --project-ref <project-ref> \
  SERVICE_ROLE_KEY="<service-role-key>" \
  PROJECT_URL="https://<project-ref>.supabase.co" \
  ANON_KEY="<anon-key>"

# Deploy edge functions
npx supabase functions deploy issue_join_code --project-ref <project-ref>
npx supabase functions deploy pacing_export --project-ref <project-ref>

# Apply schedule configuration
npx supabase functions deploy --include "_schedule.json" --project-ref <project-ref>
```

## Development
```bash
pnpm run dev  # launches Vite dev server at http://localhost:5173
```
During development, sign in with the host credentials you created earlier. The app automatically bootstraps an event for the signed-in host if none exists.

## Testing Workflow
1. **Lint + Unit (Vitest)**
   ```bash
   pnpm run lint
   pnpm run test:unit
   ```
2. **Contract Tests (Vitest + MSW)**
   ```bash
   pnpm run test:contract
   ```
3. **Playwright Integration** – host + player end-to-end simulated with dual contexts.
   ```bash
   pnpm run test:e2e
   ```
4. **Performance Smoke** – measures broadcast round-trip latency under local load.
   ```bash
   pnpm run test:performance
   ```

## Manual Validation Scenarios
1. **Host Authentication & Bootstrap**
   - Load the app, sign in with the host account, and confirm a draft event is created/loaded.
   - Sign out/in to verify session persistence gates the console correctly.
2. **Host Setup**
   - Configure 3 rounds with 5 questions each and multiple categories.
   - Remove a question to trigger deterministic replacement from the same category pool.
3. **Player Join & Lock-in**
   - Generate a join code, connect a player client, and submit an answer; ensure second submissions are blocked.
   - Observe presence count increments in the host panel when additional players connect.
4. **Live Control & Recovery**
   - Start the event, cycle questions, and monitor <1s scoreboard updates.
   - Simulate network loss (e.g., disable network tab) and confirm auto-pause + resume works.
5. **Pacing Analytics**
   - Watch the pacing dashboard during play, end the event, and confirm metrics purge (dashboard shows “Analytics purged”).
   - Inspect the scheduled `pacing_export` function logs for successful nightly purge.
6. **Accessibility & Display**
   - Run `pnpm run lint:a11y`.
   - Review the scoreboard and player UI on a large display for contrast, typography, and tie call-outs.

---
*Quickstart updated 2025-09-29*
