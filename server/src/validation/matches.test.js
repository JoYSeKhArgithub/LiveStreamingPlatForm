import { describe, it, expect } from 'vitest';
import {
  listMatchesQuerySchema,
  createMatchSchema,
  matchIdParamSchema,
  updateScoreSchema,
  MATCH_STATUS,
} from './matches.js';

describe('MATCH_STATUS', () => {
  it('has the correct values', () => {
    expect(MATCH_STATUS.SCHEDULED).toBe('scheduled');
    expect(MATCH_STATUS.LIVE).toBe('live');
    expect(MATCH_STATUS.FINISHED).toBe('finished');
  });
});

describe('listMatchesQuerySchema', () => {
  it('accepts a valid limit', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(10);
  });

  it('coerces string limit to number', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: '25' });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(25);
  });

  it('accepts missing limit (optional)', () => {
    const result = listMatchesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.limit).toBeUndefined();
  });

  it('rejects limit of 0 (not positive)', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts limit of exactly 100', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(100);
  });

  it('rejects negative limit', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('matchIdParamSchema', () => {
  it('accepts a positive integer id', () => {
    const result = matchIdParamSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(1);
  });

  it('coerces string id to number', () => {
    const result = matchIdParamSchema.safeParse({ id: '42' });
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(42);
  });

  it('rejects id of 0', () => {
    const result = matchIdParamSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative id', () => {
    const result = matchIdParamSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer id', () => {
    const result = matchIdParamSchema.safeParse({ id: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = matchIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('createMatchSchema', () => {
  const validData = {
    sport: 'football',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    startTime: '2025-01-01T10:00:00.000Z',
    endTime: '2025-01-01T12:00:00.000Z',
  };

  it('accepts valid minimal data', () => {
    const result = createMatchSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts valid data with optional scores', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      homeScore: 2,
      awayScore: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data.homeScore).toBe(2);
    expect(result.data.awayScore).toBe(1);
  });

  it('coerces score strings to numbers', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      homeScore: '3',
      awayScore: '0',
    });
    expect(result.success).toBe(true);
    expect(result.data.homeScore).toBe(3);
    expect(result.data.awayScore).toBe(0);
  });

  it('rejects empty sport', () => {
    const result = createMatchSchema.safeParse({ ...validData, sport: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty homeTeam', () => {
    const result = createMatchSchema.safeParse({ ...validData, homeTeam: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty awayTeam', () => {
    const result = createMatchSchema.safeParse({ ...validData, awayTeam: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startTime format', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      startTime: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid endTime format', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      endTime: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects endTime equal to startTime', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      startTime: '2025-01-01T10:00:00.000Z',
      endTime: '2025-01-01T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
    const issues = result.error.issues;
    const endTimeIssue = issues.find(i => i.path.includes('endTime'));
    expect(endTimeIssue).toBeDefined();
    expect(endTimeIssue.message).toBe('endTime must be chronologically after startTime');
  });

  it('rejects endTime before startTime', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      startTime: '2025-01-01T12:00:00.000Z',
      endTime: '2025-01-01T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
    const endTimeIssue = result.error.issues.find(i => i.path.includes('endTime'));
    expect(endTimeIssue).toBeDefined();
  });

  it('rejects negative homeScore', () => {
    const result = createMatchSchema.safeParse({ ...validData, homeScore: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative awayScore', () => {
    const result = createMatchSchema.safeParse({ ...validData, awayScore: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer homeScore', () => {
    const result = createMatchSchema.safeParse({ ...validData, homeScore: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts score of 0', () => {
    const result = createMatchSchema.safeParse({
      ...validData,
      homeScore: 0,
      awayScore: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = createMatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects missing startTime', () => {
    const { startTime, ...rest } = validData;
    const result = createMatchSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing endTime', () => {
    const { endTime, ...rest } = validData;
    const result = createMatchSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('updateScoreSchema', () => {
  it('accepts valid scores', () => {
    const result = updateScoreSchema.safeParse({ homeScore: 2, awayScore: 1 });
    expect(result.success).toBe(true);
    expect(result.data.homeScore).toBe(2);
    expect(result.data.awayScore).toBe(1);
  });

  it('accepts zero scores', () => {
    const result = updateScoreSchema.safeParse({ homeScore: 0, awayScore: 0 });
    expect(result.success).toBe(true);
  });

  it('coerces string scores to numbers', () => {
    const result = updateScoreSchema.safeParse({ homeScore: '3', awayScore: '2' });
    expect(result.success).toBe(true);
    expect(result.data.homeScore).toBe(3);
    expect(result.data.awayScore).toBe(2);
  });

  it('rejects negative homeScore', () => {
    const result = updateScoreSchema.safeParse({ homeScore: -1, awayScore: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative awayScore', () => {
    const result = updateScoreSchema.safeParse({ homeScore: 0, awayScore: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer scores', () => {
    const result = updateScoreSchema.safeParse({ homeScore: 1.5, awayScore: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects missing homeScore', () => {
    const result = updateScoreSchema.safeParse({ awayScore: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects missing awayScore', () => {
    const result = updateScoreSchema.safeParse({ homeScore: 1 });
    expect(result.success).toBe(false);
  });
});