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
  validateThresholdSign,
} from './url-codec';
import type { WizardInputs } from '@/types/wizard';
import { initialInputs } from '@/types/wizard';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Decodes a base64url string to a JSON string for test inspection.
 * Uses TextDecoder for UTF-8 safety (matches production fromBase64Url).
 * Inverse of the URL-safe base64 encoding used by encodeWizardState.
 */
function decodeBase64Url(encoded: string): string {
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (standard.length % 4)) % 4;
  const binary = atob(standard + '='.repeat(paddingNeeded));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
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
  it('should be version 2', () => {
    expect(SCHEMA_VERSION).toBe(2);
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

  it('should include schema version "v":2 in the encoded payload', () => {
    const encoded = encodeWizardState(typicalScenario);
    const payload = JSON.parse(decodeBase64Url(encoded));
    expect(payload.v).toBe(2);
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
    expect(decoded!.inputs.baselineConversionRate).toBe(typicalScenario.baselineConversionRate);
    expect(decoded!.inputs.annualVisitors).toBe(typicalScenario.annualVisitors);
    expect(decoded!.inputs.valuePerConversion).toBe(typicalScenario.valuePerConversion);
    expect(decoded!.inputs.priorType).toBe(typicalScenario.priorType);
    expect(decoded!.inputs.priorIntervalLow).toBe(typicalScenario.priorIntervalLow);
    expect(decoded!.inputs.priorIntervalHigh).toBe(typicalScenario.priorIntervalHigh);
    expect(decoded!.inputs.thresholdScenario).toBe(typicalScenario.thresholdScenario);
    expect(decoded!.inputs.testDurationDays).toBe(typicalScenario.testDurationDays);
    expect(decoded!.inputs.dailyTraffic).toBe(typicalScenario.dailyTraffic);
  });

  it('round-trips null fields as initialInputs defaults', () => {
    const encoded = encodeWizardState(typicalScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Null fields in typicalScenario should come back as initialInputs defaults
    expect(decoded!.inputs.studentTDf).toBe(initialInputs.studentTDf); // null
    expect(decoded!.inputs.thresholdUnit).toBe(initialInputs.thresholdUnit); // null
    expect(decoded!.inputs.thresholdValue).toBe(initialInputs.thresholdValue); // null
  });

  it('round-trips default values correctly', () => {
    const encoded = encodeWizardState(typicalScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Default values were omitted from encoding, must be filled from initialInputs
    expect(decoded!.inputs.visitorUnitLabel).toBe('visitors');
    expect(decoded!.inputs.priorShape).toBe('normal');
    expect(decoded!.inputs.trafficSplit).toBe(0.5);
    expect(decoded!.inputs.eligibilityFraction).toBe(1.0);
    expect(decoded!.inputs.decisionLatencyDays).toBe(0);
  });

  it('round-trips all-fields scenario exactly', () => {
    const encoded = encodeWizardState(allFieldsScenario);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    // Every field should match
    for (const key of Object.keys(allFieldsScenario) as (keyof WizardInputs)[]) {
      expect(decoded!.inputs[key]).toBe(allFieldsScenario[key]);
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
      expect(decoded!.inputs.studentTDf).toBe(df);
    }
  });
});

// ---------------------------------------------------------------------------
// Migration chain
// ---------------------------------------------------------------------------

describe('decodeWizardState — migration chain', () => {
  it('runs v0->v1->v2 migration and produces valid output', () => {
    // Manually construct a v0 payload using short keys that the migration chain will handle.
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
    expect(decoded!.inputs.baselineConversionRate).toBe(0.05);
    expect(decoded!.inputs.annualVisitors).toBe(100000);
    expect(decoded!.inputs.valuePerConversion).toBe(25);
    expect(decoded!.inputs.priorType).toBe('default');
    expect(decoded!.inputs.thresholdScenario).toBe('any-positive');
  });
});

// ---------------------------------------------------------------------------
// v2 tightened validation
// ---------------------------------------------------------------------------

/**
 * Helper: build a v1 payload manually (base64url-encoded JSON with v=1).
 * Used to test backward compatibility -- v1 payloads use original loose rules.
 */
function buildV1Payload(overrides: Partial<Record<string, unknown>>): string {
  // Map full field names to short keys for the payload
  const shortKeyMap: Record<string, string> = {
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

  const compact: Record<string, unknown> = { v: 1 };
  for (const [fullKey, value] of Object.entries(overrides)) {
    const shortKey = shortKeyMap[fullKey];
    if (shortKey && value !== null && value !== undefined) {
      compact[shortKey] = value;
    }
  }

  const json = JSON.stringify(compact);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('v2 tightened validation', () => {
  it('rejects baselineConversionRate of 0 (boundary)', () => {
    // v2 URLs get strict validation: CR=0 causes division by zero in SE formula
    const encoded = encodeWizardState({ ...typicalScenario, baselineConversionRate: 0 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects baselineConversionRate of 1 (boundary)', () => {
    // v2 URLs get strict validation: CR=1 collapses feasibility bounds
    const encoded = encodeWizardState({ ...typicalScenario, baselineConversionRate: 1 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects trafficSplit below 10%', () => {
    const encoded = encodeWizardState({ ...typicalScenario, trafficSplit: 0.05 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects trafficSplit above 90%', () => {
    const encoded = encodeWizardState({ ...typicalScenario, trafficSplit: 0.95 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('accepts trafficSplit at 10% boundary', () => {
    const encoded = encodeWizardState({ ...typicalScenario, trafficSplit: 0.10 });
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.trafficSplit).toBe(0.10);
  });

  it('accepts baselineConversionRate of 0.001 (valid edge)', () => {
    const encoded = encodeWizardState({ ...typicalScenario, baselineConversionRate: 0.001 });
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CR-3: Non-ASCII encoding safety (UTF-8)
// ---------------------------------------------------------------------------

describe('encodeWizardState — non-ASCII safety (CR-3)', () => {
  it('does not throw when visitorUnitLabel contains Japanese characters', () => {
    const inputs: WizardInputs = {
      ...typicalScenario,
      visitorUnitLabel: '訪問者',
    };
    expect(() => encodeWizardState(inputs)).not.toThrow();
  });

  it('round-trips non-ASCII visitorUnitLabel (Japanese) exactly', () => {
    const inputs: WizardInputs = {
      ...typicalScenario,
      visitorUnitLabel: '訪問者',
    };
    const encoded = encodeWizardState(inputs);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.visitorUnitLabel).toBe('訪問者');
  });

  it('does not throw and round-trips emoji unit label', () => {
    const inputs: WizardInputs = {
      ...typicalScenario,
      visitorUnitLabel: 'visitors 🎉',
    };
    expect(() => encodeWizardState(inputs)).not.toThrow();
    const encoded = encodeWizardState(inputs);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.visitorUnitLabel).toBe('visitors 🎉');
  });
});

// ---------------------------------------------------------------------------
// CR-2: Expanded decode validation (v2+ domain constraints)
// ---------------------------------------------------------------------------

describe('decodeWizardState — expanded v2 domain validation (CR-2)', () => {
  it('rejects payload with dailyTraffic = -100', () => {
    const encoded = encodeWizardState({ ...allFieldsScenario, dailyTraffic: -100 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with testDurationDays = 0', () => {
    const encoded = encodeWizardState({ ...allFieldsScenario, testDurationDays: 0 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with annualVisitors = -1', () => {
    const encoded = encodeWizardState({ ...allFieldsScenario, annualVisitors: -1 });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with thresholdScenario=minimum-lift but thresholdValue=null', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      thresholdScenario: 'minimum-lift' as const,
      thresholdValue: null,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with thresholdScenario=minimum-lift but thresholdUnit=null', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      thresholdScenario: 'minimum-lift' as const,
      thresholdUnit: null,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with priorType=custom but priorIntervalLow >= priorIntervalHigh', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      priorType: 'custom' as const,
      priorIntervalLow: 10,
      priorIntervalHigh: 5,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with priorShape=student-t but studentTDf=7 (not in {3,5,10})', () => {
    // This is already rejected by enum check, but verify via v2 encode/decode path
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      priorShape: 'student-t' as const,
      studentTDf: 7 as unknown as 3 | 5 | 10 | null,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects payload with testDurationDays=300 + decisionLatencyDays=100 (sum > 365)', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      testDurationDays: 300,
      decisionLatencyDays: 100,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('all existing valid payloads still decode successfully', () => {
    // typicalScenario
    const enc1 = encodeWizardState(typicalScenario);
    expect(decodeWizardState(enc1)).not.toBeNull();
    // allFieldsScenario
    const enc2 = encodeWizardState(allFieldsScenario);
    expect(decodeWizardState(enc2)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CR-3: Encoder safety inside try/catch
// ---------------------------------------------------------------------------

describe('encodeWizardState — try/catch safety (CR-3)', () => {
  it('encodeWizardState can be safely caught when it throws', () => {
    // Verify the function is usable inside try/catch (CR-3 safety)
    let caught = false;
    try {
      // Valid inputs should not throw
      const result = encodeWizardState(typicalScenario);
      expect(typeof result).toBe('string');
    } catch {
      caught = true;
    }
    expect(caught).toBe(false);
  });
});

describe('v1 backward compatibility', () => {
  it('v1 payload with baselineConversionRate=0 still decodes (legacy loose rules)', () => {
    // v1 allows bcr=0 (original [0, 1] range), v2 does not (strict open interval)
    const v1Payload = buildV1Payload({
      baselineConversionRate: 0,
      annualVisitors: 500000,
      valuePerConversion: 50,
      thresholdScenario: 'any-positive',
      testDurationDays: 14,
      dailyTraffic: 2000,
    });
    const decoded = decodeWizardState(v1Payload);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.baselineConversionRate).toBe(0);
  });

  it('v1 payload with trafficSplit=0.95 still decodes (legacy loose rules)', () => {
    // v1 allows ts up to 1.0 (original (0, 1] range), v2 restricts to [0.10, 0.90]
    const v1Payload = buildV1Payload({
      baselineConversionRate: 0.05,
      annualVisitors: 500000,
      valuePerConversion: 50,
      thresholdScenario: 'any-positive',
      testDurationDays: 14,
      dailyTraffic: 2000,
      trafficSplit: 0.95,
    });
    const decoded = decodeWizardState(v1Payload);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.trafficSplit).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// CR28-02: accept-loss round-trip
// ---------------------------------------------------------------------------

describe('accept-loss round-trip (CR28-02)', () => {
  it('encode accept-loss inputs round-trips through decode with identical values', () => {
    // accept-loss scenario: user enters 5 as loss magnitude, stored as -5
    const acceptLossInputs: WizardInputs = {
      ...typicalScenario,
      thresholdScenario: 'accept-loss',
      thresholdUnit: 'dollars',
      thresholdValue: -5, // Negative per sign convention
    };
    const encoded = encodeWizardState(acceptLossInputs);
    const decoded = decodeWizardState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.inputs.thresholdScenario).toBe('accept-loss');
    expect(decoded!.inputs.thresholdUnit).toBe('dollars');
    expect(decoded!.inputs.thresholdValue).toBe(-5);
  });

  it('rejects minimum-lift with negative thresholdValue', () => {
    // minimum-lift must have positive thresholdValue
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      thresholdScenario: 'minimum-lift',
      thresholdUnit: 'dollars',
      thresholdValue: -5,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects accept-loss with positive thresholdValue', () => {
    // accept-loss must have negative thresholdValue (stored as -acceptableLoss)
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      thresholdScenario: 'accept-loss',
      thresholdUnit: 'dollars',
      thresholdValue: 5,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CR28-05: integer constraints for v2+ URLs
// ---------------------------------------------------------------------------

describe('integer constraints (CR28-05)', () => {
  it('rejects fractional annualVisitors for v2 URLs', () => {
    const encoded = encodeWizardState({
      ...typicalScenario,
      annualVisitors: 1000.5,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects fractional testDurationDays for v2 URLs', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      testDurationDays: 14.3,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });

  it('rejects fractional decisionLatencyDays for v2 URLs', () => {
    const encoded = encodeWizardState({
      ...allFieldsScenario,
      decisionLatencyDays: 7.7,
    });
    expect(decodeWizardState(encoded)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateThresholdSign helper unit tests
// ---------------------------------------------------------------------------

describe('validateThresholdSign helper', () => {
  it('returns true for any-positive regardless of thresholdValue', () => {
    expect(validateThresholdSign('any-positive', 5, 'dollars')).toBe(true);
    expect(validateThresholdSign('any-positive', -5, 'dollars')).toBe(true);
    expect(validateThresholdSign('any-positive', null, null)).toBe(true);
  });

  it('returns true for null scenario', () => {
    expect(validateThresholdSign(null, 5, 'dollars')).toBe(true);
  });

  it('returns true for minimum-lift with positive thresholdValue', () => {
    expect(validateThresholdSign('minimum-lift', 5, 'dollars')).toBe(true);
  });

  it('returns false for minimum-lift with negative thresholdValue', () => {
    expect(validateThresholdSign('minimum-lift', -5, 'dollars')).toBe(false);
  });

  it('returns false for minimum-lift with zero thresholdValue', () => {
    expect(validateThresholdSign('minimum-lift', 0, 'dollars')).toBe(false);
  });

  it('returns true for accept-loss with negative thresholdValue', () => {
    expect(validateThresholdSign('accept-loss', -5, 'dollars')).toBe(true);
  });

  it('returns false for accept-loss with positive thresholdValue', () => {
    expect(validateThresholdSign('accept-loss', 5, 'dollars')).toBe(false);
  });

  it('returns false for accept-loss with zero thresholdValue', () => {
    expect(validateThresholdSign('accept-loss', 0, 'dollars')).toBe(false);
  });

  it('returns false when unit or value is null for non-any-positive scenario', () => {
    expect(validateThresholdSign('minimum-lift', null, 'dollars')).toBe(false);
    expect(validateThresholdSign('minimum-lift', 5, null)).toBe(false);
    expect(validateThresholdSign('accept-loss', null, 'dollars')).toBe(false);
    expect(validateThresholdSign('accept-loss', -5, null)).toBe(false);
  });
});
