# Phase 1 Data Model – Game Event Setup & Live Trivia Play

## Entities

### GameEvent
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | Generated server-side |
| host_id | uuid | FK → `auth.users.id` | Owner; RLS restricts to host |
| name | text | NOT NULL, 3–80 chars | Displayed on host/player screens |
| venue | text | Nullable, ≤120 chars | Optional venue/location |
| scheduled_at | timestamptz | Nullable | Future event start time |
| status | enum (`draft`,`scheduled`,`live`,`paused`,`completed`,`cancelled`) | NOT NULL, default `draft` | Controls UI availability |
| join_code | text | UNIQUE, 6 chars | Active only while `status` ∈ {`live`,`paused`} |
| join_code_expires_at | timestamptz | NOT NULL when live | Auto-cleared on completion |
| round_count | smallint | 1–10 | Configured by host |
| questions_per_round | smallint | 3–10 | Applied to every round |
| created_at | timestamptz | default now() | Audit |
| updated_at | timestamptz | default now() | Audit |

### EventRound
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → `GameEvent.id` | Cascades delete |
| round_index | smallint | 0-based, UNIQUE per event | Presentation order |
| categories | text[] | NOT NULL | Selected categories |
| question_ids | uuid[] | NOT NULL | Populated by RPC, length == `questions_per_round` |
| reveal_state | enum (`pending`,`in_progress`,`completed`) | NOT NULL | Host control state |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### Team
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → `GameEvent.id` | Cascades delete |
| name | text | NOT NULL, 2–40 chars | Display name |
| join_secret | text | 8 chars | Required for players to join existing team |
| total_score | integer | default 0 | Derived from submissions |
| created_at | timestamptz | default now() | |

### PlayerSession
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| team_id | uuid | FK → `Team.id` | Cascades delete |
| user_id | uuid | Nullable FK → `auth.users.id` | Anonymous players allowed |
| session_token | text | NOT NULL, unique | Browser/device binding |
| joined_at | timestamptz | default now() | |
| last_active_at | timestamptz | updated via heartbeat | Presence tracking |

### AnswerSubmission
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → `GameEvent.id` | Denormalised for queries |
| round_id | uuid | FK → `EventRound.id` | |
| question_id | uuid | FK → `questions.id` | |
| team_id | uuid | FK → `Team.id` | |
| selected_option | text | NOT NULL, ∈ {`a`,`b`,`c`,`d`} | First submission locked |
| correct | boolean | NOT NULL | Calculated server-side |
| submitted_at | timestamptz | default now() | Used for pacing analytics |

### EventMetric
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK | |
| event_id | uuid | FK → `GameEvent.id` | |
| question_id | uuid | FK → `questions.id` | |
| team_id | uuid | FK → `Team.id` | |
| reveal_timestamp | timestamptz | NOT NULL | |
| submit_timestamp | timestamptz | Nullable | Null when no answer submitted |
| latency_ms | integer | Computed, >=0 | Derived metric |

### BroadcastSnapshot (Materialised View / Cached State)
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| event_id | uuid | PK | |
| payload | jsonb | NOT NULL | Current question, scoreboard, timestamps |
| updated_at | timestamptz | default now() | Supports recovery after reconnect |

## Relationships
- `GameEvent` 1──N `EventRound`
- `GameEvent` 1──N `Team`
- `Team` 1──N `PlayerSession`
- `EventRound` 1──N `AnswerSubmission`
- `GameEvent` 1──N `AnswerSubmission`
- `GameEvent` 1──N `EventMetric`
- `GameEvent` 1──1 `BroadcastSnapshot`

## Validation & Business Rules
- `question_ids` arrays must be unique across all rounds within the same event to prevent repeats.
- `Team` creation blocked when `GameEvent` already has 30 active teams.
- `PlayerSession` creation enforces team member limit of 6 via trigger counting active sessions.
- `AnswerSubmission` unique constraint on (`team_id`,`question_id`) ensures first answer lock-in.
- `EventMetric` rows deleted by `purge_event_metrics(event_id)` immediately after `GameEvent.status` transitions to `completed`.
- RLS policies:
  - Hosts: full CRUD on their events, rounds, teams.
  - Players: read-only access to current event state and ability to insert `AnswerSubmission` for their team when question is active.
  - Public: read-only access to `BroadcastSnapshot` for display screens (through anon key).

## State Transitions
- `GameEvent.status`: `draft` → `scheduled` (host finalises setup) → `live` (host starts) → `paused` (system or host pause) → `live` → `completed` (host ends) or `cancelled`.
- `EventRound.reveal_state`: `pending` → `in_progress` when question broadcast starts → `completed` after scores posted.
- `BroadcastSnapshot.updated_at` refreshed on each host action; if realtime interruption occurs, host resume uses snapshot to reseed client state.

---
*Design authored 2025-09-28*
