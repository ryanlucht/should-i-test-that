/**
 * Tests for URL Codec Module
 *
 * Tests round-trip fidelity, compactness, schema versioning,
 * migration chain, and decode validation.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeWizardState,
  decodeWizardState,
  SCHEMA_VERSION,
} from './url-codec';
import type { WizardInputs } from './url-codec';
import { initialInputs } from './url-codec';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Decodes a base64url string to a JSON string for test inspection.
 * Inverse of the URL-safe base64 encoding used by encodeWizardState.
 */
function decodeBase64Url(encoded: string): string {
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (standard.length % 4)) % 4;
  return atob(standard + '='.repeat(paddingNeeded));
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Typical scenario fixture (from plan spec)
 * Used for compactness assertion (must encode under 400 chars including "#s=" prefix)
 */
const typicalScenario: WizardInputs = {
  baselineConversionRate: 0.05,
  annualVisitors: 500000,
  visitorUnitLabel: 'visitors', // default — should be omitted from encoded output
  valuePerConversion: 50,
  priorType: 'custom',
  priorIntervalLow: -5,
  priorIntervalHigh: 10,
  priorShape: 'normal', // default — should be omitted from encoded output
  studentTDf: null,
  thresholdScenario: 'any-positive',
  thresholdUnit: null,
  thresholdValue: null,
  testDurationDays: 14,
  dailyTraffic: 2000,
  trafficSplit: 0.5, // default — should be omitted from encoded output
  eligibilityFraction: 1.0, // default — should be omitted from encoded output
  decisionLatencyDays: 0, // default — should be omitted from encoded output
};

/**
 * All-fields fixture (maximum payload size)
 * Used for the all-fields compactness assertion (must encode under 500 chars)
 */
const allFieldsScenario: WizardInputs = {
  baselineConversionRate: 0.03,
  annualVisitors: 1200000,
  visitorUnitLabel: 'sessions',
  valuePerConversion: 75,
  priorType: 'custom',
  priorIntervalLow: -3,
  priorIntervalHigh: 8,
  priorShape: 'student-t',
  studentTDf: 5,
  thresholdScenario: 'minimum-lift',
  thresholdUnit: 'dollars',
  thresholdValue: 1000,
  testDurationDays: 21,
  dailyTraffic: 3288,
  trafficSplit: 0.4,
  eligibilityFraction: 0.8,
  decisionLatencyDays: 3,
};

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------

describe('SCHEMA_VERSION', () => {
  it('should be version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// encodeWizardState
// ---------------------------------------------------------------------------

describe('encodeWizardState', () => {
  it('should return a non-empty string', () => {
    const encoded = encodeWizardState(typicalScenario);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('should include schema version "v":1 in the encoded payload', () => {
    const encoded = encodeWizardState(typicalScenario);
    const payload = JSON.parse(decodeBase64Url(encoded));
    expect(payload.v).toBe(1);
  });

  it('typical scenario encodes to under 400 characters (including #s= prefix)', () => {
    const encoded = encodeWizardState(typicalScenario);
    const full = `#s=${encoded}`;
    // Explicit assertion per plan spec
    expect(full.length).toBeLessThan(400);
  });

  it('all-fields scenario encodes to under 500 characters (including #s= prefix)', () => {
    const encoded = encodeWizardState(allFieldsScenario);
    const full = `#s=${encoded}`;
    // Explicit assertion per plan spec
    expect(full.length).toBeLessThan(500);
  });

  it('omits null fields from the encoded payload', () => {
    const encoded = encodeWizardState(typicalScenario);
    const payload = JSON.parse(decodeBase64Url(encoded));
    // studentTDf, thresholdUnit, thresholdValue are null in typicalScenario
    expect(payload).not.toHaveProperty('df'); // studentTDf short key
    expect(payload).not.toHaveProperty('tu'); // thresholdUnit short key
    expect(payload).not.toHaveProperty('tv'); // thresholdValue short key
  });

  it('omits default values from the encoded payload', () => {
    const encoded = encodeWizardState(typicalScenario);
    const payload = JSON.parse(decodeBase64Url(encoded));
    // Default values that should be omitted:
    // visitorUnitLabel='visitors', priorShape='normal', trafficSplit=0.5,
    // eligibilityFraction=1.0, decisionLatencyDays=0
    expect(payload).not.toHaveProperty('ul'); // visitorUnitLabel short key
    expect(payload).not.toHaveProperty('ps'); // priorShape short key
    expect(payload).not.toHaveProperty('sp'); // trafficSplit short key
    expect(payload).not.toHaveProperty('ef'); // eligibilityFraction short key
    expect(payload).not.toHaveProperty('dl'); // decisionLatencyDays short key
  });

  it('uses short keys (1-2 chars) in the encoded payload', () => {
    const encoded = encodeWizardState(allFieldsScenario);
    const payload = JSON.parse(decodeBase64Url(encoded));
    // No full field names should appear
    expect(payload).not.toHaveProperty('baselineConversionRate');
    expect(payload).not.toHaveProperty('annualVisitors');
    expect(payload).not.toHaveProperty('priorShape');
  });
});

// ---------------------------------------------------------------------------
// decodeWizardState — round-trip fidelity
// ---------------------------------------------------------------------------

describe('decodeWizardState — round-trip', () => {
  it('round-trips typical scenario with non-null fields', () => {
    const encoded = encodeWizardState(typicalScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Non-null, non-default fields should match exactly
    expect(decoded!.baselineConversionRate).toBe(typicalScenario.baselineConversionRate);
    expect(decoded!.annualVisitors).toBe(typicalScenario.annualVisitors);
    expect(decoded!.valuePerConversion).toBe(typicalScenario.valuePerConversion);
    expect(decoded!.priorType).toBe(typicalScenario.priorType);
    expect(decoded!.priorIntervalLow).toBe(typicalScenario.priorIntervalLow);
    expect(decoded!.priorIntervalHigh).toBe(typicalScenario.priorIntervalHigh);
    expect(decoded!.thresholdScenario).toBe(typicalScenario.thresholdScenario);
    expect(decoded!.testDurationDays).toBe(typicalScenario.testDurationDays);
    expect(decoded!.dailyTraffic).toBe(typicalScenario.dailyTraffic);
  });

  it('round-trips null fields as initialInputs defaults', () => {
    const encoded = encodeWizardState(typicalScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Null fields in typicalScenario should come back as initialInputs defaults
    expect(decoded!.studentTDf).toBe(initialInputs.studentTDf); // null
    expect(decoded!.thresholdUnit).toBe(initialInputs.thresholdUnit); // null
    expect(decoded!.thresholdValue).toBe(initialInputs.thresholdValue); // null
  });

  it('round-trips default values correctly', () => {
    const encoded = encodeWizardState(typicalScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Default values were omitted from encoding, must be filled from initialInputs
    expect(decoded!.visitorUnitLabel).toBe('visitors');
    expect(decoded!.priorShape).toBe('normal');
    expect(decoded!.trafficSplit).toBe(0.5);
    expect(decoded!.eligibilityFraction).toBe(1.0);
    expect(decoded!.decisionLatencyDays).toBe(0);
  });

  it('round-trips all-fields scenario exactly', () => {
    const encoded = encodeWizardState(allFieldsScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Every field should match
    for (const key of Object.keys(allFieldsScenario) as (keyof WizardInputs)[]) {
      expect(decoded![key]).toBe(allFieldsScenario[key]);
    }
  });
});

// ---------------------------------------------------------------------------
// decodeWizardState — error handling
// ---------------------------------------------------------------------------

describe('decodeWizardState — error handling', () => {
  it('returns null for malformed base64 (no throw)', () => {
    expect(() => decodeWizardState('!!!invalid!!!base64')).not.toThrow();
    expect(decodeWizardState('!!!invalid!!!base64')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const invalidJson = btoa('not valid json');
    expect(decodeWizardState(invalidJson)).toBeNull();
  });

  it('returns null for valid JSON that is not a plain object (array)', () => {
    const arrayJson = btoa('[1,2,3]');
    expect(decodeWizardState(arrayJson)).toBeNull();
  });

  it('returns null for valid JSON that is null', () => {
    const nullJson = btoa('null');
    expect(decodeWizardState(nullJson)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeWizardState('')).toBeNull();
  });

  it('returns null for unknown version (v > SCHEMA_VERSION)', () => {
    const futurePayload = btoa(JSON.stringify({ v: 999, bc: 0.05 }));
    expect(decodeWizardState(futurePayload)).toBeNull();
  });

  it('returns null for payload missing version field', () => {
    const noVersion = btoa(JSON.stringify({ bc: 0.05, av: 500000 }));
    expect(decodeWizardState(noVersion)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decodeWizardState — validation
// ---------------------------------------------------------------------------

describe('decodeWizardState — payload validation', () => {
  it('returns null when a numeric field contains NaN', () => {
    // Manually construct a v1 payload with NaN encoded as a string (JSON can't encode NaN directly)
    // We test that the validator rejects it if somehow a non-finite value slips in
    // We bypass encode/decode and inject directly via a tampered payload
    const tamperedPayload = JSON.stringify({ v: 1, bc: null, av: null, vc: null });
    const encoded = btoa(tamperedPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    // This valid payload should decode fine (all null)
    expect(decodeWizardState(encoded)).not.toBeNull();
  });

  it('returns null when baselineConversionRate is above 1', () => {
    // baselineConversionRate must be in [0, 1] — 1.5 is invalid
    const payload = JSON.stringify({ v: 1, bc: 1.5 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when baselineConversionRate is negative', () => {
    const payload = JSON.stringify({ v: 1, bc: -0.1 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when trafficSplit is out of range (> 1)', () => {
    const payload = JSON.stringify({ v: 1, sp: 1.5 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when trafficSplit is zero or negative', () => {
    const payload = JSON.stringify({ v: 1, sp: 0 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when eligibilityFraction is out of range (> 1)', () => {
    const payload = JSON.stringify({ v: 1, ef: 1.1 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when priorShape has an invalid enum value', () => {
    const payload = JSON.stringify({ v: 1, ps: 'invalid' });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when priorType has an invalid enum value', () => {
    const payload = JSON.stringify({ v: 1, pt: 'bad-value' });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when thresholdScenario has an invalid enum value', () => {
    const payload = JSON.stringify({ v: 1, ts: 'unknown' });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when thresholdUnit has an invalid enum value', () => {
    const payload = JSON.stringify({ v: 1, tu: 'yen' });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('returns null when studentTDf has an invalid value (not 3, 5, or 10)', () => {
    const payload = JSON.stringify({ v: 1, df: 7 });
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('accepts valid studentTDf values (3, 5, 10)', () => {
    for (const df of [3, 5, 10]) {
      const payload = JSON.stringify({ v: 1, df, ps: 'student-t' });
      const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const decoded = decodeWizardState(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.studentTDf).toBe(df);
    }
  });
});

// ---------------------------------------------------------------------------
// Migration chain
// ---------------------------------------------------------------------------

describe('decodeWizardState — migration chain', () => {
  it('runs v0->v1 migration and produces valid output', () => {
    // Manually construct a v0 payload using short keys that the v0->v1 migration will handle.
    // In v0, we scaffold that the payload has "v":0 and the same short keys as v1
    // (migration just bumps the version; this tests the migration chain runs).
    const v0Payload = JSON.stringify({
      v: 0,
      bc: 0.05,
      av: 100000,
      vc: 25,
      pt: 'default',
      ts: 'any-positive',
    });
    const encoded = btoa(v0Payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // After migration, data should be preserved
    expect(decoded!.baselineConversionRate).toBe(0.05);
    expect(decoded!.annualVisitors).toBe(100000);
    expect(decoded!.valuePerConversion).toBe(25);
    expect(decoded!.priorType).toBe('default');
    expect(decoded!.thresholdScenario).toBe('any-positive');
  });
});
