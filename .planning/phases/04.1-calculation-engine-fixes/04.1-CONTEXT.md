## 🚨 High Priority Issues (Correctness)

### 1) **Degenerate sigma handling produces incorrect EVPI**

In `calculateEVPI`, `zScore` is set to `0` when `sigma_L <= 0`. That causes `phiZ` and `PhiZ` to behave as if the distribution were centered with standard deviation > 0, which can yield **non-zero EVPI** even when there is no uncertainty (degenerate prior). This violates the EVPI definition (it should be 0 when sigma is 0).

**Why it matters:**  
Even if validation prevents sigma from reaching zero in the UI, persisted state or future integrations could trigger this. Mathematically, if sigma is zero, the distribution is degenerate and the probability mass is a point mass at `mu_L`. EVPI should be **exactly zero**.

**Suggested patch (concrete):**

```
diff --git a/src/lib/calculations/evpi.ts b/src/lib/calculations/evpi.ts
index 0000000..0000000 100644
--- a/src/lib/calculations/evpi.ts
+++ b/src/lib/calculations/evpi.ts
@@ -67,7 +67,14 @@ export function calculateEVPI(inputs: EVPIInputs): EVPIResults {
   // z = (T_L - mu_L) / sigma_L
   // This standardizes the threshold relative to the prior distribution
   // Handle edge case: if sigma_L is 0 or very small, z would be infinite
-  const zScore = sigma_L > 0 ? (threshold_L - mu_L) / sigma_L : 0;
+  let zScore: number;
+  if (sigma_L > 0) {
+    zScore = (threshold_L - mu_L) / sigma_L;
+  } else if (threshold_L === mu_L) {
+    zScore = 0;
+  } else {
+    zScore = threshold_L > mu_L ? Infinity : -Infinity;
+  }
```

---

### 2) **`standardNormalCDF` returns 1 for NaN**

`standardNormalCDF` currently treats all non-finite numbers the same, and **returns 1 for NaN** because `z < 0` is false. That hides invalid inputs and can produce misleading EVPI results.

**Why it matters:**  
NaN should propagate as NaN to highlight an invalid calculation path; returning 1 effectively asserts certainty when there is none.

**Suggested patch (concrete):**

```
diff --git a/src/lib/calculations/statistics.ts b/src/lib/calculations/statistics.ts
index 0000000..0000000 100644
--- a/src/lib/calculations/statistics.ts
+++ b/src/lib/calculations/statistics.ts
@@ -62,7 +62,11 @@ export function standardNormalCDF(z: number): number {
-  // Handle special cases for +/- Infinity
-  if (!isFinite(z)) {
-    return z < 0 ? 0 : 1;
-  }
+  if (Number.isNaN(z)) {
+    return NaN;
+  }
+  // Handle special cases for +/- Infinity
+  if (!isFinite(z)) {
+    return z < 0 ? 0 : 1;
+  }
```

---

## ⚠️ Medium Priority Issues / Gaps

### 3) **Missing direct tests for the normal PDF/CDF**

While EVPI is well tested, there are **no direct unit tests** for the PDF/CDF implementations (e.g., known values at 0, 1, -1, ±∞). This is a gap in verifying the mathematical foundations of the EVPI calculation.

**Recommendation:** Add a dedicated test suite (e.g., `statistics.test.ts`) with assertions for:

- `PDF(0) ≈ 0.39894228`
    
- `CDF(0) ≈ 0.5`
    
- `CDF(1) ≈ 0.8413447`
    
- `CDF(-1) ≈ 0.1586553`
    
- `CDF(∞) = 1`, `CDF(-∞) = 0`
    
- `CDF(NaN) = NaN` (if patch above is accepted)
    

This would raise confidence in the core math and catch regression in the approximation routine.