# Statistics Engine Audit (LLM-Friendly Markdown)
App: **Should I Test That?**  
Scope: **`calcs/`** engine (EVPI/EVSI, distributions, sampling, cost-of-delay)  
Goal: Identify potentially incorrect, inconsistent, or controversial statistical methods and propose fixes.

References (public):
- Front-end: https://should-i-test-that.vercel.app
- Repo: https://github.com/ryanlucht/should-i-test-that

---

## 0) Glossary / Notation (plain text)

- L = true (unknown) **relative lift** on conversion rate (e.g., +0.05 = +5% relative).
- CR0 = baseline conversion rate (control).
- N_year = annual traffic volume.
- V = value per conversion (or equivalent $/conversion).
- K = annual dollars per unit of relative lift:
  - K = N_year * CR0 * V
- T = shipping threshold expressed in lift units (relative lift).  
- Utility if ship: U_ship(L) = K * (L - T)  
- Utility if don’t ship: U_noship(L) = 0  
- Decision rule: choose action with larger expected utility.

---

## 1) What the engine is trying to compute (conceptual model)

### 1.1 Expected Value of Perfect Information (EVPI)

Definition: value gained if you learn the true L before deciding.

Formula (plain text):
- EVPI = E[ max(K*(L - T), 0) ] - max( K*(E[L] - T), 0 )

Interpretation:
- First term: expected value if you always choose the best action given true L.
- Second term: value of the best action when you only know the prior mean.

### 1.2 Expected Value of Sample Information (EVSI)

Standard decision-analysis definition: value of running a test that produces data, then deciding optimally using the posterior.

Formula (plain text):
- EVSI = E_data[ max( K*( E[L | data] - T ), 0 ) ] - max( K*(E[L] - T), 0 )

Key detail:
- The decision uses **posterior expected lift** (or posterior expected net benefit), not the raw point estimate.

---

## 2) High-severity issues (likely “bug” vs “model choice”)

### [HIGH] 2.1 EVSI Monte Carlo uses the wrong decision rule (not EVSI as defined)
**Where:** `evsi.ts`, `calculateEVSIMonteCarlo()`

Current algorithm (as implemented, simplified):
1) Sample L_true ~ prior  
2) Simulate observed estimate: L_hat = L_true + noise, where noise ~ Normal(0, SE^2)  
3) Decide “ship” if L_hat >= T

Why this is incorrect (for EVSI):
- Under the stated utility U_ship(L) = K*(L-T), the Bayes-optimal decision is:
  - ship iff E[L | L_hat] >= T
- The rule “ship iff L_hat >= T” ignores the prior and overreacts to noisy estimates.

Practical symptoms:
- The Monte Carlo EVSI can become negative for high noise (because the heuristic can be worse than ignoring data).
- True EVSI cannot be negative (you can always ignore the sample information, so EVSI >= 0).
- Your code clamps negative EVSI to 0, masking this inconsistency rather than fixing it.
- This makes EVSI inconsistent between “Normal fast path” vs Monte Carlo path.

#### Correct decision rule for Normal prior + Normal likelihood
If prior: L ~ Normal(mu, sigma^2)  
And likelihood: L_hat | L ~ Normal(L, SE^2)

Posterior mean is shrinkage:
- w = sigma^2 / (sigma^2 + SE^2)
- E[L | L_hat] = w * L_hat + (1 - w) * mu

So decision should be:
- ship if (w * L_hat + (1 - w) * mu) >= T

#### Concrete fix (Normal-prior Monte Carlo)
Replace decision on `L_hat` with decision on posterior mean:

```ts
const w = (sigma_prior * sigma_prior) / (sigma_prior * sigma_prior + se_L * se_L);
const posteriorMean = w * L_hat + (1 - w) * mu_prior;
const posteriorDecision = posteriorMean >= threshold_L ? 'ship' : 'dont-ship';
```

#### Fix for non-Normal priors (Student-t / Uniform)
If you want EVSI in the standard Bayesian sense, you need E[L | L_hat] for each simulated L_hat.

A practical method that works for any prior:
1) Define a grid over feasible L values (e.g., [-1, L_max] or wider if unbounded).
2) Compute unnormalized posterior weights:
   - weight(L) = prior_pdf(L) * NormalPDF(L_hat; mean=L, sd=SE)
3) Posterior mean approximation:
   - E[L | L_hat] ≈ sum(L * weight(L)) / sum(weight(L))
4) Decide ship if E[L | L_hat] >= T.

This produces a consistent EVSI definition across prior families.

---

### [HIGH] 2.2 Normal EVSI “fast path” computes Bayesian EVSI; Monte Carlo computes value of a different policy
**Where:** `evsi.ts`, `calculateEVSINormalFastPath()`

- The Normal fast path implements a standard Bayesian EVSI closed form (based on the pre-posterior distribution of the posterior mean).
- The Monte Carlo path implements a frequentist-like heuristic (ship if L_hat >= T).

Result:
- The app can output different EVSI results depending on computation path, even when both are intended to represent the same concept (EVSI).

Action:
- Align Monte Carlo decision-making with posterior-mean decision rule (Section 2.1).
- Then Normal fast path and Monte Carlo should match (within Monte Carlo error) under Normal priors.

---

### [HIGH] 2.3 “Truncation at feasibility bounds” is inconsistently applied (claim vs implementation)
Claim:
- README and internal comments imply “feasibility bounds” such as lift >= -100% (L >= -1) are applied.

Observed behavior:
- EVPI (`evpi.ts`) does NOT truncate the Normal prior at L = -1.
- `detectEdgeCases()` flags mass below -1 but does not enforce truncation.
- EVSI Monte Carlo uses rejection sampling to ensure feasibility in simulation, which effectively uses a truncated prior (renormalized), but other computed metrics may still assume an untruncated prior.

This creates internal inconsistency:
- Prior metrics (means/probabilities) may reflect an untruncated prior.
- Simulation paths may behave as if the prior is truncated.

Fix options (pick one and apply consistently):
Option A (recommended): implement true truncated priors everywhere.
- Normal: truncated mean/CDF/PDF are straightforward with standard normal PDF/CDF.
- Uniform: trivial.
- Student-t: harder analytically, but can be handled numerically (grid integration) similarly to the EVSI posterior approach.

Option B: remove truncation behavior and keep only warnings.
- Then update README/comments/UI language to avoid implying truncation.

---

## 3) Medium-severity correctness / robustness issues

### [MED] 3.1 Box–Muller normal sampler can produce NaN/Inf if Math.random() returns 0
**Where:** `distributions.ts` and `evsi.ts` (standard normal sampling)

Box–Muller uses log(u1). If u1 = 0, log(0) = -Infinity.

Fix:
```ts
const u1 = Math.max(Math.random(), 1e-16);
```

---

### [MED] 3.2 EVPI edge case when sigma_L == 0 (degenerate prior)
**Where:** `evpi.ts`

If sigma_L == 0:
- L is deterministic (a point mass).
- Probability L >= T is either 1 or 0 depending on mu_L >= T (using “>=”, equality counts as true).
- Some existing outputs can incorrectly show 0.5 in the mu == T case (due to zScore forced to 0).
- `expectedRegretFactor` can become 0/0 -> NaN.

Fix:
- If sigma_L == 0, handle separately:
  - probabilityClearsThreshold = (mu_L >= T) ? 1 : 0
  - chanceOfBeingWrong = 0
  - expectedRegretFactor = 0

---

### [MED] 3.3 Student-t prior: parameter meaning and existence of mean/variance
**Where:** `distributions.ts` (Student-t), plus any code assuming “sigma is SD”

Current model: location-scale t
- L = mu + sigma * t_df

Important:
- sigma is a SCALE parameter, not necessarily the standard deviation.
- For df <= 2, variance does not exist.
- For df <= 1, mean does not exist.
- If the app treats mu as “the mean” for all df, that is incorrect for df <= 1.
- If the app treats sigma as “SD”, that’s incorrect unless explicitly converted.

Recommended actions:
- In UI: label Student-t “sigma” as “scale” (not SD).
- Add validation/warnings:
  - warn or block df <= 1 if you need a defined mean,
  - warn df <= 2 if you interpret sigma as uncertainty with finite variance.
- If you want user to input SD instead of scale:
  - For df > 2: scale = SD * sqrt((df - 2) / df)

---

### [MED] 3.4 Standard error model for relative lift is a planning approximation
**Where:** `evsi.ts`

SE model used:
- SE^2 = ((1 - CR0) / CR0) * (1/n_control + 1/n_variant)

This is a delta-method / approximation commonly used when p1 ~ p0 and CR0 not tiny.

Assumption-heavy aspects:
- variance depends on true effect L (ignored)
- normal approximation may be poor for small n or extreme CR0
- denominator noise (CR0 estimated) ignored

Alternative approaches (more accurate):
1) Simulate binomial counts directly:
   - p0 = CR0
   - p1 = clamp(CR0 * (1 + L), 0, 1)
   - x0 ~ Bin(n0, p0), x1 ~ Bin(n1, p1)
   - compute your estimator from x0, x1
2) Work on log-odds or log risk ratio scale with approximate normality, then transform back.

---

## 4) Cost of delay: coherent but assumption-heavy

### [MED] 4.1 Cost-of-delay is computed separately from EVSI, which can distort net value
**Where:** `cost-of-delay.ts`

Current approach:
- Compute EVSI as if post-test decision affects a full year of value.
- Compute a separate cost-of-delay based on mean lift and subtract.

Potential issues:
- Latency often still delivers some benefit (e.g., you keep treatment on at test split or ramp).
- The cleanest approach is to integrate timing into the EVSI simulation:
  - value during test (split traffic, treatment effect only on variant)
  - value during latency (depends on operational policy)
  - value after decision (ship or not)
- Then compare directly to baseline (“ship now” or “don’t ship now”).

Recommendation:
- Consider moving cost-of-delay into the EVSI Monte Carlo so “net value of testing” is one coherent simulation rather than EVSI minus a separate heuristic.

---

## 5) File-by-file summary (quick)

### `evpi.ts`
- OK: EVPI closed-form for untruncated Normal prior and linear utility is correct.
- Issues:
  - sigma == 0 needs explicit handling.
  - truncation implied elsewhere is not applied here.

### `evsi.ts`
- OK: Normal fast path appears consistent with Bayesian EVSI concept.
- High issue:
  - Monte Carlo decision rule is not posterior-mean based (so not EVSI).
- Additional:
  - add guards for n_control/n_variant == 0
  - harden random sampling

### `distributions.ts`
- OK: general structure for Normal/Uniform/Student-t distributions.
- Issues:
  - Student-t “sigma” meaning and df edge cases (mean/variance existence).
  - sampling should guard against u=0 or u=1 in inverse CDF sampling.

### `statistics.ts`
- OK: normal PDF and approximate CDF.
- Note: tail accuracy may matter for extreme z.

### `derived.ts`
- OK: K and threshold normalization.
- Issue: flags suggest truncation is applied, but it’s not applied consistently.

### `cost-of-delay.ts`
- OK: consistent under stated assumptions.
- Suggestion: integrate into EVSI simulation for coherence.

### `sample-size.ts` / `chart-data.ts`
- Mostly OK.
- Note: Student-t charting range may visually under-represent heavy tails.

---

## 6) Recommended fix order (highest ROI)

1) **Fix EVSI Monte Carlo decision rule**: decide using posterior mean E[L | data], not raw L_hat.
2) **Make truncation consistent**: implement everywhere or remove claims.
3) **Harden sampling**: guard against Math.random() edge cases.
4) **Clarify Student-t inputs**: scale vs SD; df warnings/validation.
5) **Integrate time into EVSI** (optional but improves correctness of “net value of testing”).

