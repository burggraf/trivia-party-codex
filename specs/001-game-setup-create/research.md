# Phase 0 Research – Game Event Setup & Live Trivia Play

## Realtime Broadcast Strategy
- **Decision**: Use Supabase Realtime Broadcast channels with presence enabled per game session; send compact JSON payloads (`question`, `state`, `scores`, `timestamp`).
- **Rationale**: Broadcast channels deliver sub-second fan-out to web clients and support status callbacks to detect disconnects quickly; presence gives host visibility into active teams.
- **Alternatives Considered**:
  - *Supabase Realtime Postgres Changes*: Higher latency and unnecessary DB writes for transient question states.
  - *Polling via REST*: Fails to meet <1s latency target and increases Supabase quota consumption.

## Channel Drop Detection & Recovery
- **Decision**: Clients subscribe to `on('system:disconnect')` events with exponential backoff reconnect attempts (max 3 within 10s) and host-side watchdog timer that auto-pauses session after 5s of missed heartbeats.
- **Rationale**: Aligns with FR-020 requirement to pause gameplay automatically and keeps user experience consistent.
- **Alternatives Considered**:
  - *Manual host trigger only*: Delays pause reaction and risks desynchronised states.
  - *Aggressive reconnect without pause*: Risks racing submissions and inconsistent scoring.

## Question Randomisation without Duplicates
- **Decision**: Create Supabase RPC `select_round_questions(event_id, round_index, categories, limit)` that seeds randomness per event and excludes already selected question IDs stored in `event_round_questions` table.
- **Rationale**: Moves duplicate enforcement server-side with deterministic seed for reproducibility when host revisits setup.
- **Alternatives Considered**:
  - *Client-side shuffle of oversized query*: Increases payload size and risks duplicate collisions.
  - *Database view with ORDER BY RANDOM()*: Expensive for 61k question table and not deterministic per event.

## Join Code Security & Rate Limiting
- **Decision**: Generate 6-character alphanumeric codes server-side with Supabase edge function `issue_join_code`, rate-limit join attempts via Supabase Auth policies (5 attempts/min per IP) and require captcha for repeated failures.
- **Rationale**: Prevents brute-force entry while maintaining frictionless onboarding; aligns with FR-016 guarantee.
- **Alternatives Considered**:
  - *Pure client generation*: Harder to enforce uniqueness and opens spoofing risk.
  - *Longer codes*: Higher security but complicates spoken codes during live events.

## QR Code Accessibility
- **Decision**: Render QR codes using `qrcode.react`, provide high-contrast foreground/background, include textual join code + short URL, and ensure 300px minimum size on venue display.
- **Rationale**: Supports ADA guidance for colour contrast and ensures readability from a distance.
- **Alternatives Considered**:
  - *Image asset export*: Less flexible for dynamic code updates.
  - *Canvas-only without text fallback*: Fails accessibility compliance.

## Pacing Analytics Retention
- **Decision**: Store pacing metrics in Supabase `event_metrics` during gameplay and schedule edge function `purge_event_metrics(event_id)` on event completion to delete records.
- **Rationale**: Satisfies FR-017 retention constraint while enabling live dashboards during the session.
- **Alternatives Considered**:
  - *Persistent historical store*: Conflicts with clarified requirement to drop data post-event.
  - *Pure client aggregation*: Makes it difficult for host to review pacing during live control.

---
*Research completed 2025-09-28*
