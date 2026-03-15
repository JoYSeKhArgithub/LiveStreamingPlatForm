import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB and dependencies before importing service
vi.mock('../db/db.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock('../db/schema.js', () => ({
  matches: {},
}));

vi.mock('../utils/matchStatus.js', () => ({
  getMatchStatus: vi.fn(),
}));

// drizzle-orm desc mock
vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
}));

import matchService from './match.service.js';
import { db } from '../db/db.js';
import { getMatchStatus } from '../utils/matchStatus.js';

describe('matchService.createMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a new match and returns the created event', async () => {
    const inputData = {
      sport: 'football',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2025-01-01T10:00:00.000Z',
      endTime: '2025-01-01T12:00:00.000Z',
    };
    const expectedEvent = { id: 1, ...inputData, status: 'scheduled' };

    getMatchStatus.mockReturnValue('scheduled');
    const returningMock = vi.fn().mockResolvedValue([expectedEvent]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    db.insert.mockReturnValue({ values: valuesMock });

    const result = await matchService.createMatch(inputData);

    expect(db.insert).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: 'football',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        status: 'scheduled',
        startTime: expect.any(Date),
        endTime: expect.any(Date),
      })
    );
    expect(result).toEqual(expectedEvent);
  });

  it('converts startTime and endTime strings to Date objects', async () => {
    const inputData = {
      sport: 'basketball',
      homeTeam: 'Bulls',
      awayTeam: 'Lakers',
      startTime: '2025-06-01T14:00:00.000Z',
      endTime: '2025-06-01T16:00:00.000Z',
    };

    getMatchStatus.mockReturnValue('scheduled');
    const returningMock = vi.fn().mockResolvedValue([{ id: 2, ...inputData }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    db.insert.mockReturnValue({ values: valuesMock });

    await matchService.createMatch(inputData);

    const insertedValues = valuesMock.mock.calls[0][0];
    expect(insertedValues.startTime).toBeInstanceOf(Date);
    expect(insertedValues.endTime).toBeInstanceOf(Date);
    expect(insertedValues.startTime.toISOString()).toBe('2025-06-01T14:00:00.000Z');
    expect(insertedValues.endTime.toISOString()).toBe('2025-06-01T16:00:00.000Z');
  });

  it('calls getMatchStatus with startTime and endTime to determine status', async () => {
    const inputData = {
      sport: 'tennis',
      homeTeam: 'Player A',
      awayTeam: 'Player B',
      startTime: '2020-01-01T10:00:00.000Z',
      endTime: '2020-01-01T12:00:00.000Z',
    };

    getMatchStatus.mockReturnValue('finished');
    const returningMock = vi.fn().mockResolvedValue([{ id: 3, status: 'finished' }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    db.insert.mockReturnValue({ values: valuesMock });

    await matchService.createMatch(inputData);

    expect(getMatchStatus).toHaveBeenCalledWith(inputData.startTime, inputData.endTime);
    const insertedValues = valuesMock.mock.calls[0][0];
    expect(insertedValues.status).toBe('finished');
  });

  it('propagates DB errors', async () => {
    getMatchStatus.mockReturnValue('scheduled');
    const returningMock = vi.fn().mockRejectedValue(new Error('DB error'));
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    db.insert.mockReturnValue({ values: valuesMock });

    const inputData = {
      sport: 'football',
      homeTeam: 'A',
      awayTeam: 'B',
      startTime: '2025-01-01T10:00:00.000Z',
      endTime: '2025-01-01T12:00:00.000Z',
    };

    await expect(matchService.createMatch(inputData)).rejects.toThrow('DB error');
  });
});

describe('matchService.getMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of matches ordered by createdAt descending with given limit', async () => {
    const mockMatches = [
      { id: 2, sport: 'football' },
      { id: 1, sport: 'basketball' },
    ];

    const limitMock = vi.fn().mockResolvedValue(mockMatches);
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    db.select.mockReturnValue({ from: fromMock });

    const result = await matchService.getMatch(10);

    expect(db.select).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(result).toEqual(mockMatches);
  });

  it('returns empty array when no matches exist', async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    db.select.mockReturnValue({ from: fromMock });

    const result = await matchService.getMatch(50);

    expect(result).toEqual([]);
  });

  it('passes the limit parameter to the query', async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    db.select.mockReturnValue({ from: fromMock });

    await matchService.getMatch(25);

    expect(limitMock).toHaveBeenCalledWith(25);
  });

  it('propagates DB errors', async () => {
    const limitMock = vi.fn().mockRejectedValue(new Error('select failed'));
    const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
    db.select.mockReturnValue({ from: fromMock });

    await expect(matchService.getMatch(10)).rejects.toThrow('select failed');
  });
});