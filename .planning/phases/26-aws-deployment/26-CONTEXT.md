# Phase 26: AWS Deployment - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the finished Vite/React SPA to AWS serverless infrastructure (S3 + CloudFront) with a custom domain, following the Datadog community-golden-paths repo as the architectural template. No backend — this is a static site deployment only.

</domain>

<decisions>
## Implementation Decisions

### Architecture
- **D-01:** Frontend-only deployment — strip the golden paths template down to just the `WebAppConstruct` (S3 + CloudFront + BucketDeployment). Remove Lambda, DynamoDB, SQS, API Gateway. The app is a pure client-side SPA with no backend API.
- **D-02:** Use AWS CDK (TypeScript) as the IaC tool, following the golden paths pattern. The CDK stack lives in an `infra/` directory at the repo root.
- **D-03:** S3 bucket is private (BLOCK_ALL public access) with CloudFront OAC (Origin Access Control) for secure access. 403/404 errors redirect to `/index.html` for SPA client-side routing.

### Custom Domain
- **D-04:** Domain is `shouldwetestthat.com`, registered via GoDaddy (user's existing registrar).
- **D-05:** DNS managed via Route 53 hosted zone in AWS. User will point GoDaddy nameservers to Route 53 NS records (one-time manual step — phase plan should include step-by-step instructions).
- **D-06:** ACM certificate for `shouldwetestthat.com` (and `www.shouldwetestthat.com`) in `us-east-1` region (required for CloudFront). DNS validation via Route 53.
- **D-07:** CloudFront distribution configured with custom domain aliases and the ACM certificate.

### CI/CD
- **D-08:** GitHub Actions with OIDC for AWS authentication (no static AWS keys). Follow the golden paths `deploy.yml` pattern.
- **D-09:** Push to `main` triggers auto-deploy. Workflow: checkout → install → build → CDK deploy → output CloudFront URL.
- **D-10:** Required GitHub Secrets: `AWS_ROLE_ARN` (IAM role for OIDC), `AWS_REGION`. No `DD_API_KEY` needed since there's no Lambda/backend instrumentation.

### Datadog Instrumentation
- **D-11:** Keep RUM config as-is in `main.tsx` with hardcoded `applicationId`/`clientToken`. These are public browser tokens by design — no security benefit from env vars, and it avoids build config complexity.
- **D-12:** No backend Datadog instrumentation needed (no Lambda). The existing RUM SDK in the browser bundle handles all client-side observability.

### Claude's Discretion
- CDK stack naming convention and resource tagging
- CloudFront cache policy details (CACHING_OPTIMIZED for static assets is the golden paths default)
- Whether to add `www.` redirect (CloudFront can handle both `shouldwetestthat.com` and `www.shouldwetestthat.com`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Golden Paths Template (primary reference)
- `/Users/ryan.lucht/community-golden-paths/infra/lib/constructs/webApp.ts` — The WebAppConstruct to adapt: S3 bucket, CloudFront distribution, BucketDeployment with local build bundling
- `/Users/ryan.lucht/community-golden-paths/infra/lib/serverless-golden-path-stack.ts` — Full stack for reference, but only the `WebAppConstruct` instantiation is relevant
- `/Users/ryan.lucht/community-golden-paths/.github/workflows/deploy.yml` — GitHub Actions OIDC deploy pattern to follow
- `/Users/ryan.lucht/community-golden-paths/.github/workflows/ci.yml` — CI validation pattern for PRs
- `/Users/ryan.lucht/community-golden-paths/README.md` — Architecture docs, env vars, prerequisites

### Existing App Configuration
- `vite.config.ts` — Build config (Vite + React SWC + Tailwind + comlink for Web Workers)
- `src/main.tsx` — Datadog RUM initialization (hardcoded tokens, PROD-only guard)
- `src/lib/analytics.ts` — Datadog custom event tracking (RUM addAction)
- `package.json` — Build script: `tsc -b && vite build`, outputs to `dist/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WebAppConstruct` from golden paths (`webApp.ts`) can be adapted almost directly — it already handles S3 + CloudFront + SPA routing + Vite build
- `deploy.yml` from golden paths provides the OIDC + CDK deploy GitHub Actions workflow

### Established Patterns
- Vite build outputs to `dist/` — the BucketDeployment needs to point at this directory
- Web Workers (comlink) are used for Monte Carlo simulation — these produce separate `.js` chunks in the build output that must be served correctly from S3/CloudFront
- Datadog RUM is guarded by `import.meta.env.PROD` — local dev never sends telemetry

### Integration Points
- `infra/` directory will be added to repo root (new CDK project)
- `.github/workflows/` will be added for CI/CD
- `package.json` build script is already compatible (`tsc -b && vite build`)
- No changes needed to the existing app code — this phase is purely infrastructure

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants to follow the golden paths repo structure/patterns as closely as possible
- GoDaddy → Route 53 nameserver delegation needs step-by-step instructions since user wants hands-on guidance
- ACM certificate DNS validation via Route 53 should be documented in the plan
- OIDC trust setup for GitHub Actions needs detailed IAM policy/role instructions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-aws-deployment*
*Context gathered: 2026-04-14*
