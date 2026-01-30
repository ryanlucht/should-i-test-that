/**
 * Input Formatting Utilities
 *
 * Uses native Intl.NumberFormat for locale-aware formatting.
 * Format on blur per CONTEXT.md decision: "Claude's discretion: formatting timing"
 *
 * Conversion utilities handle the UI (percentage 0-100) to internal (decimal 0-1)
 * transformation per SPEC.md Section 4.1:
 * "UI accepts percent (e.g., "3.2%"), convert to decimal (0.032)"
 */

/**
 * Format a number as US currency (e.g., $1,234.56)
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param value - Dollar amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as percentage with % suffix
 * Input is already in percentage form (e.g., 5 for 5%).
 *
 * @param value - Percentage value (0-100 scale)
 * @returns Formatted string with % suffix (e.g., "5.25%")
 */
export function formatPercentage(value: number): string {
  // Round to reasonable precision to avoid floating point display issues
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
}

/**
 * Format a number with thousand separators (e.g., 1,234,567)
 *
 * @param value - Number to format
 * @returns Formatted number string with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Parse a currency string into a number
 * Strips all non-numeric characters except decimal point and minus.
 *
 * @param value - String to parse (e.g., "$1,234.56" or "1234.56")
 * @returns Parsed number or null if invalid
 */
export function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a percentage string into a number
 * Strips all non-numeric characters except decimal point and minus.
 *
 * @param value - String to parse (e.g., "5.25%" or "5.25")
 * @returns Parsed number (in percentage form, e.g., 5.25) or null if invalid
 */
export function parsePercentage(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a number string into a number
 * Strips all non-numeric characters except decimal point and minus.
 *
 * @param value - String to parse (e.g., "1,234,567" or "1234567")
 * @returns Parsed number or null if invalid
 */
export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Convert percentage (5.0) to decimal (0.05)
 *
 * Used when storing form values to Zustand store.
 * Per SPEC.md Section 4.1: "UI accepts percent, convert to decimal"
 *
 * @param percent - Percentage value (0-100 scale)
 * @returns Decimal value (0-1 scale)
 */
export function percentToDecimal(percent: number): number {
  return percent / 100;
}

/**
 * Convert decimal (0.05) to percentage (5.0)
 *
 * Used when displaying stored values in form inputs.
 *
 * @param decimal - Decimal value (0-1 scale)
 * @returns Percentage value (0-100 scale)
 */
export function decimalToPercent(decimal: number): number {
  return decimal * 100;
}
