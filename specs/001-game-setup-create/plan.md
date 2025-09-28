# Implementation Plan: Game Event Setup & Live Trivia Play

**Branch**: `[001-game-setup-create]` | **Date**: 2025-09-28 | **Spec**: [/specs/001-game-setup-create/spec.md](specs/001-game-setup-create/spec.md)  
**Input**: Feature specification from `/specs/001-game-setup-create/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section with Code Quality, Testing, Player Experience, and Performance commitments derived from the constitution.
4. Evaluate the Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build a React + TypeScript venue trivia experience where hosts configure multi-round events, distribute 6-character join codes/QRs, run live questions with <1s realtime updates, and automatically paused sessions resume after realtime outages. Players join as teams (max 6) in a read-only client, submit a single answer per question, and view animated standings at the end of each round and game.

## Technical Context
**Language/Version**: TypeScript 5.x with React 18  
**Primary Dependencies**: Vite, React Router, Supabase JS client, shadcn/ui with Tailwind CSS, Zod for validation  
**Storage**: Supabase Postgres (existing `questions`, new tables for events, teams, submissions)  
**Testing**: Vitest (unit), Playwright (integration/UI), contract tests via MSW schema assertions  
**Target Platform**: Modern browsers on desktop venue displays, host laptops/tablets, and player mobile devices  
**Project Type**: Web (single-page client leveraging Supabase backend services)  
**Performance Goals**: Realtime state propagation perceived in <1s, scoreboard render under 150ms per update  
**Constraints**: Client-only codebase deployable to Cloudflare Pages; strict TypeScript with zero `any`; accessible shadcn components  
**Scale/Scope**: Up to 30 teams per event, 6 players per team, sessions running 3–5 rounds with 5 questions each

## Constitution Check
- ✅ Code Quality: Plan mandates modular React features, shared UI primitives, linting + strict TypeScript, and PR review checklist.
- ✅ Testing: Plan schedules Vitest coverage for logic, Playwright flows covering host/player journeys, and contract tests for Supabase interactions.
- ✅ Player Experience: Plan reuses shadcn/Tailwind design system, enforces accessible host/player layouts, and aligns copy with venue experience guidelines.
- ✅ Performance: Plan commits to <1s realtime SLA, <150ms scoreboard renders, and instrumentation to watch Supabase broadcast latency.

## Project Structure

### Documentation (this feature)
```
specs/001-game-setup-create/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md  # generated via /tasks
```

### Source Code (repository root)
```
apps/web/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── event-setup/
│   │   ├── live-control/
│   │   ├── player-client/
│   │   └── shared/
│   ├── hooks/
│   ├── lib/
│   └── styles/
├── public/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

packages/shared/
├── analytics/
├── supabase/
└── ui/
```

**Structure Decision**: Single web client hosted in `apps/web` with shared packages for Supabase utilities, analytics helpers, and reusable UI primitives to keep files under 250 lines and honour client-only mandate.

## Phase 0: Outline & Research
1. Investigate Supabase Realtime channel configuration for sub-second fan-out and strategies to detect channel drops quickly.
2. Evaluate question randomization without duplicates using Postgres functions or Supabase queries respecting category filters.
3. Review best practices for QR code generation and accessibility on venue displays.
4. Confirm secure patterns for team join flows (rate limiting, code brute-force mitigation) within Supabase Auth + RLS constraints.
5. Document analytics instrumentation that records pacing metrics but purges after event completion.

**Output**: `/specs/001-game-setup-create/research.md`

## Phase 1: Design & Contracts
1. Derive entities (Event, RoundConfig, Team, PlayerSession, AnswerSubmission, BroadcastSnapshot) with fields, relationships, and retention rules in `data-model.md`.
2. Specify Supabase RPCs and Realtime payload schemas under `contracts/`, including join/session channel message formats and question selection RPC definitions.
3. Sketch failing contract tests (Vitest + MSW) to validate RPC inputs/outputs and realtime message envelopes.
4. Draft integration scenarios for host and player flows in `quickstart.md`, mapping to Playwright suites and latency instrumentation.
5. Execute `.specify/scripts/bash/update-agent-context.sh codex` to append new tech context for future agent runs.

**Output**: `data-model.md`, `contracts/*.md|.yaml`, `quickstart.md`, agent context file with current tooling snapshot.

## Phase 2: Task Planning Approach
**Task Generation Strategy**:
- Base tasks on `data-model.md`, contracts, and quickstart scenarios.
- Create parallelizable [P] tasks for schema migrations vs. UI scaffolding vs. realtime wiring.
- Ensure every contract/test pair precedes implementation work; scoreboard UX tasks follow realtime wiring.

**Ordering Strategy**:
- Start with Supabase schema migrations, then Supabase RPC + realtime channel scaffolding.
- Follow with host control UI, then player client UI, then scoreboard visualizations.
- Close with test automation and performance instrumentation tasks prior to polish.

**Estimated Output**: 26–30 ordered tasks spanning migrations, client features, realtime orchestration, and automated tests.

## Phase 3+: Future Implementation
**Phase 3** (/tasks): Generate actionable task list grounded in Phase 1 artifacts.  
**Phase 4**: Implement tasks incrementally with TDD.  
**Phase 5**: Validate via Vitest, Playwright, Supabase channel load checks, and quickstart walkthrough.

## Complexity Tracking
No deviations; all constitutional principles satisfied without exceptions.

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A)

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
