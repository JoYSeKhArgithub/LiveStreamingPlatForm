import { describe, it, expect, vi } from 'vitest';
import { getMatchStatus, syncMatchStatus } from './matchStatus.js';
import { MATCH_STATUS } from '../validation/matches.js';

describe('getMatchStatus', () => {
  const START = '2025-06-01T10:00:00.000Z';
  const END = '2025-06-01T12:00:00.000Z';

  it('returns SCHEDULED when now is before startTime', () => {
    const now = new Date('2025-06-01T09:00:00.000Z');
    expect(getMatchStatus(START, END, now)).toBe(MATCH_STATUS.SCHEDULED);
  });

  it('returns LIVE when now is between startTime and endTime', () => {
    const now = new Date('2025-06-01T11:00:00.000Z');
    expect(getMatchStatus(START, END, now)).toBe(MATCH_STATUS.LIVE);
  });

  it('returns FINISHED when now is exactly at endTime', () => {
    const now = new Date(END);
    expect(getMatchStatus(START, END, now)).toBe(MATCH_STATUS.FINISHED);
  });

  it('returns FINISHED when now is after endTime', () => {
    const now = new Date('2025-06-01T13:00:00.000Z');
    expect(getMatchStatus(START, END, now)).toBe(MATCH_STATUS.FINISHED);
  });

  it('returns LIVE when now is exactly at startTime', () => {
    const now = new Date(START);
    expect(getMatchStatus(START, END, now)).toBe(MATCH_STATUS.LIVE);
  });

  it('returns null for invalid startTime', () => {
    expect(getMatchStatus('not-a-date', END, new Date())).toBeNull();
  });

  it('returns null for invalid endTime', () => {
    expect(getMatchStatus(START, 'not-a-date', new Date())).toBeNull();
  });

  it('returns null for both invalid times', () => {
    expect(getMatchStatus('invalid', 'invalid', new Date())).toBeNull();
  });

  it('accepts Date objects as startTime and endTime', () => {
    const start = new Date('2025-06-01T10:00:00.000Z');
    const end = new Date('2025-06-01T12:00:00.000Z');
    const now = new Date('2025-06-01T11:00:00.000Z');
    expect(getMatchStatus(start, end, now)).toBe(MATCH_STATUS.LIVE);
  });

  it('uses real current time when now is not provided', () => {
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(getMatchStatus(pastStart, pastEnd)).toBe(MATCH_STATUS.FINISHED);
  });

  it('returns SCHEDULED for a future match without injected now', () => {
    const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    expect(getMatchStatus(futureStart, futureEnd)).toBe(MATCH_STATUS.SCHEDULED);
  });
});

describe('syncMatchStatus', () => {
  const START = '2025-06-01T10:00:00.000Z';
  const END = '2025-06-01T12:00:00.000Z';

  it('calls updateStatus and updates match.status when status differs', async () => {
    const match = {
      startTime: START,
      endTime: END,
      status: MATCH_STATUS.SCHEDULED,
    };
    // Force a FINISHED status by using past times
    match.startTime = '2020-01-01T10:00:00.000Z';
    match.endTime = '2020-01-01T12:00:00.000Z';

    const updateStatus = vi.fn().mockResolvedValue(undefined);
    const result = await syncMatchStatus(match, updateStatus);

    expect(updateStatus).toHaveBeenCalledWith(MATCH_STATUS.FINISHED);
    expect(result).toBe(MATCH_STATUS.FINISHED);
    expect(match.status).toBe(MATCH_STATUS.FINISHED);
  });

  it('does not call updateStatus when status is already correct', async () => {
    const match = {
      startTime: '2020-01-01T10:00:00.000Z',
      endTime: '2020-01-01T12:00:00.000Z',
      status: MATCH_STATUS.FINISHED,
    };

    const updateStatus = vi.fn();
    const result = await syncMatchStatus(match, updateStatus);

    expect(updateStatus).not.toHaveBeenCalled();
    expect(result).toBe(MATCH_STATUS.FINISHED);
  });

  it('returns match.status unchanged when getMatchStatus returns null (invalid times)', async () => {
    const match = {
      startTime: 'invalid',
      endTime: 'invalid',
      status: MATCH_STATUS.SCHEDULED,
    };

    const updateStatus = vi.fn();
    const result = await syncMatchStatus(match, updateStatus);

    expect(updateStatus).not.toHaveBeenCalled();
    expect(result).toBe(MATCH_STATUS.SCHEDULED);
    expect(match.status).toBe(MATCH_STATUS.SCHEDULED);
  });

  it('updates match from SCHEDULED to LIVE for a running match', async () => {
    const past = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const match = {
      startTime: past,
      endTime: future,
      status: MATCH_STATUS.SCHEDULED,
    };

    const updateStatus = vi.fn().mockResolvedValue(undefined);
    const result = await syncMatchStatus(match, updateStatus);

    expect(updateStatus).toHaveBeenCalledWith(MATCH_STATUS.LIVE);
    expect(result).toBe(MATCH_STATUS.LIVE);
  });
});