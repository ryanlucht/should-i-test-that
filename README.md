# Should I Run an A/B Test?

Calculate whether your A/B test is worth running using Expected Value of Information (EVI/EVPI) methodology.

## Overview

Before you invest engineering time and opportunity cost into an A/B test, this tool helps you answer: **Is it worth it?**

Instead of asking "how much will the test cost?", this calculator tells you: **"If you can run this test for less than $X, you should do it!"**

Based on Douglas Hubbard's "How to Measure Anything" Chapter 7.

## Features

- **Maximum Test Budget Calculator**: Get a clear dollar amount for how much your test is worth
- **Revenue Impact Modes**: Simple direct input or calculate from business metrics (conversion rate, AOV, traffic)
- **Distribution Options**: Normal, Uniform, or t-Distribution (fat tails) for realistic uncertainty modeling
- **Interactive Visualization**: See your uncertainty distribution and decision threshold
- **Educational Walkthrough**: Learn the methodology with guided examples

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## How It Works

The tool calculates the **Expected Value of Perfect Information (EVPI)** - the maximum amount you should spend on any measurement that eliminates uncertainty.

Key insight: Information is valuable when your uncertainty **straddles a decision threshold**. If you're already confident about your decision (threshold far from your expected value), there's little value in testing.

### The Calculation

1. **Relative Threshold (RT)**: Where your decision point sits in your uncertainty range (0-1)
2. **EOLF**: Expected Opportunity Loss Factor from Hubbard's lookup table
3. **EVPI** = (EOLF / 1000) × Revenue per % point × Range width

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- D3.js for visualizations
- Vitest for testing

## Project Structure

```
src/
├── components/
│   ├── App.tsx                     # Main app shell
│   ├── LandingPage.tsx             # Introduction
│   ├── ABTestScenario.tsx          # Guided walkthrough
│   ├── ABTestCalculator.tsx        # Free-form calculator
│   ├── InputControls/              # Reusable inputs
│   └── Visualizations/             # D3 charts
├── utils/
│   ├── calculations.ts             # EVPI calculations
│   ├── distributions.ts            # Statistical functions
│   └── revenueCalculator.ts        # Business metric helpers
└── types/
    └── index.ts                    # TypeScript definitions
```

## Related

This is a focused spin-off of the [EVI Calculator](https://github.com/yourusername/evi-calculator) project, specifically tailored for A/B testing decisions.

## License

MIT
