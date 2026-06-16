import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency } from '../utils/currency';

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    const result = formatCurrency(1000);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('1,000');
  });

  it('formats decimals', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1,234');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBeDefined();
    expect(formatCurrency(0).length).toBeGreaterThan(0);
  });
});

describe('parseCurrency', () => {
  it('parses simple number string', () => {
    expect(parseCurrency('1000')).toBe(1000);
  });

  it('parses with commas', () => {
    expect(parseCurrency('1,234.56')).toBe(1234.56);
  });
});
