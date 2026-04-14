# Phase 26: AWS Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 26-aws-deployment
**Areas discussed:** Hosting architecture, Domain & DNS, CI/CD, Datadog config

---

## Hosting Architecture (Scope)

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend only | Just S3 + CloudFront + BucketDeployment. Simplest, cheapest, matches the app. | ✓ |
| Keep full stack scaffold | Keep Lambda/DynamoDB/SQS placeholders even though they're unused now. | |

**User's choice:** Frontend only
**Notes:** App is a pure SPA with no backend API. No reason to keep backend scaffolding.

---

## Domain Name

| Option | Description | Selected |
|--------|-------------|----------|
| shoulditestthat.com | Matches the project name directly | |
| should-i-test-that.com | Hyphenated version | |
| Something else | User types in | ✓ |

**User's choice:** shouldwetestthat.com
**Notes:** User will buy/register via GoDaddy (existing registrar)

---

## Domain Registrar

| Option | Description | Selected |
|--------|-------------|----------|
| Route 53 | Register + DNS in one place | |
| External registrar | Point nameservers to Route 53 | ✓ |
| You decide | Claude's discretion | |

**User's choice:** GoDaddy (external registrar) with Route 53 for DNS
**Notes:** User uses GoDaddy for all domains. Wants step-by-step guidance for NS delegation.

---

## CI/CD Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions + OIDC | Follow golden paths pattern, auto-deploy on push to main | ✓ |
| Manual deploys via CLI | Run cdk deploy locally | |
| GitHub Actions with static keys | Less secure, simpler | |

**User's choice:** GitHub Actions + OIDC
**Notes:** Follows the golden paths deploy.yml pattern exactly

---

## Datadog Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | RUM clientToken hardcoded in main.tsx, public token by design | ✓ |
| Move to env vars | VITE_DD_APPLICATION_ID / VITE_DD_CLIENT_TOKEN at build time | |

**User's choice:** Keep as-is
**Notes:** Client tokens are public by design (shipped in browser bundle regardless). No security benefit from env vars.

---

## Claude's Discretion

- CDK stack naming convention and resource tagging
- CloudFront cache policy details
- www redirect handling

## Deferred Ideas

None — discussion stayed within phase scope
