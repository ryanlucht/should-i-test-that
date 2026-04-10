/**
 * URL Codec Module
 *
 * Encodes and decodes WizardInputs to/from compact base64url strings for
 * shareable walkthrough URLs. Encoded strings are placed after the "#s="
 * fragment in the URL.
 *
 * Encoding format:
 *   base64url(JSON({ v: SCHEMA_VERSION, <short-keys>: <values> }))
 *
 * Only non-null, non-default fields are included to minimize URL length.
 * Field names are mapped to 1-2 character short keys for compactness.
 *
 * Schema versioning: Every payload includes "v": SCHEMA_VERSION (integer).
 * When decoding a payload with an older version, a migration chain is run
 * to bring it up to the current schema before validation.
 */

import type { WizardInputs } from '@/types/wizard';
import { initialInputs } from '@/types/wizard';

// ---------------------------------------------------------------------------
// Short key mapping
// ---------------------------------------------------------------------------

// Short key mapping (keep this comment in sync with the map below):
// bc = baselineConversionRate    av = annualVisitors
// ul = visitorUnitLabel          vc = valuePerConversion
// pt = priorType                 pl = priorIntervalLow
// ph = priorIntervalHigh         ps = priorShape
// df = studentTDf                ts = thresholdScenario
// tu = thresholdUnit             tv = thresholdValue
// td = testDurationDays          dt = dailyTraffic
// sp = trafficSplit              ef = eligibilityFraction
// dl = decisionLatencyDays

/**
 * Maps full WizardInputs field names to compact 1-2 character short keys.
 * Shorter keys = shorter encoded URLs.
 */
export const SHORT_KEY_MAP: Record<keyof WizardInputs, string> = {
  baselineConversionRate: 'bc',
  annualVisitors: 'av',
  visitorUnitLabel: 'ul',
  valuePerConversion: 'vc',
  priorType: 'pt',
  priorIntervalLow: 'pl',
  priorIntervalHigh: 'ph',
  priorShape: 'ps',
  studentTDf: 'df',
  thresholdScenario: 'ts',
  thresholdUnit: 'tu',
  thresholdValue: 'tv',
  testDurationDays: 'td',
  dailyTraffic: 'dt',
  trafficSplit: 'sp',
  eligibilityFraction: 'ef',
  decisionLatencyDays: 'dl',
};

/**
 * Inverse of SHORT_KEY_MAP: maps short keys back to full field names.
 * Computed once at module load.
 */
const REVERSE_KEY_MAP: Record<string, keyof WizardInputs> = Object.fromEntries(
  Object.entries(SHORT_KEY_MAP).map(([full, short]) => [short, full as keyof WizardInputs])
);

// ---------------------------------------------------------------------------
// Schema versioning and migration
// ---------------------------------------------------------------------------

/**
 * Current schema version. Increment when the encoding format changes.
 * Every encoded payload includes "v": SCHEMA_VERSION.
 */
export const SCHEMA_VERSION = 2;

/**
 * Migration functions keyed by the FROM version.
 * MIGRATIONS[0] transforms a v0 payload into a v1 payload.
 * MIGRATIONS[1] would transform a v1 payload into a v2 payload, etc.
 *
 * Each migration receives the raw decoded object (with short keys still intact)
 * and returns a transformed object with the next version's structure.
 */
const MIGRATIONS: Record<number, (payload: Record<string, unknown>) => Record<string, unknown>> = {
  // v0 -> v1 migration scaffold.
  // v0 used the same short keys as v1; the only change is the version bump.
  0: (payload) => ({ ...payload, v: 1 }),
  // v1 -> v2 migration: identity (same data structure; only validation tightened)
  1: (payload) => ({ ...payload, v: 2 }),
};

// ---------------------------------------------------------------------------
// Base64url helpers
// ---------------------------------------------------------------------------

/**
 * Encodes a string to base64url format (URL-safe, no padding).
 * Converts standard base64 (+, /) to URL-safe equivalents (-, _)
 * and strips trailing '=' padding.
 */
function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a base64url string back to a regular string.
 * Restores standard base64 characters before calling atob.
 * Returns null if the input is invalid base64.
 */
function fromBase64Url(input: string): string | null {
  try {
    // Restore standard base64 chars
    const standard = input.replace(/-/g, '+').replace(/_/g, '/');
    // Re-add padding: base64 length must be a multiple of 4
    // Padding needed = (4 - (length % 4)) % 4
    const paddingNeeded = (4 - (standard.length % 4)) % 4;
    const padded = standard + '='.repeat(paddingNeeded);
    return atob(padded);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Allowed values for string enum fields */
const ENUM_CONSTRAINTS = {
  priorType: ['default', 'custom'] as const,
  priorShape: ['normal', 'student-t', 'uniform'] as const,
  thresholdScenario: ['any-positive', 'minimum-lift', 'accept-loss'] as const,
  thresholdUnit: ['dollars', 'lift'] as const,
  studentTDf: [3, 5, 10] as const,
};

/**
 * Validates a decoded payload (full keys, post-migration, post-merge with initialInputs).
 *
 * Versioned validation strategy (addresses Codex review concern):
 * - v1 URLs use original loose rules to preserve backward compatibility
 * - v2+ URLs use tightened rules aligned with form validation
 * - This ensures previously shared links continue to work while
 *   new links enforce stricter domain constraints
 *
 * Validation rules:
 * - Numeric fields: typeof 'number' && Number.isFinite, or null
 * - Enum fields: one of allowed values, or null
 * - Domain constraints (version-aware):
 *   - baselineConversionRate: v1=[0, 1], v2+=(0, 1) (strict open interval)
 *   - trafficSplit: v1=(0, 1], v2+=[0.10, 0.90] (form-aligned bounds)
 *   - eligibilityFraction: (0, 1] (must be positive, at most 100%)
 *   - studentTDf: 3, 5, 10, or null (discrete degrees-of-freedom choices)
 *
 * @param decoded - The decoded payload object with full field names
 * @param version - The original schema version from the payload (before migration)
 * @returns The validated WizardInputs, or null if any constraint fails
 */
function validateDecodedPayload(decoded: Record<string, unknown>, version: number): WizardInputs | null {
  const d = decoded as Record<keyof WizardInputs, unknown>;

  // --- Numeric fields: must be a finite number or null ---
  const numericFields: (keyof WizardInputs)[] = [
    'baselineConversionRate',
    'annualVisitors',
    'valuePerConversion',
    'priorIntervalLow',
    'priorIntervalHigh',
    'thresholdValue',
    'testDurationDays',
    'dailyTraffic',
    'trafficSplit',
    'eligibilityFraction',
    'decisionLatencyDays',
  ];

  for (const field of numericFields) {
    const val = d[field];
    if (val !== null && (typeof val !== 'number' || !Number.isFinite(val))) {
      return null;
    }
  }

  // --- String field: visitorUnitLabel must be a string ---
  if (typeof d.visitorUnitLabel !== 'string') {
    return null;
  }

  // --- Enum field: priorType ---
  if (d.priorType !== null && !(ENUM_CONSTRAINTS.priorType as readonly unknown[]).includes(d.priorType)) {
    return null;
  }

  // --- Enum field: priorShape ---
  if (d.priorShape !== null && !(ENUM_CONSTRAINTS.priorShape as readonly unknown[]).includes(d.priorShape)) {
    return null;
  }

  // --- Enum field: thresholdScenario ---
  if (d.thresholdScenario !== null && !(ENUM_CONSTRAINTS.thresholdScenario as readonly unknown[]).includes(d.thresholdScenario)) {
    return null;
  }

  // --- Enum field: thresholdUnit ---
  if (d.thresholdUnit !== null && !(ENUM_CONSTRAINTS.thresholdUnit as readonly unknown[]).includes(d.thresholdUnit)) {
    return null;
  }

  // --- Discrete field: studentTDf must be 3, 5, 10, or null ---
  if (d.studentTDf !== null && !(ENUM_CONSTRAINTS.studentTDf as readonly unknown[]).includes(d.studentTDf)) {
    return null;
  }

  // --- Domain constraint: baselineConversionRate (version-aware) ---
  // baselineConversionRate is a decimal rate (e.g., 0.05 = 5%), not a percentage
  if (d.baselineConversionRate !== null) {
    const bcr = d.baselineConversionRate as number;
    if (version >= 2) {
      // v2+: strict open interval matching form validation
      // CR=0 causes division by zero in SE formula; CR=1 collapses feasibility bounds
      if (bcr <= 0 || bcr >= 1) { return null; }
    } else {
      // v1 legacy: original loose rules (preserve backward compatibility)
      if (bcr < 0 || bcr > 1) { return null; }
    }
  }

  // --- Domain constraint: trafficSplit (version-aware) ---
  if (d.trafficSplit !== null) {
    const ts = d.trafficSplit as number;
    if (version >= 2) {
      // v2+: form-aligned bounds [10%, 90%]
      if (ts < 0.10 || ts > 0.90) { return null; }
    } else {
      // v1 legacy: original loose rules
      if (ts <= 0 || ts > 1) { return null; }
    }
  }

  // --- Domain constraint: eligibilityFraction in (0, 1] ---
  // Must be strictly positive and at most 100%
  if (d.eligibilityFraction !== null) {
    const ef = d.eligibilityFraction as number;
    if (ef <= 0 || ef > 1) {
      return null;
    }
  }

  return d as unknown as WizardInputs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encodes WizardInputs into a compact base64url string suitable for URL hash fragments.
 *
 * The caller places this string after "#s=" in the URL, e.g.:
 *   https://example.com/#s=<encoded>
 *
 * Encoding strategy:
 * 1. Build a compact object: include only fields that are non-null AND differ from initialInputs defaults
 * 2. Map full field names to 1-2 char short keys
 * 3. Add schema version: { v: SCHEMA_VERSION }
 * 4. JSON.stringify the compact object
 * 5. Base64url encode (URL-safe, no padding)
 *
 * @param inputs - The wizard inputs to encode
 * @returns A base64url-encoded string (does NOT include the "#s=" prefix)
 */
export function encodeWizardState(inputs: WizardInputs): string {
  // Build compact object: only non-null, non-default values
  const compact: Record<string, unknown> = {};

  for (const key of Object.keys(SHORT_KEY_MAP) as (keyof WizardInputs)[]) {
    const value = inputs[key];
    const defaultValue = initialInputs[key];

    // Omit null values and values that match the initial defaults
    if (value !== null && value !== defaultValue) {
      compact[SHORT_KEY_MAP[key]] = value;
    }
  }

  // Always include schema version
  compact['v'] = SCHEMA_VERSION;

  const json = JSON.stringify(compact);
  return toBase64Url(json);
}

/**
 * Decodes a base64url-encoded string back into WizardInputs.
 *
 * The input is the raw encoded string (without the "#s=" prefix).
 *
 * Decoding steps:
 * 1. Base64url decode → JSON string
 * 2. JSON.parse → plain object (reject non-objects)
 * 3. Read "v" field; reject if missing or > SCHEMA_VERSION
 * 4. Run migration chain if v < SCHEMA_VERSION (per-version migration functions)
 * 5. Map short keys back to full field names
 * 6. Merge with initialInputs (new fields added in later versions get defaults)
 * 7. Validate all fields for type, enum constraints, and domain ranges
 *
 * @param encoded - Base64url-encoded string (without "#s=" prefix)
 * @returns Validated WizardInputs, or null if decoding/validation fails
 */
export function decodeWizardState(encoded: string): WizardInputs | null {
  // Step 1: Base64url decode
  const json = fromBase64Url(encoded);
  if (json === null) {
    return null;
  }

  // Step 2: JSON.parse and validate it's a plain object
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(json);
  } catch {
    return null;
  }

  if (
    rawPayload === null ||
    typeof rawPayload !== 'object' ||
    Array.isArray(rawPayload)
  ) {
    return null;
  }

  let payload = rawPayload as Record<string, unknown>;

  // Step 3: Read and validate schema version
  // Store the original version before migration for version-aware validation
  const version = payload['v'];
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return null;
  }
  const originalVersion = version;

  // Unknown future version: caller must handle gracefully
  if (version > SCHEMA_VERSION) {
    return null;
  }

  // Step 4: Run migration chain (v -> v+1 -> ... -> SCHEMA_VERSION)
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) {
      payload = migrate(payload);
    }
  }

  // Step 5: Map short keys back to full field names
  const expanded: Record<string, unknown> = {};
  for (const [shortKey, value] of Object.entries(payload)) {
    if (shortKey === 'v') continue; // Skip version field
    const fullKey = REVERSE_KEY_MAP[shortKey];
    if (fullKey) {
      expanded[fullKey] = value;
    }
    // Unknown short keys are silently dropped (forward compat: extra fields from newer encoders)
  }

  // Step 6: Merge with initialInputs so any fields absent from the payload get defaults
  const merged: Record<string, unknown> = {
    ...initialInputs,
    ...expanded,
  };

  // Step 7: Validate the merged payload (version-aware: v1 uses loose rules, v2+ tightened)
  return validateDecodedPayload(merged, originalVersion);
}
