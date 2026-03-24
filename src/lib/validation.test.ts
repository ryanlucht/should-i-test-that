/**
 * Validation Schema Tests
 *
 * Tests for the experiment design validation schema, specifically:
 * - Horizon validation (testDurationDays + decisionLatencyDays <= 365)
 * - Cross-field error placement on both fields when horizon is exceeded
 * - Boundary conditions (exactly 365, just over 365)
 */

import { describe, it, expect } from 'vitest';
import { experimentDesignSchema } from './validation';

/**
 * Helper to build valid experiment design data.
 * All fields are valid defaults; tests override specific fields.
 */
const validData = {
  testDurationDays: 14,
  dailyTraffic: 5000,
  trafficSplit: 50,
  eligibilityFraction: 100,
  decisionLatencyDays: 7,
};

describe('experimentDesignSchema', () => {
  describe('basic field validation', () => {
    it('accepts valid experiment design data', () => {
      const result = experimentDesignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects negative test duration', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer test duration', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 14.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('horizon validation (testDurationDays + decisionLatencyDays <= 365)', () => {
    it('rejects when sum exceeds 365 days (300 + 100 = 400)', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 300,
        decisionLatencyDays: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have error messages mentioning the horizon
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes('cannot exceed 365'))).toBe(true);
      }
    });

    it('accepts when sum is within 365 days (200 + 100 = 300)', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 200,
        decisionLatencyDays: 100,
      });
      expect(result.success).toBe(true);
    });

    it('accepts when sum is exactly 365 days (300 + 65 = 365, boundary)', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 300,
        decisionLatencyDays: 65,
      });
      expect(result.success).toBe(true);
    });

    it('rejects when sum is 366 days (just over boundary)', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 300,
        decisionLatencyDays: 66,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('cross-field error placement', () => {
    it('attaches horizon error to BOTH testDurationDays and decisionLatencyDays', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 300,
        decisionLatencyDays: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Extract paths from all issues
        const paths = result.error.issues.map((i) => i.path.join('.'));

        // Both fields should have the horizon error
        expect(paths).toContain('testDurationDays');
        expect(paths).toContain('decisionLatencyDays');

        // Both should have the same message
        const horizonIssues = result.error.issues.filter(
          (i) => i.message.includes('cannot exceed 365')
        );
        expect(horizonIssues).toHaveLength(2);
        expect(horizonIssues[0].message).toBe(horizonIssues[1].message);
      }
    });

    it('does not produce horizon errors when sum is within bounds', () => {
      const result = experimentDesignSchema.safeParse({
        ...validData,
        testDurationDays: 100,
        decisionLatencyDays: 50,
      });
      expect(result.success).toBe(true);
    });
  });
});
