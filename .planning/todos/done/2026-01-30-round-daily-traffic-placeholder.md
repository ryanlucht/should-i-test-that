---
created: 2026-01-30T17:10
title: Round Daily Eligible Traffic placeholder value
area: ui
files:
  - src/components/forms/ExperimentDesignForm.tsx
---

## Problem

The "Daily Eligible Traffic" placeholder in Advanced Mode shows a non-round number which is confusing. User requested it be changed to a round number like "5,000" for clarity.

## Solution

Update the placeholder attribute in ExperimentDesignForm.tsx to use "5,000" or similar round number.
