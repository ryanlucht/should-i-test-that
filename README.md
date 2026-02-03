# Should I Test That?

A decision-value calculator that helps you decide whether an A/B test is worth running.

**Try it:** [should-i-test-that.vercel.app](https://should-i-test-that.vercel.app)

## What It Does

Stop guessing whether to run A/B tests. This tool gives you a clear answer:

> **"If you can A/B test this idea for less than $X, it's worth testing."**

Enter your business metrics, your uncertainty about the change, and your shipping threshold — and get a dollar value that represents the maximum you should pay to run the test.

## Two Modes

### Basic Mode
Uses **EVPI** (Expected Value of Perfect Information) — an optimistic ceiling on what testing could ever be worth. Perfect for quick sanity checks.

**Inputs:**
- Baseline conversion rate
- Annual visitors/sessions
- Value per conversion
- Your uncertainty (90% confidence interval on lift)
- Shipping threshold

**Output:** Maximum test cost worth paying (EVPI)

### Advanced Mode
Uses **EVSI** (Expected Value of Sample Information) minus **Cost of Delay** — a realistic estimate for your specific test design.

**Additional inputs:**
- Prior shape (Normal, Student-t, Uniform)
- Traffic split and test duration
- Daily traffic and eligibility fraction
- Decision latency

**Output:** Net value of testing = EVSI − Cost of Delay

## Features

- **5-step wizard** — guided flow for non-statisticians
- **Live distribution chart** — visualize your uncertainty and threshold
- **Supporting explanations** — probability of clearing threshold, chance of regret
- **PNG export** — share your analysis in Slack or docs
- **No backend required** — all calculations run in your browser

## Mathematical Foundation

Based on decision theory concepts from Douglas Hubbard's *How to Measure Anything* (Chapter 7):

- **EVPI** = Expected opportunity loss under your prior beliefs
- **EVSI** = Value of imperfect information from a specific test design
- **Cost of Delay** = Opportunity cost of waiting for test results (integrated into simulation)

The tool uses:
- Closed-form Normal formulas for EVPI (Basic mode)
- Monte Carlo pre-posterior analysis for EVSI with Bayesian posterior-mean decision rule (Advanced mode)
- Proper truncation at feasibility bounds (lift ≥ -100%) applied consistently across all calculations
- Integrated timing simulation for net value (accounts for split traffic during test period)

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
- **Zustand** for state management
- **Recharts** for visualization
- **Web Workers** for non-blocking Monte Carlo
- **Vitest** + React Testing Library for tests

### Project Structure

```
src/
├── components/
│   ├── charts/        # Distribution visualization
│   ├── export/        # PNG export functionality
│   ├── forms/         # Input forms for each wizard step
│   ├── results/       # Verdict and supporting cards
│   └── ui/            # Shared UI components (shadcn/ui)
├── hooks/             # React hooks (useEVPICalculations, useEVSICalculations)
├── lib/
│   ├── calculations/  # Math: EVPI, EVSI, distributions, statistics
│   └── formatting.ts  # Currency and percentage formatting
├── stores/            # Zustand store for wizard state
└── workers/           # Web Worker for EVSI Monte Carlo
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

463 tests covering:
- Statistical primitives (PDF, CDF, truncated distributions)
- EVPI and EVSI calculations (including edge cases)
- Distribution functions (Normal, Student-t, Uniform)
- Net value integration with timing effects
- React hooks and components
- Accessibility (vitest-axe)

## References

- [Hubbard, "How to Measure Anything"](https://www.howtomeasureanything.com/) — Chapter 7 on the value of information
- [Eppo Docs](https://docs.geteppo.com/statistics/confidence-intervals/statistical-nitty-gritty/) — Default prior N(0, 0.05)
- [Azevedo et al., "A/B Testing with Fat Tails"](https://joseluismontielolea.com/azevedo-et-al-ab.pdf) — Evidence for fat-tailed experiment outcomes

## Version History

**v1.1** (2026-02-03) — Statistics engine refinements based on external audit:
- EVSI uses correct Bayesian posterior-mean decision rule
- Truncation at feasibility bounds applied consistently
- Cost of Delay integrated into coherent timing simulation
- Hardened edge case handling (sigma=0, rare events warnings)
- 463 tests (up from 264)

**v1.0** (2026-02-02) — Initial release with Basic and Advanced modes

## License

MIT

---

Built with decision theory and caffeine.
