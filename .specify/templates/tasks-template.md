# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Experience: accessibility, UX consistency, content reviews
   → Performance: profiling, budget validation, instrumentation
   → Integration: DB, middleware, logging
   → Polish: unit tests, documentation, release readiness
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
   → Experience guardrails and accessibility tasks covered?
   → Performance validation and monitoring tasks included?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Tests & Experience Gates ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: Automated checks MUST exist and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T006 [P] Integration test user registration in tests/integration/test_registration.py
- [ ] T007 [P] Integration test auth flow in tests/integration/test_auth.py
- [ ] T008 [P] Accessibility regression coverage for new flows in tests/accessibility/test_flows.py
- [ ] T009 UX copy and component consistency review documented in docs/ux-checklist.md
- [ ] T010 Baseline performance budget test in tests/performance/test_latency_budget.py

## Phase 3.3: Core Implementation (ONLY after tests and experience gates are failing)
- [ ] T011 [P] User model in src/models/user.py
- [ ] T012 [P] UserService CRUD in src/services/user_service.py
- [ ] T013 [P] CLI --create-user in src/cli/user_commands.py
- [ ] T014 POST /api/users endpoint
- [ ] T015 GET /api/users/{id} endpoint
- [ ] T016 Input validation
- [ ] T017 Error handling and logging

## Phase 3.4: Integration
- [ ] T018 Connect UserService to DB
- [ ] T019 Auth middleware
- [ ] T020 Request/response logging
- [ ] T021 CORS and security headers

## Phase 3.5: Polish
- [ ] T022 [P] Unit tests for validation in tests/unit/test_validation.py
- [ ] T023 Performance tuning to hit latency budget (<200ms)
- [ ] T024 [P] Update docs/api.md and docs/ux-checklist.md
- [ ] T025 Remove duplication
- [ ] T026 Run manual-testing.md with performance and UX sign-off

## Dependencies
- Tests and experience gates (T004-T010) before implementation (T011-T017)
- T011 blocks T012 and T018
- T019 blocks T021
- Implementation before polish (T022-T026)

## Parallel Example
```
# Launch T004-T010 together when files differ:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
Task: "Accessibility regression coverage for new flows in tests/accessibility/test_flows.py"
Task: "Baseline performance budget test in tests/performance/test_latency_budget.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests and experience/performance gates fail before implementing
- Commit after each task
- Capture evidence for UX consistency and performance validation in linked artifacts
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks
   - UX acceptance criteria → accessibility and consistency tasks

4. **From Performance Goals**:
   - Each budget or target → measurement task
   - Critical paths → instrumentation or profiling tasks

5. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] Accessibility and UX consistency tasks scheduled
- [ ] Performance validation and monitoring tasks included
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task