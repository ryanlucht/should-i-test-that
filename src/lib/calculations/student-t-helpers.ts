/**
 * Shared Student-t quantile helpers.
 *
 * Centralizes all Student-t quantile computation to avoid drift
 * from hardcoded constants scattered across files.
 *
 * Per ENG-01, ENG-02, ENG-10, ENG-11: All files that need Student-t
 * quantile bounds (chart-data.ts, evsi.ts, PriorDistributionChart.tsx)
 * import from here instead of calling jStat.studentt.inv directly.
 *
 * Mathematical basis (for statistician audit):
 * - Location-scale Student-t: if Z ~ t(df), then X = mu + scale * Z
 * - Quantile: P(X <= mu + scale * t_inv(p, df)) = p
 * - 90% interval: [mu + scale * t_inv(0.05, df), mu + scale * t_inv(0.95, df)]
 */
import jStat from 'jstat';

/**
 * Compute symmetric quantile bounds for a location-scale Student-t.
 *
 * Uses jStat.studentt.inv(p, df) for the standard t-quantile function.
 * Falls back to Normal-like 4*sigma bounds if df is invalid.
 *
 * @param mu - location parameter (center of distribution)
 * @param scale - scale parameter (sigma_L for Student-t)
 * @param df - degrees of freedom (must be > 0)
 * @param lowerP - lower quantile probability (e.g. 0.005 for 0.5th percentile)
 * @param upperP - upper quantile probability (e.g. 0.995 for 99.5th percentile)
 * @returns { low, high } bounds at the specified quantiles
 */
export function studentTQuantileBounds(
  mu: number,
  scale: number,
  df: number,
  lowerP: number,
  upperP: number
): { low: number; high: number } {
  // Guard: df must be positive and finite (addresses Codex df guardrail concern)
  if (df <= 0 || !isFinite(df)) {
    // Safe fallback: use Normal-like 4-sigma bounds
    return { low: mu - 4 * scale, high: mu + 4 * scale };
  }
  return {
    // low = mu + scale * t_inv(lowerP, df), where t_inv(lowerP) is negative
    low: mu + scale * jStat.studentt.inv(lowerP, df),
    // high = mu + scale * t_inv(upperP, df), where t_inv(upperP) is positive
    high: mu + scale * jStat.studentt.inv(upperP, df),
  };
}

/**
 * Compute 90% credible interval for a location-scale Student-t.
 *
 * Convenience wrapper for the most common quantile pair (5th and 95th percentiles).
 * This is the interval displayed on the chart and used for shading.
 *
 * Mathematical formula:
 *   low = mu + scale * t_inv(0.05, df)
 *   high = mu + scale * t_inv(0.95, df)
 *
 * @param mu - location parameter
 * @param scale - scale parameter
 * @param df - degrees of freedom
 * @returns { low, high } for the 90% credible interval
 */
export function studentTInterval(
  mu: number,
  scale: number,
  df: number
): { low: number; high: number } {
  return studentTQuantileBounds(mu, scale, df, 0.05, 0.95);
}
