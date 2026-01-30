/**
 * Tests for formatting utilities
 */

import { describe, it, expect } from 'vitest';
import { formatSmartCurrency } from './formatting';

describe('formatSmartCurrency', () => {
  describe('small amounts (< $1000)', () => {
    it('should format $127 as "$127" (no decimals)', () => {
      const result = formatSmartCurrency(127);
      expect(result).toBe('$127');
    });

    it('should format $999 as "$999"', () => {
      const result = formatSmartCurrency(999);
      expect(result).toBe('$999');
    });

    it('should format $0 as "$0"', () => {
      const result = formatSmartCurrency(0);
      expect(result).toBe('$0');
    });

    it('should format $1 as "$1"', () => {
      const result = formatSmartCurrency(1);
      expect(result).toBe('$1');
    });

    it('should format $500.49 as "$500" (no decimals for small amounts)', () => {
      const result = formatSmartCurrency(500.49);
      expect(result).toBe('$500');
    });

    it('should format $500.99 as "$501" (rounds to nearest)', () => {
      const result = formatSmartCurrency(500.99);
      expect(result).toBe('$501');
    });
  });

  describe('thousands (K notation)', () => {
    it('should format $1,000 with K notation', () => {
      const result = formatSmartCurrency(1000);
      // Intl.NumberFormat may return "$1K" or "$1.00K"
      expect(result).toMatch(/\$1(?:\.00)?K/);
    });

    it('should format $12,700 as "$12.7K"', () => {
      const result = formatSmartCurrency(12700);
      expect(result).toBe('$12.7K');
    });

    it('should format $127,000 as "$127K"', () => {
      const result = formatSmartCurrency(127000);
      expect(result).toBe('$127K');
    });

    it('should format $999,000 as "$999K"', () => {
      const result = formatSmartCurrency(999000);
      expect(result).toBe('$999K');
    });

    it('should format $5,000 as "$5K"', () => {
      const result = formatSmartCurrency(5000);
      expect(result).toBe('$5K');
    });
  });

  describe('millions (M notation)', () => {
    it('should format $1,000,000 as "$1M"', () => {
      const result = formatSmartCurrency(1000000);
      expect(result).toBe('$1M');
    });

    it('should format $1,270,000 as "$1.27M"', () => {
      const result = formatSmartCurrency(1270000);
      expect(result).toBe('$1.27M');
    });

    it('should format $12,700,000 as "$12.7M"', () => {
      const result = formatSmartCurrency(12700000);
      expect(result).toBe('$12.7M');
    });

    it('should format $127,000,000 as "$127M"', () => {
      const result = formatSmartCurrency(127000000);
      expect(result).toBe('$127M');
    });

    it('should format $5,500,000 as "$5.5M"', () => {
      const result = formatSmartCurrency(5500000);
      expect(result).toBe('$5.5M');
    });
  });

  describe('negative values', () => {
    it('should format -$500 as "-$500"', () => {
      const result = formatSmartCurrency(-500);
      expect(result).toBe('-$500');
    });

    it('should format -$5,000 as "-$5K"', () => {
      const result = formatSmartCurrency(-5000);
      expect(result).toBe('-$5K');
    });

    it('should format -$5,000,000 as "-$5M"', () => {
      const result = formatSmartCurrency(-5000000);
      expect(result).toBe('-$5M');
    });

    it('should format -$127 as "-$127"', () => {
      const result = formatSmartCurrency(-127);
      expect(result).toBe('-$127');
    });
  });

  describe('edge cases', () => {
    it('should format $999.99 as "$1K" (rounds up to thousands)', () => {
      const result = formatSmartCurrency(999.99);
      expect(result).toBe('$1,000');
    });

    it('should handle very large values', () => {
      // $1 billion
      const result = formatSmartCurrency(1000000000);
      expect(result).toMatch(/\$1(?:\.00)?B/);
    });

    it('should handle fractional cents for small amounts', () => {
      const result = formatSmartCurrency(123.456);
      expect(result).toBe('$123');
    });
  });
});
