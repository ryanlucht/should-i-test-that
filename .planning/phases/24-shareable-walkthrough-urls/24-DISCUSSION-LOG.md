# Phase 24: Shareable Walkthrough URLs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 24-shareable-walkthrough-urls
**Areas discussed:** Share button placement & UX, Guided mode for recipients

---

## Share Button Placement & UX

### Q1: Where should the Share button live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside EVSIVerdictCard | Next to the verdict headline — most visible spot | ✓ |
| Standalone row below results | Dedicated share/export row beneath results cards | |
| In the sticky header area | Always visible once results computed | |

**User's choice:** Inside EVSIVerdictCard (Recommended)
**Notes:** None

### Q2: What should the Share button look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + text button | Share icon + "Share" label, switches to "Copied!" | |
| Icon-only button | Just a share/link icon with tooltip | |
| Full CTA button | Prominent "Share This Analysis" button | |

**User's choice:** Icon + text button with custom copy: "Share This Analysis (I'll explain it for you!)"
**Notes:** User specified the button copy should reference Learning Bits explaining the analysis to the recipient

### Q3: Button visibility timing

| Option | Description | Selected |
|--------|-------------|----------|
| Only after results | Button appears when results section computes | ✓ |
| Always visible, disabled | Grayed out until results ready | |

**User's choice:** Only after results (Recommended)
**Notes:** None

---

## Guided Mode for Recipients

### Q1: Where should recipients land?

| Option | Description | Selected |
|--------|-------------|----------|
| Straight to calculator, pre-filled | Skip homepage, land on calculator with inputs hydrated | ✓ |
| Homepage first | Modified welcome page, then to pre-filled calculator | |
| Results-first view | Jump to results with "Walk me through this" button | |

**User's choice:** Straight to calculator, pre-filled (Recommended)
**Notes:** None

### Q2: Editability for recipients

| Option | Description | Selected |
|--------|-------------|----------|
| Fully editable | Recipients can tweak any input freely | |
| View-only with "Make a copy" | Inputs locked, "Make My Own" button to clone | |
| Editable but with visual diff | Editable, changed fields highlighted | ✓ |

**User's choice:** Editable but with visual diff
**Notes:** Recipients can edit freely, but changed fields get a visual indicator showing what was modified from the shared values

### Q3: Guide dialogue for recipients

| Option | Description | Selected |
|--------|-------------|----------|
| Same guide messages | Same 8 messages regardless — already explain each section | ✓ |
| Modified intro message only | M1 changes for recipients, rest stays same | |
| Fully customized messages | All 8 rewritten for recipient context | |

**User's choice:** Same guide messages (Recommended)
**Notes:** None

## Claude's Discretion

- URL encoding strategy (base64url JSON, short keys, compression)
- Schema versioning mechanism (integer version, migration chain)
- Visual diff indicator styling for modified fields

## Deferred Ideas

None
