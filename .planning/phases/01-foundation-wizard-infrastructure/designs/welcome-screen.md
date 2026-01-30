# Welcome Screen Design Specification

**Generated:** 2026-01-30
**Design System:** Datadog-adjacent visual language
**Target:** Desktop-first (1200px max-width), mobile-friendly

---

## Overview

The Welcome screen introduces users to "Should I Test That?" and enables mode selection between Basic and Advanced modes. It establishes the product's value proposition and guides users to self-select the appropriate mode for their needs.

---

## Layout Structure

```
+----------------------------------------------------------+
|                        HEADER                             |
|  Logo/Title                                               |
+----------------------------------------------------------+
|                                                           |
|                     HERO SECTION                          |
|                                                           |
|            "Should I Test That?"                          |
|                                                           |
|     Subheadline explaining what the tool does             |
|                                                           |
+----------------------------------------------------------+
|                                                           |
|     +------------------+    +------------------+          |
|     |                  |    |                  |          |
|     |   BASIC MODE     |    |  ADVANCED MODE   |          |
|     |      CARD        |    |      CARD        |          |
|     |                  |    |                  |          |
|     +------------------+    +------------------+          |
|                                                           |
+----------------------------------------------------------+
|                                                           |
|              [ Get Started ]  (CTA button)                |
|                                                           |
+----------------------------------------------------------+
|                        FOOTER                             |
|  Optional: links, attribution                             |
+----------------------------------------------------------+
```

### Container

- **Max width:** 1200px
- **Horizontal padding:** 24px (mobile), 48px (tablet), 64px (desktop)
- **Center aligned** within viewport
- **Min-height:** 100vh (fills viewport)

---

## Component Hierarchy

### 1. Header

```
Header
  - Logo/Brand mark (optional - can be text-only)
  - Title text: "Should I Test That?" (can also be hero headline only)
```

**Specifications:**
- Height: 64px
- Background: transparent or subtle gradient
- Padding: 16px 24px
- Position: static (not sticky on welcome screen)

### 2. Hero Section

```
Hero
  - Headline: h1
  - Subheadline: p
```

**Content:**
- **Headline:** "Should I Test That?"
- **Subheadline:** "Find out if your A/B test is worth running. Get a clear answer: 'If you can test this for less than $X, it's worth it.'"

**Specifications:**
- Headline:
  - Font size: 48px (desktop), 36px (tablet), 28px (mobile)
  - Font weight: 700 (bold)
  - Color: `--text-primary` (#1A1A2E or similar dark navy)
  - Line height: 1.2
  - Margin bottom: 16px
- Subheadline:
  - Font size: 18px (desktop), 16px (mobile)
  - Font weight: 400 (regular)
  - Color: `--text-secondary` (#6B7280 or similar gray)
  - Line height: 1.5
  - Max width: 600px (centered)
  - Margin bottom: 48px

### 3. Mode Selection Cards

```
ModeSelectionGroup (radio group semantics)
  - ModeCard (Basic)
    - Icon
    - Title
    - Description
    - Feature list
    - Selection indicator
  - ModeCard (Advanced)
    - Icon
    - Title
    - Description
    - Feature list
    - Selection indicator
```

**Card Grid:**
- Display: flex or CSS grid
- Gap: 24px
- Justify: center
- Max cards width: 360px each
- Cards side-by-side on desktop/tablet, stacked on mobile (< 640px)

---

## Mode Card Component

### Structure

```
+------------------------------------------+
|  [Icon]                                   |
|                                           |
|  Mode Title                               |
|  Short description                        |
|                                           |
|  - Feature bullet 1                       |
|  - Feature bullet 2                       |
|  - Feature bullet 3                       |
|                                           |
+------------------------------------------+
```

### Content

**Basic Mode Card:**
- **Icon:** Simplified chart icon or lightning bolt (speed/simplicity)
- **Title:** "Basic Mode"
- **Description:** "Quick estimate, fewer inputs"
- **Features:**
  - EVPI calculation (max test value ceiling)
  - 3 business inputs
  - Guided prior selection

**Advanced Mode Card:**
- **Icon:** Detailed chart icon or sliders (precision/control)
- **Title:** "Advanced Mode"
- **Description:** "Precise value, more inputs"
- **Features:**
  - EVSI calculation (realistic test value)
  - Test design inputs
  - Cost of Delay analysis

### Card Specifications

**Dimensions:**
- Width: 100% of container, max 360px
- Min height: 280px
- Padding: 24px
- Border radius: 12px

**Default State:**
- Background: `--surface-primary` (#FFFFFF)
- Border: 2px solid `--border-default` (#E5E7EB)
- Box shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

**Hover State:**
- Border color: `--border-hover` (#C9CCD1)
- Box shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Transform: translateY(-2px)
- Transition: all 0.2s ease

**Selected State:**
- Border color: `--accent-primary` (#7C3AED - purple/indigo)
- Border width: 2px
- Box shadow: 0 0 0 3px rgba(124, 58, 237, 0.15)
- Background: `--surface-selected` (very subtle purple tint, #F9F5FF)

**Disabled State (future use):**
- Opacity: 0.5
- Pointer events: none
- Grayscale filter: 50%

### Card Content Styling

**Icon:**
- Size: 40px x 40px
- Color: `--accent-primary` (#7C3AED)
- Margin bottom: 16px

**Title:**
- Font size: 20px
- Font weight: 600 (semi-bold)
- Color: `--text-primary`
- Margin bottom: 8px

**Description:**
- Font size: 14px
- Font weight: 400
- Color: `--text-secondary`
- Margin bottom: 16px

**Feature List:**
- List style: none (custom bullets)
- Bullet: checkmark icon or small dot in `--accent-primary`
- Font size: 14px
- Color: `--text-secondary`
- Line height: 1.6
- Gap between items: 8px

**Selection Indicator:**
- Position: top-right corner of card
- Hidden in default state
- Selected state: checkmark circle in `--accent-primary`
- Size: 24px
- Alternatively: radio button style indicator

---

## CTA Button

### Structure

```
Button (primary)
  - Text: "Get Started"
  - Optional: arrow icon
```

### Specifications

**Dimensions:**
- Min width: 200px
- Height: 48px
- Padding: 12px 32px
- Border radius: 8px

**Default State:**
- Background: `--accent-primary` (#7C3AED)
- Text color: #FFFFFF
- Font size: 16px
- Font weight: 600
- Box shadow: 0 2px 4px rgba(124, 58, 237, 0.3)

**Hover State:**
- Background: `--accent-hover` (#6D28D9 - darker purple)
- Box shadow: 0 4px 8px rgba(124, 58, 237, 0.4)
- Transform: translateY(-1px)

**Active State:**
- Background: `--accent-active` (#5B21B6)
- Transform: translateY(0)

**Disabled State:**
- Background: `--surface-disabled` (#E5E7EB)
- Text color: `--text-disabled` (#9CA3AF)
- Cursor: not-allowed

**Focus State:**
- Outline: 2px solid `--accent-primary`
- Outline offset: 2px

---

## Color Tokens

### Primary Palette (Datadog-inspired)

```css
:root {
  /* Text */
  --text-primary: #1A1A2E;
  --text-secondary: #6B7280;
  --text-disabled: #9CA3AF;
  --text-inverse: #FFFFFF;

  /* Surfaces */
  --surface-background: #F9FAFB;
  --surface-primary: #FFFFFF;
  --surface-selected: #F9F5FF;
  --surface-disabled: #E5E7EB;

  /* Borders */
  --border-default: #E5E7EB;
  --border-hover: #C9CCD1;
  --border-selected: #7C3AED;

  /* Accent (Purple/Indigo) */
  --accent-primary: #7C3AED;
  --accent-hover: #6D28D9;
  --accent-active: #5B21B6;
  --accent-light: #EDE9FE;

  /* Success */
  --success-primary: #10B981;
  --success-light: #D1FAE5;

  /* Warning */
  --warning-primary: #F59E0B;
  --warning-light: #FEF3C7;

  /* Error */
  --error-primary: #EF4444;
  --error-light: #FEE2E2;
}
```

---

## Typography Scale

```css
:root {
  /* Font Family */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font Sizes */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  --text-5xl: 48px;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;
}
```

---

## Spacing Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Small tablets, large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
```

### Responsive Behavior

**Mobile (< 640px):**
- Cards stack vertically
- Card width: 100%
- Headline: 28px
- Reduced padding: 16px
- Hero section padding-top: 48px

**Tablet (640px - 1023px):**
- Cards side by side
- Card width: calc(50% - 12px)
- Headline: 36px
- Standard padding: 24px

**Desktop (1024px+):**
- Cards side by side with max-width
- Card width: 360px max
- Headline: 48px
- Generous padding: 64px

---

## Interaction States Summary

| Element | Default | Hover | Selected | Focus | Disabled |
|---------|---------|-------|----------|-------|----------|
| Mode Card | White bg, gray border | Elevated shadow, border darkens | Purple border, purple tint bg, checkmark | Purple outline | 50% opacity, grayscale |
| CTA Button | Purple bg | Darker purple, elevated | n/a | Purple outline | Gray bg, muted text |

---

## Accessibility Notes

### Keyboard Navigation
- Tab order: Cards (as radio group) -> CTA button
- Arrow keys navigate between cards within the radio group
- Enter/Space selects card and can activate CTA
- Focus states must be visible (outline)

### Screen Reader
- Cards use `role="radio"` within `role="radiogroup"`
- Selected card: `aria-checked="true"`
- CTA button disabled until selection made (with `aria-disabled`)
- Announce mode descriptions

### Color Contrast
- All text meets WCAG AA (4.5:1 for normal text, 3:1 for large)
- Selected state not communicated by color alone (checkmark indicator)
- Focus outlines are 3:1 contrast minimum

### Motion
- Respect `prefers-reduced-motion`
- Disable transforms and transitions when reduced motion preferred

---

## Animation & Transitions

```css
/* Base transition */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;

/* Card hover */
.mode-card {
  transition: transform var(--transition-normal),
              box-shadow var(--transition-normal),
              border-color var(--transition-normal);
}

/* Button hover */
.cta-button {
  transition: background-color var(--transition-fast),
              transform var(--transition-fast),
              box-shadow var(--transition-fast);
}
```

---

## Implementation Notes

### Component Structure (React)

```tsx
// Suggested component hierarchy
<WelcomePage>
  <WelcomeHeader />
  <HeroSection>
    <Headline />
    <Subheadline />
  </HeroSection>
  <ModeSelectionGroup value={mode} onChange={setMode}>
    <ModeCard
      value="basic"
      title="Basic Mode"
      description="Quick estimate, fewer inputs"
      features={['EVPI calculation', '3 business inputs', 'Guided prior']}
    />
    <ModeCard
      value="advanced"
      title="Advanced Mode"
      description="Precise value, more inputs"
      features={['EVSI calculation', 'Test design inputs', 'Cost of Delay']}
    />
  </ModeSelectionGroup>
  <CTAButton disabled={!mode} onClick={handleGetStarted}>
    Get Started
  </CTAButton>
</WelcomePage>
```

### State Requirements
- Selected mode stored in wizard state (Zustand)
- Mode persists when navigating back from calculator
- No selection = CTA disabled

---

## Visual Reference

The design should evoke Datadog's aesthetic:
- Clean white cards on subtle gray background
- High contrast text with clear hierarchy
- Purple as the hero accent color (CTAs, selection states)
- Subtle shadows and gradients for depth
- Rounded corners throughout (8-12px)
- Plenty of whitespace
- Professional yet approachable tone

---

*Design spec for: Phase 01, Plan 02*
*Locked decisions honored: Two-page architecture, mode selection cards on welcome*
