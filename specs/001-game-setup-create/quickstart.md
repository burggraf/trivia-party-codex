# Quickstart – Game Event Setup & Live Trivia Play

## Prerequisites
1. Install Node.js 20 LTS and pnpm.
2. Create Supabase project with `questions` table pre-populated and enable Realtime Broadcast.
3. Configure environment variables in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_KEY` (for local tooling only)

## Setup
```bash
pnpm install
pnpm run supabase:link   # configure cli with project id
pnpm run db:migrate      # applies GameEvent + Team schema
```

## Development
```bash
pnpm run dev             # launches Vite dev server at http://localhost:5173
pnpm run supabase:realtime # optional helper to tail realtime logs
```

## Testing Workflow
1. **Unit Tests (Vitest)**
   ```bash
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
1. **Host Setup**
   - Create event with 3 rounds, 5 questions each, assign categories.
   - Remove one question; confirm replacement respects category filter.
2. **Player Join**
   - Share 6-character join code + QR; verify new team creation capped at 30.
   - Attempt 6th player to join a team; expect friendly rejection.
3. **Live Control**
   - Start game, advance questions; ensure scoreboard updates <1s.
   - Simulate network drop (disable network tab); host should see auto-pause message.
4. **Pacing Analytics**
   - Review live pacing dashboard; end event and confirm analytics cleared.
5. **Accessibility & Display**
   - Run `pnpm run lint:a11y`; inspect scoreboard on large display for contrast and readable typography.

---
*Quickstart prepared 2025-09-28*
