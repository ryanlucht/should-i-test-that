import { describe, it, expect } from 'vitest';
import {
  calculateRevenuePerPercentagePoint,
  calculateTotalRevenue,
  calculateConversionImpact,
  type RevenueCalculatorInputs,
} from './revenueCalculator';

describe('Revenue Calculator', () => {
  describe('calculateRevenuePerPercentagePoint', () => {
    it('calculates revenue per 1% relative change correctly', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.05, // 5%
        averageOrderValue: 100,
        annualTraffic: 1_000_000,
      };

      const result = calculateRevenuePerPercentagePoint(inputs);

      // 1M × (0.05 × 0.01) × $100 = $50,000
      expect(result).toBe(50_000);
    });

    it('handles different AOV values', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.03,
        averageOrderValue: 50,
        annualTraffic: 500_000,
      };

      const result = calculateRevenuePerPercentagePoint(inputs);

      // 500K × (0.03 × 0.01) × $50 = $7,500
      expect(result).toBe(7_500);
    });

    it('handles zero traffic', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.05,
        averageOrderValue: 100,
        annualTraffic: 0,
      };

      const result = calculateRevenuePerPercentagePoint(inputs);
      expect(result).toBe(0);
    });

    it('handles zero AOV', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.05,
        averageOrderValue: 0,
        annualTraffic: 1_000_000,
      };

      const result = calculateRevenuePerPercentagePoint(inputs);
      expect(result).toBe(0);
    });

    it('handles large traffic volumes', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.02,
        averageOrderValue: 200,
        annualTraffic: 10_000_000,
      };

      const result = calculateRevenuePerPercentagePoint(inputs);

      // 10M × (0.02 × 0.01) × $200 = $400,000
      expect(result).toBe(400_000);
    });
  });

  describe('calculateTotalRevenue', () => {
    it('calculates total baseline revenue', () => {
      const result = calculateTotalRevenue(
        0.05,        // 5% conversion
        100,         // $100 AOV
        1_000_000    // 1M visitors
      );

      // 1M × 0.05 × $100 = $5,000,000
      expect(result).toBe(5_000_000);
    });

    it('handles 100% conversion rate', () => {
      const result = calculateTotalRevenue(
        1.0,         // 100% conversion
        50,          // $50 AOV
        100_000      // 100K visitors
      );

      // 100K × 1.0 × $50 = $5,000,000
      expect(result).toBe(5_000_000);
    });

    it('handles very low conversion rates', () => {
      const result = calculateTotalRevenue(
        0.001,       // 0.1% conversion
        1000,        // $1000 AOV
        1_000_000    // 1M visitors
      );

      // 1M × 0.001 × $1000 = $1,000,000
      expect(result).toBe(1_000_000);
    });
  });

  describe('calculateConversionImpact', () => {
    const inputs: RevenueCalculatorInputs = {
      baselineConversionRate: 0.05,
      averageOrderValue: 100,
      annualTraffic: 1_000_000,
    };

    it('calculates positive impact', () => {
      const result = calculateConversionImpact(2, inputs);

      // 2% relative × $50K per 1% relative = $100K
      expect(result).toBe(100_000);
    });

    it('calculates negative impact', () => {
      const result = calculateConversionImpact(-1, inputs);

      // -1% relative × $50K per 1% relative = -$50K
      expect(result).toBe(-50_000);
    });

    it('handles fractional relative percentages', () => {
      const result = calculateConversionImpact(0.5, inputs);

      // 0.5% relative × $50K per 1% relative = $25K
      expect(result).toBe(25_000);
    });

    it('handles zero change', () => {
      const result = calculateConversionImpact(0, inputs);
      expect(result).toBe(0);
    });

    it('calculates large changes correctly', () => {
      const result = calculateConversionImpact(10, inputs);

      // 10% relative × $50K per 1% relative = $500K
      expect(result).toBe(500_000);
    });
  });

  describe('Real-world scenarios', () => {
    it('e-commerce site with typical metrics', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.03,  // 3% conversion
        averageOrderValue: 75,
        annualTraffic: 2_000_000,      // 2M visitors/year
      };

      const revenuePerPoint = calculateRevenuePerPercentagePoint(inputs);
      const totalRevenue = calculateTotalRevenue(
        inputs.baselineConversionRate,
        inputs.averageOrderValue,
        inputs.annualTraffic
      );

      expect(revenuePerPoint).toBe(45_000);  // $45K per 1% relative change
      expect(totalRevenue).toBe(4_500_000);      // $4.5M baseline
    });

    it('SaaS site with low conversion, high AOV', () => {
      const inputs: RevenueCalculatorInputs = {
        baselineConversionRate: 0.005,  // 0.5% conversion
        averageOrderValue: 2000,        // $2K annual subscription
        annualTraffic: 500_000,
      };

      const revenuePerPoint = calculateRevenuePerPercentagePoint(inputs);
      const totalRevenue = calculateTotalRevenue(
        inputs.baselineConversionRate,
        inputs.averageOrderValue,
        inputs.annualTraffic
      );

      expect(revenuePerPoint).toBe(50_000);  // $50K per 1% relative change
      expect(totalRevenue).toBe(5_000_000);       // $5M baseline
    });
  });
});
