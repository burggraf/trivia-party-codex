import { describe, expect, test } from 'vitest';
import { validateIssueJoinCodeResponse } from '../../src/contracts/issueJoinCode';

describe('issue_join_code edge function contract', () => {
  test('accepts valid join code payloads', () => {
    const payload = {
      join_code: 'ABC123',
      expires_at: '2025-12-31T23:59:59.000Z'
    };

    expect(() => validateIssueJoinCodeResponse(payload)).not.toThrow();
  });

  test('rejects payloads with invalid code length or shape', () => {
    const payload = {
      join_code: 'abc123',
      expires_at: '2025-12-31T23:59:59.000Z'
    };

    expect(() => validateIssueJoinCodeResponse(payload)).toThrowError();
  });
});
