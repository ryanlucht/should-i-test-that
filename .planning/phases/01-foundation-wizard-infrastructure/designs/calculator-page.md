# Calculator Page Design Specification

**Generated:** 2026-01-30
**Design System:** Datadog-adjacent visual language
**Target:** Desktop-first (1200px max-width), mobile-friendly

---

## Overview

The Calculator page is a single scrollable page containing all wizard sections (Baseline Metrics, Uncertainty, Shipping Threshold, Results). Future sections appear dramatically disabled until prior sections are completed. A sticky mini-indicator tracks progress.

---

## Page Layout Structure

```
+----------------------------------------------------------+
|                    STICKY HEADER                          |
|  Logo/Title        [Basic] [Advanced]     (mode toggle)   |
+----------------------------------------------------------+
|                  STICKY PROGRESS INDICATOR                |
|     (1)-----(2)-----(3)-----(4)                          |
+----------------------------------------------------------+
|                                                           |
|  +------------------------------------------------------+ |
|  |  SECTION 1: Baseline Metrics                         | |
|  |  [Enabled - full contrast, interactive]              | |
|  |                                                      | |
|  |  ... section content ...                             | |
|  |                                                      | |
|  |  [Back]  [Next]                                      | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  |  SECTION 2: Uncertainty (Prior)                      | |
|  |  [Disabled - 40% opacity, grayscale]                 | |
|  |                                                      | |
|  |  (content visible but muted, no overlay text)        | |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  |  SECTION 3: Shipping Threshold                       | |
|  |  [Disabled - dramatically muted]                     | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  |  SECTION 4: Results                                  | |
|  |  [Disabled - dramatically muted]                     | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### Page Container

- **Max width:** 800px (narrower than welcome for form focus)
- **Horizontal padding:** 16px (mobile), 24px (tablet), 32px (desktop)
- **Center aligned** within viewport
- **Background:** `--surface-background` (#F9FAFB)
- **Scroll behavior:** smooth

---

## Component Hierarchy

```
CalculatorPage
  - StickyHeader
    - Logo/Title
    - ModeToggle (segmented buttons)
  - StickyProgressIndicator
    - ProgressDot (x4)
  - SectionsContainer
    - Section (Baseline Metrics)
    - Section (Uncertainty)
    - Section (Shipping Threshold)
    - Section (Results)
```

---

## Sticky Header Component

### Structure

```
+----------------------------------------------------------+
|  Should I Test That?         [Basic] [Advanced]           |
+----------------------------------------------------------+
```

### Specifications

**Dimensions:**
- Height: 56px
- Position: sticky
- Top: 0
- Z-index: 100

**Styling:**
- Background: `--surface-primary` (#FFFFFF)
- Border bottom: 1px solid `--border-default` (#E5E7EB)
- Box shadow (when scrolled): 0 2px 8px rgba(0, 0, 0, 0.08)
- Padding: 0 24px
- Display: flex
- Justify-content: space-between
- Align-items: center

**Title:**
- Font size: 18px
- Font weight: 600
- Color: `--text-primary`
- Can be clickable (returns to welcome)

### Mode Toggle (Segmented Buttons)

```
+-------+----------+
| Basic | Advanced |
+-------+----------+
```

**Container:**
- Display: inline-flex
- Background: `--surface-background` (#F9FAFB)
- Border radius: 8px
- Padding: 4px
- Gap: 0

**Segment Button (inactive):**
- Padding: 8px 16px
- Border radius: 6px
- Background: transparent
- Color: `--text-secondary`
- Font size: 14px
- Font weight: 500

**Segment Button (active):**
- Background: `--surface-primary` (#FFFFFF)
- Color: `--text-primary`
- Box shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

**Hover (inactive only):**
- Background: rgba(0, 0, 0, 0.04)

**Transition:**
- All: 0.15s ease

---

## Sticky Progress Indicator Component

### Structure

```
+----------------------------------------------------------+
|     (1)---------(2)---------(3)---------(4)               |
|   Baseline   Uncertainty  Threshold   Results             |
+----------------------------------------------------------+
```

### Specifications

**Container:**
- Position: sticky
- Top: 56px (below header)
- Z-index: 90
- Height: 64px (with labels) or 48px (dots only)
- Background: `--surface-primary` with subtle gradient fade at bottom
- Border bottom: 1px solid `--border-default`
- Display: flex
- Justify-content: center
- Align-items: center
- Padding: 12px 24px

### Progress Dot Component

**Dot Structure:**
```
   [ number or checkmark ]
          |
      (connector line)
          |
       [label]
```

**Dot States:**

| State | Appearance |
|-------|------------|
| Future (not yet reachable) | Gray border, gray number, muted |
| Available (current or next) | Purple border, purple number |
| Active (currently viewing) | Purple fill, white number |
| Completed | Green fill, white checkmark |

**Dot Dimensions:**
- Size: 28px x 28px
- Border radius: 50% (circle)
- Border width: 2px
- Font size: 14px (number)
- Checkmark icon size: 14px

**Dot Colors:**

| State | Background | Border | Text/Icon |
|-------|------------|--------|-----------|
| Future | transparent | `--border-default` (#E5E7EB) | `--text-disabled` (#9CA3AF) |
| Available | transparent | `--accent-primary` (#7C3AED) | `--accent-primary` |
| Active | `--accent-primary` | `--accent-primary` | #FFFFFF |
| Completed | `--success-primary` (#10B981) | `--success-primary` | #FFFFFF |

**Connector Line:**
- Width: 40px (desktop), 24px (mobile)
- Height: 2px
- Color (incomplete): `--border-default`
- Color (complete): `--success-primary`
- Position: between dots, vertically centered

**Labels (optional, can hide on mobile):**
- Font size: 12px
- Font weight: 500
- Color: matches dot state color
- Position: below dot
- Truncate on mobile or hide entirely

### Mobile Adaptation

On mobile (< 640px):
- Keep horizontal layout
- Reduce connector width
- Labels can abbreviate ("Base", "Prior", "Thresh", "Result") or hide
- Dots remain same size for touch targets

---

## Section Wrapper Component

### Structure

```
+----------------------------------------------------------+
|  SECTION HEADER                                           |
|  [number circle]  Section Title                           |
+----------------------------------------------------------+
|                                                           |
|  SECTION CONTENT                                          |
|                                                           |
|  ... inputs, charts, explanations ...                     |
|                                                           |
+----------------------------------------------------------+
|  SECTION FOOTER                                           |
|  [Back]                                      [Next]       |
+----------------------------------------------------------+
```

### Section Card Specifications

**Dimensions:**
- Width: 100%
- Margin bottom: 24px
- Padding: 24px (mobile: 16px)
- Border radius: 12px

**Scroll Offset:**
- **scroll-margin-top: 128px** (accounts for sticky header 56px + indicator 64px + 8px buffer)
- Apply to section or use scroll-mt-32 (Tailwind)

**IntersectionObserver Config:**
- **rootMargin: "-128px 0px -50% 0px"**
- Triggers when section top crosses 128px from viewport top
- Bottom threshold at 50% ensures active section changes appropriately

### Enabled State

**Card Styling:**
- Background: `--surface-primary` (#FFFFFF)
- Border: 1px solid `--border-default` (#E5E7EB)
- Box shadow: 0 1px 3px rgba(0, 0, 0, 0.08)

**Section Header:**
- Display: flex
- Align-items: center
- Gap: 12px
- Padding bottom: 16px
- Border bottom: 1px solid `--border-default`
- Margin bottom: 24px

**Number Circle (enabled):**
- Size: 32px
- Background: `--accent-primary` (#7C3AED)
- Color: #FFFFFF
- Border radius: 50%
- Font size: 14px
- Font weight: 600

**Section Title (enabled):**
- Font size: 18px
- Font weight: 600
- Color: `--text-primary`

**Content Area:**
- All form inputs, charts, explanations fully interactive
- No opacity reduction

**Footer:**
- Display: flex
- Justify-content: space-between
- Padding top: 24px
- Border top: 1px solid `--border-default`
- Margin top: 24px

### Disabled State (PURELY VISUAL)

This is a key design feature - future sections should be clearly "not yet available" through visual treatment alone, without explanatory text overlays.

**Card Styling:**
- Background: `--surface-primary`
- Border: 1px solid `--border-default`
- Box shadow: none
- **Opacity: 0.4** (heavy reduction)
- **Filter: grayscale(100%)**
- **Pointer-events: none** (cannot interact)

**No overlay text.** The disabled state communicates purely through:
- Heavy opacity reduction (40%)
- Full grayscale filter
- No interactive affordances

**Number Circle (disabled):**
- Background: `--border-default` (#E5E7EB)
- Color: `--text-disabled` (#9CA3AF)

### Comparison Table

| Property | Enabled | Disabled |
|----------|---------|----------|
| Opacity | 1 | 0.4 |
| Grayscale | none | 100% |
| Pointer events | auto | none |
| Box shadow | subtle | none |
| Interactivity | full | none |

---

## Navigation Buttons

### Structure

```
+----------------------------------------------------------+
|  [Back]                                      [Next]       |
+----------------------------------------------------------+
```

### Back Button (Secondary)

**Dimensions:**
- Min width: 100px
- Height: 40px
- Padding: 10px 20px
- Border radius: 8px

**Default State:**
- Background: transparent
- Border: 1px solid `--border-default`
- Color: `--text-secondary`
- Font size: 14px
- Font weight: 500

**Hover State:**
- Background: `--surface-background`
- Border color: `--border-hover`
- Color: `--text-primary`

**Disabled State (Section 1):**
- Hidden or visually disabled
- Opacity: 0.5
- Cursor: not-allowed

### Next Button (Primary)

**Dimensions:**
- Min width: 120px
- Height: 40px
- Padding: 10px 24px
- Border radius: 8px

**Default State:**
- Background: `--accent-primary` (#7C3AED)
- Border: none
- Color: #FFFFFF
- Font size: 14px
- Font weight: 600

**Hover State:**
- Background: `--accent-hover` (#6D28D9)

**Disabled State (validation not passed):**
- Background: `--surface-disabled` (#E5E7EB)
- Color: `--text-disabled`
- Cursor: not-allowed

### Button Labels

- Section 1: [hidden/disabled Back] [Next]
- Section 2: [Back] [Next]
- Section 3: [Back] [Calculate]
- Section 4 (Results): [Back] [Export Results] or [Start Over]

---

## Scroll Behavior

### Smooth Scrolling

When user clicks "Next":
1. Validate current section
2. If valid, mark section complete
3. Enable next section
4. Smooth scroll to next section
5. Update progress indicator

```javascript
// Scroll behavior
element.scrollIntoView({
  behavior: 'smooth',
  block: 'start'
});
```

### IntersectionObserver for Active Section

Track which section is currently "in view" to update progress indicator:

```javascript
const options = {
  root: null, // viewport
  rootMargin: '-128px 0px -50% 0px',
  threshold: 0
};

// Section enters view when top crosses 128px from viewport top
// Active section changes when >50% of previous section scrolls out
```

### Scroll Position Requirements

- **scroll-margin-top: 128px** on each section
- Accounts for: header (56px) + indicator (64px) + buffer (8px)
- Tailwind: `scroll-mt-32` (128px)

---

## Section Content Placeholders

### Section 1: Baseline Metrics
- Conversion rate input (%)
- Annual visitors input (integer with unit label)
- Value per conversion input ($)
- Helper text for each input

### Section 2: Uncertainty (Prior)
- Default prior selection (radio/toggle)
- Custom 90% interval inputs
- Live-updating distribution chart
- Mean and interval display

### Section 3: Shipping Threshold
- Scenario selection (3 cards/radio options)
- Conditional threshold input ($ or %)
- Threshold visualization on chart

### Section 4: Results
- EVPI verdict card
- Supporting explanation cards
- Chart with threshold and regret shading
- Export button
- "Try Advanced mode" prompt (if in Basic)

---

## Color Tokens Reference

(Same as welcome-screen.md for consistency)

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

  /* Success (Completed) */
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

## Responsive Breakpoints

### Mobile (< 640px)
- Header: title may truncate, mode toggle smaller
- Progress indicator: dots only, no labels or abbreviated labels
- Sections: 16px padding, full-width cards
- Buttons: full-width or side-by-side with equal width

### Tablet (640px - 1023px)
- Standard layout
- Progress indicator shows abbreviated labels
- Sections: 20px padding

### Desktop (1024px+)
- Full layout with all labels
- Sections: 24px padding
- Max-width container (800px)

---

## Accessibility Notes

### Keyboard Navigation
- Tab through all interactive elements in order
- Enter advances from one section to next (when focused on Next button)
- Escape could close any open tooltips/drawers
- Focus trapped within enabled sections only

### Screen Reader
- Sections marked with `role="region"` and `aria-labelledby`
- Progress indicator: announce current step "Step 2 of 4: Uncertainty"
- Disabled sections: `aria-disabled="true"`, announce "locked" state
- Form inputs have associated labels

### Focus Management
- When section completes, focus moves to first input of next section
- Skip links could jump between sections
- Focus visible on all interactive elements

### Color Contrast
- All enabled text meets WCAG AA
- Disabled state contrast is intentionally reduced but overlay message is high contrast
- Progress indicator states not communicated by color alone (number vs checkmark)

---

## Animation & Transitions

### Section Enable Animation

When section becomes enabled:
```css
.section-enabling {
  animation: sectionEnable 0.4s ease-out;
}

@keyframes sectionEnable {
  from {
    opacity: 0.4;
    filter: grayscale(100%);
  }
  to {
    opacity: 1;
    filter: grayscale(0%);
  }
}
```

### Progress Dot Transitions

```css
.progress-dot {
  transition: background-color 0.2s ease,
              border-color 0.2s ease,
              transform 0.2s ease;
}

.progress-dot.completing {
  animation: dotComplete 0.3s ease-out;
}

@keyframes dotComplete {
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

### Scroll Animation

```css
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

---

## Implementation Notes

### Component Structure (React)

```tsx
<CalculatorPage>
  <StickyHeader>
    <Logo />
    <ModeToggle value={mode} onChange={setMode} />
  </StickyHeader>

  <StickyProgressIndicator
    sections={['Baseline', 'Uncertainty', 'Threshold', 'Results']}
    currentSection={activeSection}
    completedSections={completedSections}
  />

  <SectionsContainer>
    <Section
      id="baseline"
      number={1}
      title="Baseline Metrics"
      enabled={true}
      completed={completedSections.includes('baseline')}
    >
      <BaselineMetricsForm />
      <SectionFooter
        onBack={null}
        onNext={handleBaselineNext}
        nextDisabled={!baselineValid}
      />
    </Section>

    <Section
      id="uncertainty"
      number={2}
      title="Uncertainty (Prior)"
      enabled={completedSections.includes('baseline')}
      completed={completedSections.includes('uncertainty')}
    >
      <UncertaintyForm />
      <SectionFooter
        onBack={handleBackToBaseline}
        onNext={handleUncertaintyNext}
        nextDisabled={!uncertaintyValid}
      />
    </Section>

    {/* ... more sections ... */}
  </SectionsContainer>
</CalculatorPage>
```

### State Requirements (Zustand)

```typescript
interface WizardState {
  mode: 'basic' | 'advanced';
  currentSection: number;
  completedSections: string[];
  formData: {
    baseline: BaselineData | null;
    uncertainty: UncertaintyData | null;
    threshold: ThresholdData | null;
  };

  // Actions
  setMode: (mode: 'basic' | 'advanced') => void;
  completeSection: (sectionId: string) => void;
  goToSection: (sectionId: string) => void;
  updateFormData: (section: string, data: any) => void;
}
```

---

## Technical Specifications Summary

| Spec | Value |
|------|-------|
| Header height | 56px |
| Progress indicator height | 64px (with labels) / 48px (dots only) |
| Total sticky height | 120px (desktop) |
| scroll-margin-top | 128px |
| IntersectionObserver rootMargin | "-128px 0px -50% 0px" |
| Section card border-radius | 12px |
| Section card padding | 24px (desktop) / 16px (mobile) |
| Section gap | 24px |
| Progress dot size | 28px |
| Disabled section opacity | 0.4 |
| Disabled section grayscale | 100% |
| Container max-width | 800px |

---

*Design spec for: Phase 01, Plan 02*
*Locked decisions honored: Single scrollable page, dramatically disabled future sections, sticky mini-indicator with numbered dots and checkmarks, generic Back/Next buttons, mode toggle in header*
