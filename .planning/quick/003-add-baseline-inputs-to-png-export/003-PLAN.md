---
quick: 003
type: execute
files_modified:
  - src/components/export/ExportCard.tsx
  - src/components/export/ExportButton.tsx
autonomous: true

must_haves:
  truths:
    - "PNG export shows baseline conversion rate"
    - "PNG export shows annual visitors with unit label"
    - "PNG export shows value per conversion"
  artifacts:
    - path: "src/components/export/ExportCard.tsx"
      provides: "Baseline metrics card in export layout"
      contains: "Baseline Metrics"
    - path: "src/components/export/ExportButton.tsx"
      provides: "Passes baseline data to ExportCard"
      contains: "baselineConversionRate"
  key_links:
    - from: "src/components/export/ExportButton.tsx"
      to: "src/components/export/ExportCard.tsx"
      via: "baseline props"
      pattern: "baseline.*="
---

<objective>
Add baseline metrics (conversion rate, annual visitors, value per conversion) to the PNG export card.

Purpose: Give exported images full context by including the business inputs that drive the calculation.
Output: ExportCard renders a "Baseline Metrics" card with all three baseline values.
</objective>

<context>
@src/components/export/ExportCard.tsx
@src/components/export/ExportButton.tsx
@src/lib/formatting.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add baseline metrics props and card to ExportCard</name>
  <files>src/components/export/ExportCard.tsx</files>
  <action>
    Add new props to ExportCardProps interface:
    - baselineConversionRate: number (decimal, e.g., 0.025 for 2.5%)
    - annualVisitors: number
    - visitorUnitLabel: string (e.g., "visitors", "sessions")
    - valuePerConversion: number (dollars)

    Add a "Baseline Metrics" card in the Key Inputs Grid section. Insert it BEFORE the existing "Your belief (prior)" card so the order is: Baseline Metrics -> Prior -> Threshold -> (EVSI/CoD in advanced).

    For Basic mode: grid stays 2 columns (now 3 cards, so 2+1 layout)
    For Advanced mode: grid stays 4 columns (now 5 cards total)

    Card structure (matching existing card styling):
    - Title: "Baseline Metrics"
    - Value line 1: conversion rate formatted as percentage (e.g., "2.5% conversion rate")
    - Value line 2: annual visitors with unit label and smart number format (e.g., "1M visitors/year")
    - Value line 3: value per conversion as currency (e.g., "$50/conversion")

    Use existing formatSmartCurrency for value, formatNumber for visitors, and manual percentage formatting for rate (multiply decimal by 100, toFixed(2), add %).
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>ExportCard accepts baseline props and renders Baseline Metrics card</done>
</task>

<task type="auto">
  <name>Task 2: Pass baseline data from ExportButton to ExportCard</name>
  <files>src/components/export/ExportButton.tsx</files>
  <action>
    Extract baseline values from sharedInputs and pass to ExportCard:
    - baselineConversionRate={sharedInputs.baselineConversionRate ?? 0}
    - annualVisitors={sharedInputs.annualVisitors ?? 0}
    - visitorUnitLabel={sharedInputs.visitorUnitLabel}
    - valuePerConversion={sharedInputs.valuePerConversion ?? 0}

    The sharedInputs already contains all these fields. Just add the props to the ExportCard component invocation.
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>ExportButton passes baseline data to ExportCard</done>
</task>

<task type="auto">
  <name>Task 3: Run lint and verify export visually</name>
  <files>src/components/export/ExportCard.tsx, src/components/export/ExportButton.tsx</files>
  <action>
    Run lint to ensure code quality. Then provide manual verification steps for the user.
  </action>
  <verify>`npm run lint` passes with no errors</verify>
  <done>Code is linted and ready for manual verification</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` - TypeScript compiles without errors
2. `npm run lint` - No linting errors
3. Manual: Load the app, complete all sections, export PNG, verify baseline metrics appear
</verification>

<success_criteria>
- PNG export includes "Baseline Metrics" card with conversion rate, annual visitors, and value per conversion
- Values are formatted appropriately (percentage, number with K/M notation, currency)
- Layout remains visually balanced in both Basic and Advanced modes
- TypeScript and lint pass
</success_criteria>

<output>
After completion, report:
- Files modified
- How to manually verify (export a PNG and check for baseline metrics)
</output>
