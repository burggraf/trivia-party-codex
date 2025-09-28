# Realtime Payload Contracts

## Channel Naming
- Host control and player devices subscribe to `realtime:events:{event_id}` broadcast channel.
- Venue display subscribes to `realtime:events:{event_id}:display` for scoreboard-focused payloads.

## Message Envelope
```json
{
  "type": "question|score|system",
  "eventId": "{uuid}",
  "roundIndex": 0,
  "questionIndex": 2,
  "timestamp": "2025-09-28T18:45:12.350Z",
  "payload": { /* type-specific schema */ }
}
```

### Question Payload (`type = "question"`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| questionId | uuid | ✅ | Matches `questions.id` |
| category | string | ✅ | Display name |
| prompt | string | ✅ | Markdown safe text |
| options | array<string> | ✅ | Shuffled answers |
| revealsAt | timestamptz | ✅ | Host reveal timestamp |

### Score Payload (`type = "score"`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| leaderboard | array<object> | ✅ | Sorted descending by score |
| leaderboard[].teamId | uuid | ✅ | |
| leaderboard[].teamName | string | ✅ | |
| leaderboard[].score | integer | ✅ | |
| leaderboard[].delta | integer | ✅ | Points gained this question |
| highlights | object | ✅ | `{ "topTeam": uuid, "ties": uuid[] }` |

### System Payload (`type = "system"`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| status | string | ✅ | `paused`, `resumed`, `ended` |
| reason | string | optional | e.g., `realtime_disconnect` |
| resumeToken | string | optional | Used to resynchronise clients |

## Heartbeat
- Host publishes heartbeat every 2 seconds: `{ "type": "system", "status": "heartbeat", "timestamp": ... }`.
- Clients mark session stale after 5s without heartbeat and show reconnect banner.

## Error Handling
- Channel errors surface via `type="system"` payloads with `status="paused"` and `reason="realtime_disconnect"`.
- On reconnect, clients request latest `BroadcastSnapshot` via REST to rebuild state before resuming.

---
