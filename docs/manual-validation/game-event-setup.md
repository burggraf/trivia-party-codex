# Manual Validation – Game Event Setup & Live Trivia Play

_Updated: 2025-09-29_

## Environment Prep
- Supabase project: `tobezbliurwknxsxugpe`
- Host account: `host.demo@example.com` (replace with venue host credentials)
- Client env (`apps/web/.env.local`):
  ```bash
  VITE_SUPABASE_URL="https://tobezbliurwknxsxugpe.supabase.co"
  VITE_SUPABASE_ANON_KEY="<anon-key>"
  ```
- Edge functions deployed: `issue_join_code`, `pacing_export`
- Scheduled job: `pacing-export-nightly` (configured via `_schedule.json`)

Launch dev stack:
```bash
pnpm run dev
```

---

## 1. Host Authentication & Event Bootstrap
1. Open `http://localhost:5173`.
2. Sign in with the host account.
3. **Expect**:
   - Auth gate accepts credentials and shows the host console.
   - URL acquires `?eventId=<uuid>` if none was present.
   - Presence counter in the host panel shows at least `1` (the host session).

> _Reseed hosts via Supabase Dashboard → Authentication if needed._

---

## 2. Event Setup & Round Curation
1. In the **Setup** view, configure:
   - Name: `Venue Trivia Night`
   - Rounds: `3`
   - Questions per round: `5`
   - Categories: select ≥2
2. Click **Save event**.
3. Navigate to **Manage rounds** and remove one question.
4. **Expect**:
   - Success toast in setup form.
   - Replacement question appears with same category.
   - Supabase `event_rounds` table reflects new question ID.

---

## 3. Player Join & Lock-In
1. In host setup, click **Generate code**.
2. Open player client (`http://localhost:5173/?eventId=<same>` but in incognito/mobile).
3. Join with team name `Quiz Comets`; submit code shown to host.
4. Lock an answer for the current question.
5. **Expect**:
   - Host presence count increments.
   - Host sees scoreboard highlight once answer recorded.
   - Player UI shows “Answer captured” and blocks additional submissions.

---

## 4. Live Control Flow
1. Back in host panel, click **Start game**.
2. Use **Reveal question** → **Next question** cycle for at least two questions.
3. Simulate network outage (disable network tab or cut connection) for ~5s.
4. **Expect**:
   - Connection guard surfaces “Retry now / auto retry” messaging.
   - Host resumes successfully; player UI catches up.
   - Scoreboard reflects updates <1s after host actions.

---

## 5. Pacing Analytics Lifecycle
1. While live, open Pacing dashboard (host panel shows metrics tile).
2. Validate metrics count increments as answers arrive.
3. End game → confirm final broadcast and scoreboard state.
4. Check Pacing dashboard shows “Analytics purged” badge post completion.
5. (Optional) Invoke `pacing_export` manually:
   ```bash
   curl -X POST https://tobezbliurwknxsxugpe.functions.supabase.co/pacing_export \
     -H "Authorization: Bearer <service-role-key>" \
     -H "apikey: <service-role-key>"
   ```
   - Response should include processed count and purge count.

---

## 6. Accessibility & Display Review
1. Run automated lint:
   ```bash
   pnpm run lint:a11y
   ```
2. Manually inspect scoreboard + player UI on a large screen:
   - Contrast meets WCAG AA.
   - Tie badge and leader highlight legible from distance.
   - Keyboard navigation can focus submission options.

---

## 7. Full Regression Checklist
- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:contract`
- `pnpm run test:e2e`
- `pnpm run test:performance`

Record execution results and any anomalies below.

### Notes
- [] Supabase logs checked for `issue_join_code` success.
- [] Supabase presence shows accurate counts during gameplay.
- [] Nightly schedule run (if available) confirms pacing purge.

