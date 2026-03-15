import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock matchService before importing controller
vi.mock('../services/match.service.js', () => ({
  default: {
    createMatch: vi.fn(),
    getMatch: vi.fn(),
  },
}));

import { createMatch, getmatches } from './match.controller.js';
import matchService from '../services/match.service.js';

const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const VALID_BODY = {
  sport: 'football',
  homeTeam: 'Team A',
  awayTeam: 'Team B',
  startTime: '2025-01-01T10:00:00.000Z',
  endTime: '2025-01-01T12:00:00.000Z',
};

describe('createMatch controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with data on successful creation', async () => {
    const createdMatch = { id: 1, ...VALID_BODY, status: 'scheduled' };
    matchService.createMatch.mockResolvedValue(createdMatch);

    const req = { body: VALID_BODY };
    const res = makeRes();

    await createMatch(req, res);

    expect(matchService.createMatch).toHaveBeenCalledWith(expect.objectContaining({
      sport: 'football',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: createdMatch });
  });

  it('returns 400 when request body is invalid (empty sport)', async () => {
    const req = { body: { ...VALID_BODY, sport: '' } };
    const res = makeRes();

    await createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.anything() })
    );
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it('returns 400 when request body is missing required fields', async () => {
    const req = { body: {} };
    const res = makeRes();

    await createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it('returns 400 when endTime is before startTime', async () => {
    const req = {
      body: {
        ...VALID_BODY,
        startTime: '2025-01-01T12:00:00.000Z',
        endTime: '2025-01-01T10:00:00.000Z',
      },
    };
    const res = makeRes();

    await createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(matchService.createMatch).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws an error', async () => {
    matchService.createMatch.mockRejectedValue(new Error('DB connection failed'));

    const req = { body: VALID_BODY };
    const res = makeRes();

    await createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to create match',
        details: 'DB connection failed',
      })
    );
  });

  it('passes validation error flatten object in 400 response', async () => {
    const req = { body: { ...VALID_BODY, homeTeam: '' } };
    const res = makeRes();

    await createMatch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.error).toBeDefined();
    expect(typeof jsonArg.error).toBe('object');
  });
});

describe('getmatches controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with match list when query is valid', async () => {
    const mockMatches = [{ id: 1, sport: 'football' }];
    matchService.getMatch.mockResolvedValue(mockMatches);

    const req = { query: { limit: '10' } };
    const res = makeRes();

    await getmatches(req, res);

    expect(matchService.getMatch).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ response: mockMatches });
  });

  it('uses default limit of 50 when limit not provided', async () => {
    matchService.getMatch.mockResolvedValue([]);

    const req = { query: {} };
    const res = makeRes();

    await getmatches(req, res);

    expect(matchService.getMatch).toHaveBeenCalledWith(50);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('caps limit at MAX_LIMIT (100) even if query says less than MAX_LIMIT', async () => {
    matchService.getMatch.mockResolvedValue([]);

    const req = { query: { limit: '100' } };
    const res = makeRes();

    await getmatches(req, res);

    expect(matchService.getMatch).toHaveBeenCalledWith(100);
  });

  it('returns 400 when limit is invalid (non-positive)', async () => {
    const req = { query: { limit: '-5' } };
    const res = makeRes();

    await getmatches(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid query' })
    );
    expect(matchService.getMatch).not.toHaveBeenCalled();
  });

  it('returns 400 when limit exceeds 100', async () => {
    const req = { query: { limit: '200' } };
    const res = makeRes();

    await getmatches(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(matchService.getMatch).not.toHaveBeenCalled();
  });

  it('returns 200 with empty array when no matches exist', async () => {
    matchService.getMatch.mockResolvedValue([]);

    const req = { query: {} };
    const res = makeRes();

    await getmatches(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ response: [] });
  });
});