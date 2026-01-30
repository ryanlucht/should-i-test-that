# Phase 6: Export & Polish - Research

**Researched:** 2026-01-30
**Domain:** PNG Export, Accessibility (WCAG 2.1 AA), Design Consistency
**Confidence:** HIGH

## Summary

Phase 6 involves three main concerns: (1) PNG image export of results, (2) accessibility audit to WCAG 2.1 AA, and (3) design consistency fixes (purple accent across all interactive elements).

The PNG export will use `html-to-image` to capture a composed export card (not a direct screenshot) containing the verdict, key inputs, and mini distribution chart. The accessibility audit will use `vitest-axe` for automated testing combined with manual verification of keyboard navigation and color+text redundancy. Design consistency is straightforward CSS token updates.

**Primary recommendation:** Use `html-to-image` for PNG generation (simpler than recharts-to-png, works on any DOM element), add `vitest-axe` for accessibility testing, and update CSS to use the existing `--primary` token consistently.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html-to-image | ^1.11.13 | Convert DOM to PNG | Simpler than canvas-based approaches, widely used (543 dependents), works on any HTML element |
| vitest-axe | ^1.0.0-rc.3 | Accessibility testing in Vitest | Purpose-built for Vitest, wraps axe-core, compatible with jsdom environment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver | ^2.0.5 | Trigger file download | When blob download needed, but can use native `<a>` download instead |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html-to-image | recharts-to-png | recharts-to-png is Recharts-specific; html-to-image works on composed DOM including non-chart elements |
| html-to-image | dom-to-image-more | Similar API, dom-to-image-more has more recent updates but html-to-image is better documented |
| file-saver | Native download | Native `<a download>` works for data URLs without extra dependency |

**Installation:**
```bash
npm install html-to-image
npm install --save-dev vitest-axe
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── export/
│       ├── ExportCard.tsx       # Hidden render target for PNG
│       ├── ExportButton.tsx     # Trigger button with loading state
│       └── ExportPreview.tsx    # Optional: preview modal before export
├── hooks/
│   └── useExportPng.ts          # Hook wrapping html-to-image logic
└── lib/
    └── accessibility.ts         # ARIA utility functions if needed
```

### Pattern 1: Hidden Render Target for Export
**What:** Render a separate, styled component specifically for export rather than capturing the live UI.
**When to use:** When export content differs from live UI (e.g., square format, custom title, no interactivity needed).
**Example:**
```typescript
// Source: Common pattern for image export
function useExportPng() {
  const exportRef = useRef<HTMLDivElement>(null);

  const exportPng = async (filename: string) => {
    if (!exportRef.current) return;

    const dataUrl = await toPng(exportRef.current, {
      pixelRatio: 2, // High DPI for crisp output
      backgroundColor: '#FFFFFF',
      width: 1080,
      height: 1080,
    });

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  return { exportRef, exportPng };
}
```

### Pattern 2: Accessibility Testing in Vitest
**What:** Use vitest-axe matcher to assert no accessibility violations.
**When to use:** For all component tests, especially interactive elements.
**Example:**
```typescript
// Source: https://github.com/chaance/vitest-axe
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Pattern 3: ARIA Live Regions for Dynamic Content
**What:** Use `aria-live="polite"` for status updates that don't require immediate attention.
**When to use:** When result values change dynamically (e.g., EVPI calculation result).
**Example:**
```typescript
// Source: WCAG 2.1 SC 4.1.3 Status Messages
<div role="status" aria-live="polite">
  {loading ? 'Calculating...' : `Result: ${formatCurrency(value)}`}
</div>
```

### Anti-Patterns to Avoid
- **Capturing live UI directly:** Results in inconsistent output (scroll position, hover states, etc.)
- **Using `aria-live="assertive"` for non-critical updates:** Interrupts user experience
- **Color-only status indicators:** Must include text redundancy (WCAG 1.4.1)
- **Positive tabindex values:** Creates unpredictable tab order

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM to PNG | Canvas drawing code | html-to-image | Handles SVG foreignObject, CSS transforms, cross-origin issues |
| Accessibility testing | Manual checklist only | vitest-axe + manual testing | Automated catches 30-50% of issues; manual catches rest |
| File download | Custom fetch/blob handling | Native `<a download>` or file-saver | Browser-native is simpler for data URLs |
| Focus management | Manual tabindex juggling | Native focus order + semantic HTML | Sequential Tab order (per CONTEXT.md) uses natural DOM order |

**Key insight:** For PNG export, the complexity is in proper CSS/SVG rendering, not in canvas basics. html-to-image handles the edge cases (web fonts, CSS transforms, etc.).

## Common Pitfalls

### Pitfall 1: html-to-image Version Issues
**What goes wrong:** Recent versions after 1.11.11 had image export bugs (per npm reports).
**Why it happens:** Library uses SVG foreignObject which has browser quirks.
**How to avoid:** Lock to version ^1.11.13 (latest stable), test export on target browsers.
**Warning signs:** Blank images, missing styles, CORS errors.

### Pitfall 2: axe-core Color Contrast in jsdom
**What goes wrong:** Color contrast checks don't work in jsdom environment.
**Why it happens:** jsdom doesn't compute styles the same way browsers do.
**How to avoid:** Don't rely on automated tests for color contrast; verify manually or with browser DevTools.
**Warning signs:** False passes on contrast violations.

### Pitfall 3: Export Button Timing
**What goes wrong:** saveAs must run within user interaction event; setTimeout breaks it.
**Why it happens:** Browser security prevents programmatic downloads without user gesture.
**How to avoid:** Keep download trigger synchronous with click handler (or use async/await within handler).
**Warning signs:** Download silently fails on some browsers.

### Pitfall 4: ARIA Live Region Initialization
**What goes wrong:** Screen reader doesn't announce content on first render.
**Why it happens:** Live region must exist in DOM before content changes for AT to monitor it.
**How to avoid:** Render live region empty on mount, inject content after 2+ seconds if adding dynamically.
**Warning signs:** First announcement missed, subsequent updates work.

### Pitfall 5: Hardcoded Colors in Recharts
**What goes wrong:** Chart uses `#7C3AED` directly instead of CSS variable.
**Why it happens:** Recharts doesn't support CSS custom properties natively.
**How to avoid:** This is acceptable for the chart; just ensure consistency with design token value.
**Warning signs:** Colors drift between chart and UI if design tokens change.

## Code Examples

Verified patterns from official sources:

### PNG Export with html-to-image
```typescript
// Source: https://github.com/bubkoo/html-to-image
import { toPng } from 'html-to-image';

async function exportToPng(element: HTMLElement, filename: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: '#FFFFFF',
    pixelRatio: 2,  // For retina displays
    width: 1080,
    height: 1080,
    style: {
      // Override any styles for export
      margin: '0',
      borderRadius: '0',
    },
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
```

### vitest-axe Setup
```typescript
// src/test/setup.ts - add to existing setup
import 'vitest-axe/extend-expect';

// In test file:
import { axe } from 'vitest-axe';

test('ResultsSection is accessible', async () => {
  const { container } = render(<ResultsSection />);
  expect(await axe(container)).toHaveNoViolations();
});
```

### ARIA Live Region for Results
```typescript
// Pattern for dynamic result updates
function VerdictCard({ value, loading }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading}
    >
      {loading ? (
        <span className="sr-only">Calculating result...</span>
      ) : (
        <span>
          If you can test for less than {formatCurrency(value)}, it's worth it.
        </span>
      )}
    </div>
  );
}
```

### Focus Ring Consistency
```css
/* Ensure purple focus rings on all interactive elements */
/* Already in index.css via Tailwind theme, but verify button.tsx uses --ring */
.focus-visible\:ring-ring\/50 {
  --tw-ring-color: var(--ring); /* Maps to purple in theme */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas | html-to-image | ~2021 | html-to-image uses SVG foreignObject (better CSS support) vs canvas drawImage |
| jest-axe | vitest-axe | ~2023 | Same API, purpose-built for Vitest |
| @axe-core/react | axe DevTools or vitest-axe | 2024 | @axe-core/react deprecated, doesn't support React 18+ |

**Deprecated/outdated:**
- **@axe-core/react**: Deprecated by Deque, no React 18+ support. Use vitest-axe for tests or axe DevTools browser extension for dev-time checking.
- **recharts-to-png v2**: Only compatible with Recharts 2.x. v3 required for Recharts 3.x.

## Open Questions

Things that couldn't be fully resolved:

1. **Custom title field UX for export**
   - What we know: User can add custom title/idea name before exporting (per CONTEXT.md)
   - What's unclear: Should this be an inline edit on the export card, or a separate input field?
   - Recommendation: Planner decides based on UX flow. Simplest is text input above export button.

2. **Export button placement**
   - What we know: Claude's discretion per CONTEXT.md
   - What's unclear: Should it be in NavigationButtons area, or within ResultsSection?
   - Recommendation: Add to ResultsSection footer (after supporting cards) as a secondary action. Keep NavigationButtons for wizard flow only.

3. **Filename convention**
   - What we know: Claude decides per CONTEXT.md
   - What's unclear: Include timestamp? Sanitize custom title?
   - Recommendation: `should-i-test-{timestamp}.png` or `{sanitized-custom-title}-{timestamp}.png`

## Sources

### Primary (HIGH confidence)
- [html-to-image GitHub](https://github.com/bubkoo/html-to-image) - API documentation, options
- [vitest-axe GitHub](https://github.com/chaance/vitest-axe) - Setup and usage
- [WCAG 2.1 Techniques](https://www.w3.org/WAI/WCAG21/Techniques/) - ARIA live regions (ARIA23)

### Secondary (MEDIUM confidence)
- [npm html-to-image](https://www.npmjs.com/package/html-to-image) - Version info (v1.11.13)
- [file-saver npm](https://www.npmjs.com/package/file-saver) - Download trigger requirements
- [ARIA Live Regions Guide](https://www.uxpin.com/studio/blog/aria-live-regions-for-dynamic-content/) - Best practices

### Tertiary (LOW confidence)
- WebSearch results on recharts export approaches - Community patterns, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are well-documented with clear use cases
- Architecture: HIGH - Patterns are standard React/DOM manipulation
- Pitfalls: MEDIUM - Some based on community reports, not directly verified

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (stable domain, 30-day validity)
