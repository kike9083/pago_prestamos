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

  it('calculates interest for 1 fortnight when paying on 13th, 14th, 15th, 17th of next quincena', () => {
    // Last payment on end of August (2024-08-30, Aug Q2)
    // Next payment on Sept 14 (Sep Q1) -> exactly 1 quincena
    const res14 = calculateInterestDue(1000, 10, '2024-08-30', '2024-01-01', '2024-09-14');
    expect(res14.fortnights).toBe(1);
    expect(res14.interest).toBe(100);

    // Next payment on Sept 17 (Sep Q1 window) -> exactly 1 quincena
    const res17 = calculateInterestDue(1000, 10, '2024-08-30', '2024-01-01', '2024-09-17');
    expect(res17.fortnights).toBe(1);
    expect(res17.interest).toBe(100);

    // Next payment on Sept 19 (past 17th/18th, entering Sep Q2) -> 2 quincenas
    const res19 = calculateInterestDue(1000, 10, '2024-08-30', '2024-01-01', '2024-09-19');
    expect(res19.fortnights).toBe(2);
    expect(res19.interest).toBe(200);
  });

  it('calculates 1 fortnight when paying end of month (28th-30th) or early next month (1st-5th)', () => {
    // Last payment on Sept 15 (Sep Q1)
    // Next payment on Sept 30 (Sep Q2) -> 1 quincena
    const res30 = calculateInterestDue(1000, 10, '2024-09-15', '2024-01-01', '2024-09-30');
    expect(res30.fortnights).toBe(1);

    // Next payment on Oct 2 (grace period for Sep Q2) -> 1 quincena
    const resOct2 = calculateInterestDue(1000, 10, '2024-09-15', '2024-01-01', '2024-10-02');
    expect(resOct2.fortnights).toBe(1);
  });
});

describe('toYYYYMMDD', () => {
  it('formats date correctly', () => {
    expect(toYYYYMMDD(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(toYYYYMMDD(new Date(2024, 11, 25))).toBe('2024-12-25');
  });
});
