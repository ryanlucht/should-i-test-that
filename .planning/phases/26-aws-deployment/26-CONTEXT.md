# Phase 26: Vercel Deployment - Context

**Gathered:** 2026-04-14
**Status:** Ready for execution
**Pivoted:** 2026-04-14 (from AWS CDK to Vercel — CAVM sandbox account has 3rd-party access restrictions and automated remediation that block production hosting)

<domain>
## Phase Boundary

Deploy the finished Vite/React SPA to Vercel with a custom domain. No backend — this is a static site deployment only. Vercel handles build, CDN, HTTPS, and preview deploys natively.

</domain>

<decisions>
## Implementation Decisions

### Architecture
- **D-01:** Vercel deployment — connect GitHub repo, Vercel auto-builds and deploys the Vite SPA. No infrastructure code needed.
- **D-02:** Add `vercel.json` for SPA rewrites so deep links (e.g., `/calculator?s=...`) work correctly.
- **D-03:** Vercel handles HTTPS, CDN, and edge caching automatically.

### Custom Domain
- **D-04:** Domain is `shouldwetestthat.com`, registered via GoDaddy (user's existing registrar).
- **D-05:** Point domain to Vercel via GoDaddy DNS settings (CNAME or A record per Vercel's instructions).

### CI/CD
- **D-06:** Vercel auto-deploys on push to main (built-in GitHub integration).
- **D-07:** GitHub Actions CI workflow for PR validation (lint, test, build) — separate from Vercel's preview deploys.
- **D-08:** No secrets or OIDC setup needed — Vercel handles auth via GitHub app integration.

### Datadog Instrumentation
- **D-09:** Keep RUM config as-is in `main.tsx` with hardcoded `applicationId`/`clientToken`. Public browser tokens by design.
- **D-10:** No backend Datadog instrumentation needed. Existing RUM SDK handles all client-side observability.

</decisions>

<canonical_refs>
## Canonical References

### Existing App Configuration
- `vite.config.ts` — Build config (Vite + React SWC + Tailwind + comlink for Web Workers)
- `src/main.tsx` — Datadog RUM initialization (hardcoded tokens, PROD-only guard)
- `src/lib/analytics.ts` — Datadog custom event tracking (RUM addAction)
- `package.json` — Build script: `tsc -b && vite build`, outputs to `dist/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Established Patterns
- Vite build outputs to `dist/` — Vercel auto-detects Vite framework and uses this
- Web Workers (comlink) are used for Monte Carlo simulation — produce separate `.js` chunks that must be served correctly
- Datadog RUM is guarded by `import.meta.env.PROD` — local dev never sends telemetry

### Integration Points
- `vercel.json` will be added to repo root for SPA rewrite config
- `.github/workflows/ci.yml` will be added for PR validation
- `package.json` build script is already compatible
- No changes needed to the existing app code — this phase is purely infrastructure

</code_context>

---

*Phase: 26-aws-deployment (pivoted to Vercel)*
*Context gathered: 2026-04-14*
