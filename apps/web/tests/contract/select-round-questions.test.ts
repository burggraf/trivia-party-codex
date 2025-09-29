import { describe, expect, test } from 'vitest';
import { validateSelectRoundQuestionsResponse } from '../../src/contracts/selectRoundQuestions';

describe('select_round_questions RPC contract', () => {
  test('accepts unique question identifiers that match schema', () => {
    const payload = {
      question_ids: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ]
    };

    expect(() => validateSelectRoundQuestionsResponse(payload)).not.toThrow();
  });

  test('rejects duplicate question identifiers in response payload', () => {
    const payload = {
      question_ids: [
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      ]
    };

    expect(() => validateSelectRoundQuestionsResponse(payload)).toThrowError();
  });
});
