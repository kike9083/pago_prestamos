import { describe, it, expect } from 'vitest';
import { calculateSuggestedPayment, calculateInterestDue, toYYYYMMDD } from '../utils/amortization';

describe('calculateSuggestedPayment', () => {
  it('returns 0 for zero principal', () => {
    expect(calculateSuggestedPayment(0, 10, 12)).toBe(0);
  });

  it('returns 0 for zero term', () => {
    expect(calculateSuggestedPayment(10000, 10, 0)).toBe(0);
  });

  it('returns principal / term for zero rate', () => {
    expect(calculateSuggestedPayment(12000, 0, 12)).toBe(1000);
  });

  it('calculates correctly for standard loan', () => {
    const result = calculateSuggestedPayment(10000, 5, 12);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10000);
  });
});

describe('calculateInterestDue', () => {
  it('returns zero for zero balance', () => {
    const result = calculateInterestDue(0, 10, null, '2024-01-01', '2024-01-15');
    expect(result.interest).toBe(0);
    expect(result.fortnights).toBe(0);
  });

  it('returns zero when payment is before last activity', () => {
    const result = calculateInterestDue(1000, 10, '2024-02-01', '2024-01-01', '2024-01-15');
    expect(result.interest).toBe(0);
  });

  it('calculates interest for 1 fortnight', () => {
    const result = calculateInterestDue(1000, 10, null, '2024-01-01', '2024-01-16');
    expect(result.fortnights).toBeGreaterThanOrEqual(1);
    expect(result.interest).toBeGreaterThan(0);
  });

  it('returns 0 interest for first payment on start date', () => {
    const result = calculateInterestDue(1000, 10, null, '2024-01-01', '2024-01-01');
    expect(result.interest).toBe(0);
    expect(result.fortnights).toBe(0);
  });
});

describe('toYYYYMMDD', () => {
  it('formats date correctly', () => {
    expect(toYYYYMMDD(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toYYYYMMDD(new Date(2024, 11, 25))).toBe('2024-12-25');
  });
});
