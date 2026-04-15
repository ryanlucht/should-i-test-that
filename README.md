# Should We Test That?

A decision-value calculator that helps you decide whether an A/B test is worth running.

**Try it:** [should-i-test-that.vercel.app](https://should-i-test-that.vercel.app)

## What It Does

Stop guessing whether to run A/B tests. This tool gives you a clear answer:

> **"If you can A/B test this idea for less than $X, it's worth testing."**

Walk through a 5-step wizard -- enter your business metrics, your uncertainty about the change, your shipping threshold, and your experiment design -- and get a dollar value that represents the maximum you should pay to run the test.

## Features

- **5-step guided wizard** -- Baseline, Uncertainty, Threshold, Experiment Design, Results
- **Learning Bits walkthrough** -- an animated guide character explains each step in plain English
- **Shareable analysis URLs** -- copy a link that encodes your full analysis for a colleague
- **Plain-English waterfall** -- a step-by-step narrative explaining the math behind the verdict
- **FAQ explainers** -- accordion cards answering common "why?" questions about the result
- **Live distribution chart** -- visualize your uncertainty prior and shipping threshold
- **PNG export** -- share your analysis in Slack or docs
- **Web Worker Monte Carlo** -- heavy simulation runs off the main thread for a smooth UI
- **No backend required** -- all calculations run in your browser

## Mathematical Foundation

The tool computes **EVSI** (Expected Value of Sample Information) -- the dollar value of running your specific test design -- minus the timing costs of waiting for results. The output is a **net value** that tells you the maximum budget for running the test.

Under the hood:
- Monte Carlo pre-posterior analysis for EVSI with Bayesian posterior-mean decision rule
- Integrated timing simulation for net value (accounts for split traffic during test period and decision latency)
- Prior distributions: Normal, Student-t (fat tails), or Uniform
- Proper truncation at feasibility bounds (lift >= -100%) applied consistently
- Student-t scale calibrated via t-quantile (jStat.studentt.inv) rather than Normal z_0.95

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Tech Stack

- **React 19** + TypeScript
- **Vite** for bundling
- **Tailwind CSS 4** for styling
- **Zustand** for state management (session-persisted)
- **Recharts** for visualization
- **Web Workers** (via Comlink) for non-blocking Monte Carlo
- **Vitest** + React Testing Library for tests

### Project Structure

```
src/
├── components/
│   ├── charts/        # Distribution visualization
│   ├── export/        # PNG export functionality
│   ├── forms/         # Input forms for each wizard step
│   ├── guide/         # Learning Bits overlay and bubble
│   ├── results/       # Verdict, breakdown, waterfall, FAQ cards
│   ├── ui/            # Shared UI components (shadcn/ui)
│   └── wizard/        # Section wrapper, navigation, progress indicator
├── hooks/             # React hooks (useEVSICalculations, useExportPng,
│                      #   useGuideMessages, useScrollSpy, useSharedDiff,
│                      #   useTypewriter)
├── lib/
│   ├── calculations/  # Math: EVSI, distributions, statistics, net value
│   ├── formatting.ts  # Currency and percentage formatting
│   ├── url-codec.ts   # Share URL encoding/decoding
│   └── prior.ts       # Prior distribution construction
├── pages/             # WelcomePage, CalculatorPage
├── stores/            # Zustand store for wizard state
├── types/             # Shared TypeScript types
└── workers/           # Web Worker for EVSI Monte Carlo
```

### Testing

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run a specific test file
npx vitest run src/lib/calculations/evsi.test.ts
```

650+ tests covering:
- Statistical engine (EVSI, net value, prior construction, feasibility bounds)
- Distribution functions (Normal, Student-t, Uniform, truncated)
- Prior distribution calibration and edge cases
- URL codec and share flow (encode, decode, migration)
- React hooks and components
- Accessibility (vitest-axe)

## References

- [Hubbard, "How to Measure Anything"](https://www.howtomeasureanything.com/)
- [Eppo Docs](https://docs.geteppo.com/statistics/confidence-intervals/statistical-nitty-gritty/) -- Default prior N(0, 0.05)
- [Azevedo et al., "A/B Testing with Fat Tails"](https://joseluismontielolea.com/azevedo-et-al-ab.pdf) -- Evidence for fat-tailed experiment outcomes

## Version History

**v2.0** (2026-04) -- Single wizard with guided walkthrough:
- Single 5-step wizard flow (Basic mode removed)
- EVSI-only engine with integrated timing simulation
- Learning Bits animated guide character with per-section dialogue
- Shareable analysis URLs with recipient walkthrough mode
- Plain-English waterfall explaining the verdict step by step
- FAQ accordion explainers for common questions
- 650+ tests (up from 463)

**v1.1** (2026-02-03) -- Statistics engine refinements:
- EVSI uses correct Bayesian posterior-mean decision rule
- Truncation at feasibility bounds applied consistently
- Cost of Delay integrated into coherent timing simulation
- Hardened edge case handling (sigma=0, rare events warnings)
- 463 tests (up from 264)

**v1.0** (2026-02-02) -- Initial release with Basic and Advanced modes

## License

MIT

---

Created by [Ryan Lucht](https://ryanlucht.com) and 100% vibe-coded by Claude Opus 4.5, GPT-5.2 Pro, GPT-Codex-5.2, and Gemini 3 Pro.
