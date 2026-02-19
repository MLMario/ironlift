import { formatVolume, formatWorkoutDate, formatDetailDate } from '@/lib/formatters';

describe('formatVolume', () => {
  it('returns raw number string for values below 1000', () => {
    expect(formatVolume(750)).toBe('750');
    expect(formatVolume(999)).toBe('999');
  });

  it('formats exact thousands with "k" suffix', () => {
    expect(formatVolume(1000)).toBe('1k');
    expect(formatVolume(5000)).toBe('5k');
  });

  it('formats decimal thousands with one decimal place', () => {
    expect(formatVolume(45200)).toBe('45.2k');
    expect(formatVolume(1500)).toBe('1.5k');
  });

  it('returns "0" for zero', () => {
    expect(formatVolume(0)).toBe('0');
  });
});

describe('formatWorkoutDate', () => {
  it('formats ISO date to "Mon D" format', () => {
    // Use a fixed date: Feb 5, 2026
    const result = formatWorkoutDate('2026-02-05T10:30:00Z');
    expect(result).toBe('Feb 5');
  });

  it('formats another date correctly', () => {
    // Use noon UTC to avoid timezone-related day shifts
    const result = formatWorkoutDate('2026-12-25T12:00:00Z');
    expect(result).toBe('Dec 25');
  });
});

describe('formatDetailDate', () => {
  it('formats ISO date to "Mon D, YYYY" format', () => {
    const result = formatDetailDate('2026-02-05T10:30:00Z');
    expect(result).toBe('Feb 5, 2026');
  });

  it('formats another date correctly', () => {
    // Use noon UTC to avoid timezone-related day shifts
    const result = formatDetailDate('2026-12-25T12:00:00Z');
    expect(result).toBe('Dec 25, 2026');
  });
});
