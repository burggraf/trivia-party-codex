# Tasks: Game Event Setup & Live Trivia Play

**Input**: Design documents from `/specs/001-game-setup-create/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup
- [X] T001 Establish Supabase CLI project configuration in `supabase/config.toml` and verify environment variables from `.env.local` are mapped per plan.md.
- [X] T002 Create/validate workspace directories (`apps/web`, `packages/shared/{analytics,supabase,ui}`, `apps/web/tests/{contract,integration,accessibility,performance}`) matching the structure decision in plan.md.
- [X] T003 Configure project tooling (ESLint, Prettier, Tailwind, Vitest, Playwright) in `apps/web/package.json` and associated config files to satisfy constitution linting requirements.

## Phase 3.2: Tests & Experience Gates ⚠️ MUST COMPLETE BEFORE 3.3
- [X] T004 [P] Author failing contract test for `select_round_questions` RPC in `apps/web/tests/contract/select-round-questions.test.ts` using MSW to assert unique category-filtered question IDs.
- [X] T005 [P] Author failing contract test for `issue_join_code` edge function in `apps/web/tests/contract/issue-join-code.test.ts` validating 6-character code uniqueness and expiry fields.
- [X] T006 [P] Author failing contract test in `apps/web/tests/contract/realtime-payloads.test.ts` that enforces realtime message envelope schema and heartbeat semantics.
- [X] T007 [P] Create failing Playwright spec `apps/web/tests/integration/host-event-flow.spec.ts` covering full host start-to-finish gameplay with score updates.
- [X] T008 [P] Create failing Playwright spec `apps/web/tests/integration/round-curation.spec.ts` covering question removal and deterministic replacement before save.
- [X] T009 [P] Create failing Playwright spec `apps/web/tests/integration/round-results-scoreboard.spec.ts` verifying standings presentation and tie handling.
- [X] T010 [P] Create failing Playwright spec `apps/web/tests/integration/network-recovery.spec.ts` simulating realtime outage and asserting auto-pause notification.
- [X] T011 [P] Create failing Playwright spec `apps/web/tests/integration/pacing-analytics.spec.ts` verifying pacing metrics logging and purge after event completion.
- [X] T012 [P] Implement accessibility regression test with Axe in `apps/web/tests/accessibility/host-player-flows.spec.ts` for host controls, player client, and scoreboard.
- [X] T013 [P] Implement performance smoke test in `apps/web/tests/performance/realtime-latency.test.ts` asserting <1s perceived latency budget.

## Phase 3.3: Core Implementation (ONLY after tests and gates are failing)
- [X] T014 Create Supabase migration `supabase/migrations/2025092801_create_game_event.sql` defining `GameEvent` and `EventRound` tables with required constraints. (Depends on T004-T013)
- [X] T015 Create Supabase migration `supabase/migrations/2025092802_create_team_player_session.sql` defining `Team` and `PlayerSession` tables with limits aligned to clarified rules. (Depends on T014)
- [X] T016 Create Supabase migration `supabase/migrations/2025092803_create_answer_submission_metrics.sql` defining `AnswerSubmission`, `EventMetric`, and `BroadcastSnapshot` structures plus supporting indexes. (Depends on T015)
- [X] T017 Add Postgres function migration `supabase/migrations/2025092804_select_round_questions_fn.sql` implementing deterministic question selection logic. (Depends on T014, T016)
- [X] T018 Add Postgres function migration `supabase/migrations/2025092805_purge_event_metrics_fn.sql` scheduling analytics purge on event completion. (Depends on T016)
- [X] T019 Implement Supabase Edge Function `issue_join_code` in `supabase/functions/issue_join_code/index.ts` enforcing uniqueness and expiry. (Depends on T015)
- [X] T020 [P] Create Zod schema and TypeScript types for `GameEvent` in `packages/shared/supabase/schemas/game-event.ts` using database shape. (Depends on T014)
- [X] T021 [P] Create Zod schema and TypeScript types for `EventRound` and broadcast payload stubs in `packages/shared/supabase/schemas/event-round.ts`. (Depends on T014, T017)
- [X] T022 [P] Create Zod schema for `Team` and `PlayerSession` in `packages/shared/supabase/schemas/team.ts`. (Depends on T015)
- [X] T023 [P] Create Zod schema for `AnswerSubmission` and `EventMetric` in `packages/shared/supabase/schemas/answer-submission.ts`. (Depends on T016, T018)
- [X] T024 Implement Supabase data access utilities in `packages/shared/supabase/client/event-service.ts` covering CRUD, team limits, and submission writes. (Depends on T020-T023)
- [X] T025 Implement pacing analytics helper in `packages/shared/analytics/pacing.ts` to compute latency and invoke purge function. (Depends on T018, T023)
- [X] T026 Implement realtime session manager in `packages/shared/supabase/realtime-live-session.ts` handling broadcast subscription, heartbeat, and resume tokens. (Depends on T017, T024)
- [X] T027 Implement host realtime hook `apps/web/src/features/live-control/hooks/useHostRealtime.ts` wiring manager events to UI state. (Depends on T026)
- [X] T028 Implement player realtime hook `apps/web/src/features/player-client/hooks/usePlayerRealtime.ts` enforcing first-answer lock logic. (Depends on T026, T024)
- [X] T029 Build event setup page in `apps/web/src/features/event-setup/EventSetupPage.tsx` supporting configuration form and Supabase mutations. (Depends on T024, T020)
- [X] T030 Build question preview/editor in `apps/web/src/features/event-setup/QuestionPreviewPanel.tsx` including removal and replacement flow. (Depends on T029, T017)
- [X] T031 Build join code + QR display component in `apps/web/src/features/event-setup/components/JoinCodeDisplay.tsx` using edge function call. (Depends on T019, T029)
- [X] T032 Build host live control panel in `apps/web/src/features/live-control/HostControlPanel.tsx` enabling start/pause/resume/end actions. (Depends on T027, T029)
- [X] T033 Build connection guard UI in `apps/web/src/features/live-control/components/ConnectionGuard.tsx` reacting to realtime outages. (Depends on T032)
- [X] T034 Build scoreboard display in `apps/web/src/features/live-control/ScoreboardDisplay.tsx` rendering highlights and tie states. (Depends on T032)
- [ ] T035 Build pacing dashboard overlay in `apps/web/src/features/live-control/components/PacingDashboard.tsx` consuming analytics helper. (Depends on T025, T032)
- [ ] T036 Build player client shell in `apps/web/src/features/player-client/PlayerClientApp.tsx` for join flow and question display. (Depends on T028)
- [ ] T037 Implement player answer form lock-in component in `apps/web/src/features/player-client/components/AnswerForm.tsx`. (Depends on T036)
- [ ] T038 Implement event completion action in `apps/web/src/features/live-control/actions/completeEvent.ts` calling purge function and broadcasting final standings. (Depends on T025, T032)

## Phase 3.4: Integration
- [ ] T039 Wire Supabase storage and realtime configuration in `apps/web/src/app/providers/RealtimeProvider.tsx` with presence and error handling. (Depends on T026-T028, T032)
- [ ] T040 Connect automated pacing analytics export to Supabase scheduled job configuration in `supabase/config.toml` and `supabase/functions/_schedule.json`. (Depends on T018, T025, T038)
- [ ] T041 Integrate accessibility regression command `pnpm run lint:a11y` into CI workflow file `.github/workflows/ci.yml`. (Depends on T012, T003)
- [ ] T041A Implement host authentication UI and Supabase Auth integration at `apps/web/src/features/auth/HostAuthGate.tsx`, ensuring sessions persist and RLS policies apply. (Depends on T003, Supabase config)
- [ ] T041B Create event creation flow at `apps/web/src/features/event-setup/actions/createEvent.ts` with UI entry point to generate new `game_events` tied to current host. (Depends on T024, T041A)
- [ ] T041C Update event routing to require auth and auto-load/create events (`apps/web/src/App.tsx`, `apps/web/src/app/routes/*`) handling missing event IDs gracefully. (Depends on T041A, T041B)

## Phase 3.5: Polish
- [ ] T042 [P] Update quickstart guide at `specs/001-game-setup-create/quickstart.md` with final commands, test invocations, and validation notes. (Depends on T014-T041)
- [ ] T043 [P] Document manual validation evidence in `docs/manual-validation/game-event-setup.md` covering host, player, outage, and analytics scenarios. (Depends on T042)
- [ ] T044 Run full test suite via `pnpm run test:ci` and capture report in `reports/2025-09-28-test-run.md`. (Depends on T039-T043)

## Dependencies
- Tests and experience gates (T004-T013) must be implemented and failing before starting T014.
- Database migrations (T014-T018) must complete before data access and realtime layers (T024-T028).
- UI implementation (T029-T038) depends on hooks/services being in place; host UI precedes player and scoreboard wiring.
- Integration tasks (T039-T041) require realtime and analytics layers to be functional.
- Polish tasks (T042-T044) seal documentation and final validation after all prior work.

## Parallel Example
```
# After completing T003, launch these in parallel to seed failing tests:
task-agent run T004
-task-agent run T005
-task-agent run T006
-task-agent run T007
-task-agent run T008
-task-agent run T009
-task-agent run T010
-task-agent run T011
-task-agent run T012
-task-agent run T013
```

## Notes
- [P] tasks target distinct files with no shared dependencies after prerequisites complete.
- Maintain TDD: ensure each test fails before writing implementation work that satisfies it.
- Keep React component files under 250 LOC and leverage shadcn/Tailwind primitives.
- Capture evidence for performance (<1s latency) and accessibility checks to satisfy constitution gates.
- Commit after each task and link PRs to this task list for traceability.
