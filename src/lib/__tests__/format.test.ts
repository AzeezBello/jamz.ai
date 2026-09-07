import { describe, expect, it } from 'vitest';
import { formatCount, formatDuration, formatMoney } from '../format';

describe('formatDuration', () => {
  it('pads seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('survives NaN from an audio element with no metadata yet', () => {
    expect(formatDuration(NaN)).toBe('0:00');
  });

  it('survives a negative value', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });
});

describe('formatCount', () => {
  it('abbreviates thousands', () => {
    expect(formatCount(1500)).toBe('1.5K');
  });

  it('abbreviates millions', () => {
    expect(formatCount(2_400_000)).toBe('2.4M');
  });

  it('leaves small numbers alone', () => {
    expect(formatCount(42)).toBe('42');
  });
});

describe('formatMoney', () => {
  it('drops cents on whole amounts', () => {
    expect(formatMoney(800)).toBe('$8');
  });

  it('keeps cents when they are non-zero', () => {
    expect(formatMoney(799)).toBe('$7.99');
  });
});
