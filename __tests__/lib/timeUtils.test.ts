import { formatTime, parseTimeInput, clampSeconds } from '@/lib/timeUtils';

describe('formatTime', () => {
  it('formats seconds to M:SS', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(45)).toBe('0:45');
    expect(formatTime(0)).toBe('0:00');
  });

  it('clamps negative input to 0:00', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(-100)).toBe('0:00');
  });
});

describe('parseTimeInput', () => {
  it('parses plain seconds', () => {
    expect(parseTimeInput('90')).toBe(90);
    expect(parseTimeInput('0')).toBe(0);
  });

  it('parses M:SS format', () => {
    expect(parseTimeInput('1:30')).toBe(90);
    expect(parseTimeInput(':30')).toBe(30);
    expect(parseTimeInput('1:')).toBe(60);
  });

  it('returns null for empty or whitespace input', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput(' ')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseTimeInput('abc')).toBeNull();
  });
});

describe('clampSeconds', () => {
  it('clamps below minimum to min', () => {
    expect(clampSeconds(5, 10, 300)).toBe(10);
  });

  it('clamps above maximum to max', () => {
    expect(clampSeconds(500, 10, 300)).toBe(300);
  });

  it('returns value when within range', () => {
    expect(clampSeconds(60, 10, 300)).toBe(60);
  });

  it('returns min when value equals min', () => {
    expect(clampSeconds(10, 10, 300)).toBe(10);
  });

  it('returns max when value equals max', () => {
    expect(clampSeconds(300, 10, 300)).toBe(300);
  });
});
