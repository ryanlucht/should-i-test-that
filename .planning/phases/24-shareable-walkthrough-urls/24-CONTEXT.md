# Phase 24: Shareable Walkthrough URLs - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Encode all calculator inputs into a compact shareable URL. Recipients land directly on the pre-filled calculator with Learning Bits guidance enabled. Share button in results section with clipboard copy. Schema versioning for forward compatibility.

</domain>

<decisions>
## Implementation Decisions

### Share Button Placement & UX
- **D-01:** Share button lives inside `EVSIVerdictCard` — the primary results card users focus on after getting their answer.
- **D-02:** Button uses icon + text format: share/link icon + **"Share This Analysis (I'll explain it for you!)"** — the copy ties into Learning Bits explaining the analysis to the recipient.
- **D-03:** After click, button switches to checkmark + "Copied!" for 2 seconds, then reverts to original state.
- **D-04:** Share button only appears after results are computed (not visible/disabled before). No button in the results section until all inputs are complete and EVSI is calculated.
- **D-05:** Button should use a secondary/outline variant to not compete with the verdict card's primary message.

### Guided Mode for Recipients
- **D-06:** Shared URLs skip the homepage entirely — recipients land directly on the calculator page with all inputs hydrated from the URL.
- **D-07:** Learning Bits guide is enabled by default for recipients (set `guideEnabled=true` when hydrating from URL).
- **D-08:** Recipients can freely edit all pre-filled inputs. Modified fields get a visual indicator (e.g., subtle highlight or badge) showing "this was changed from the shared values." This lets recipients explore "what if" scenarios while tracking what they've modified.
- **D-09:** Guide dialogue uses the same 8 messages for recipients as for first-time visitors — no custom copy needed. The existing messages already explain each section's purpose.

### Claude's Discretion
- **URL encoding strategy:** base64url JSON with short keys, hash fragment vs query params, compression approach — Claude decides the most compact approach that stays under ~400 chars for typical scenarios.
- **Schema versioning:** Integer version in the encoded payload, migration chain design — Claude decides the forward-compatibility mechanism.
- **Visual diff indicator for modified fields:** Exact styling of the "this field was changed" indicator — Claude decides (subtle border, background tint, small badge, etc.) as long as it's noticeable but not distracting.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### State & Types
- `src/types/wizard.ts` — `WizardInputs` interface (all ~15 fields that need encoding), `initialInputs` defaults
- `src/stores/wizardStore.ts` — Zustand store with `guideEnabled`, `setInput`, session persistence logic

### Results Section
- `src/components/results/EVSIVerdictCard.tsx` — Primary results card where share button will be added
- `src/components/results/index.ts` — Results section barrel exports

### Calculator Page
- `src/pages/CalculatorPage.tsx` — Page routing, section management, guide wiring
- `src/pages/WelcomePage.tsx` — Homepage that shared URLs should bypass

### App Routing
- `src/App.tsx` — Page state management (`type Page = 'welcome' | 'calculator'`), entry point for URL detection

### Requirements
- `.planning/REQUIREMENTS.md` §Share — SHARE-01 through SHARE-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` component (`src/components/ui/button.tsx`): outline/secondary variants available for share button
- `useWizardStore` Zustand store: already persists `inputs` and `guideEnabled` to sessionStorage — URL hydration can use the same `setInput` actions
- `WizardInputs` type: well-defined interface with ~15 fields and `initialInputs` defaults for comparison (needed for modified-field detection)

### Established Patterns
- Zustand with sessionStorage persistence — URL hydration should integrate with this pattern, not replace it
- Section-based progressive disclosure — all sections unlock sequentially, so hydrated inputs need to mark appropriate sections as completed

### Integration Points
- `App.tsx` page routing: needs to detect URL params on mount and route directly to calculator (bypassing welcome)
- `CalculatorPage.tsx`: needs to hydrate store from URL params before first render
- `EVSIVerdictCard.tsx`: share button added here
- No existing URL/routing library — this is greenfield

</code_context>

<specifics>
## Specific Ideas

- The share button copy "I'll explain it for you!" references Learning Bits walking the recipient through the analysis — this is a key brand moment
- Modified-field visual diff: recipients should be able to see at a glance which inputs they've changed vs. what was shared

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-shareable-walkthrough-urls*
*Context gathered: 2026-04-06*
