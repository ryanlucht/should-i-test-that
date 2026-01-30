---
created: 2026-01-30T09:34
title: Implement actual truncation for EVPI calculation
area: calculations
files:
  - SPEC.md:206-213 (Section 6.4 truncation requirement)
  - SPEC.md:322-345 (Section 8.4 Method B numerical integration)
  - src/lib/calculations/evpi.ts (EVPI calculation)
  - src/lib/calculations/derived.ts (detectEdgeCases)
---

## Problem

SPEC.md Section 6.4 requires: "When computing probabilities and EVPI, treat the prior as truncated at least at L >= -1, and re-normalize."

Current Phase 3 implementation uses the **closed-form untruncated formula** (SPEC Method A) and only **detects** when truncation would be significant (>0.1% mass below L=-1), setting a flag for the UI to display an educational note.

This is acceptable for most cases because:
1. Default prior N(0, 0.05) has essentially zero mass below L=-1
2. Most realistic priors don't have significant mass at -100% lift

However, for edge cases with wide priors near the boundary (e.g., mu_L = -0.8, sigma_L = 0.2), the detect+note approach may not be mathematically accurate.

## Solution

TBD - Options to explore:

1. **Numerical integration (Method B)**: When truncation mass exceeds threshold (e.g., 1%), switch from closed-form to discretized integration with proper re-normalization

2. **Truncated normal closed-form**: Research if a closed-form EVPI formula exists for truncated normal distributions

3. **Hybrid approach**: Use closed-form with an adjustment factor based on truncation mass

Decision made: Accept detect+note for v1 Basic mode. Revisit if users report issues or for Advanced mode where custom priors may be more extreme.
