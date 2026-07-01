# Portal Page Standard — Bharath Health Systems

> The layout & behavior contract every portal page must meet. Applies to all 9 portals.
> Draft v0.1 — rules marked **[user]** were dictated by the product owner; the rest are
> proposed defaults open to revision. A page is not "done" until it satisfies every rule
> that applies to it.

---

## A. App Chrome (shell) — every page

- **A1. [user]** Every page renders inside the standard shell: a **sidebar** + a **header** +
  a **content area**. No page is full-bleed or renders its own competing chrome.
- **A2. [user]** The header carries a **collapse/expand icon** (leftmost) that toggles the
  sidebar (icon-only ↔ full). Collapsed state persists across navigation.
- **A3. [user]** The **top-right of the header** holds, in this order: **Refresh**, **Help &
  Support**, **Notifications** (if any), **Profile**. Identical placement in every portal.
- **A4. [user]** The **Refresh action lives only in the header** — never a refresh button
  inside the content area.
- **A5.** The header shows the **current page title** (and portal/clinic context) and is the
  single place for page-level primary actions that aren't row/section specific.
- **A6.** Header is **sticky**; it never scrolls away with content.

## B. Sidebar (nav)

- **B1.** The sidebar is the **only** navigation surface. Nav items are not duplicated
  elsewhere.
- **B2.** Exactly **one** item is shown active, matching the current route.
- **B3.** Collapsible to an icon rail (A2); labels reappear on expand. Icons are mandatory so
  the collapsed rail stays usable.
- **B4.** Grouping: related destinations are grouped/ordered by workflow, not alphabetically.
  Rarely-used config lives lower or behind a sub-tab (avoid nav bloat).

## C. Content Area

- **C1. [user]** The content area **never repeats navigation** ("no NAV edge") — nav already
  lives in the sidebar/header, so no in-content nav rail, back-to-menu strip, or portal
  switcher inside content.
- **C2. [user]** No **refresh** control in the content area (see A4).
- **C3.** The content area is the **only scroll container**; the shell (header/sidebar) stays
  fixed. No nested scrollbars unless a data table genuinely requires one.
- **C4.** **One `<h1>` per page.** Sub-areas use tabs/sections, not more top-level titles.
- **C5.** Sub-navigation within a feature uses **tabs** (e.g. My Queue / Form Library), not new
  sidebar entries — keeps the nav lean.
- **C6.** Consistent page padding/margins and max content width across pages (shared layout
  tokens, not per-page ad-hoc spacing).

## D. Page States (mandatory — CLAUDE.md §0)

- **D1. Loading** — a skeleton or spinner while data loads; never a blank flash or a frozen
  stale view.
- **D2. Empty** — a clear empty state with what it is + a next action (e.g. "No form
  assignments. Assign one from Form Library").
- **D3. Error** — a visible, human error message with a **Retry** (retry uses the header
  refresh / an inline retry inside the error card, not a content-area refresh button).
- **D4. Success** — the normal populated view.
- **D5.** "Last updated HH:MM" style timestamps are allowed in-content (they are status, not a
  refresh control).

## E. Responsiveness & Layout Flexibility

- **E1.** Every page works from a **narrow** viewport (≈1024px / collapsed sidebar) to
  **wide** without horizontal scroll or clipped controls.
- **E2.** No fixed pixel widths that break layout; grids/flex reflow. Tables scroll internally
  (C3), the page does not.
- **E3.** Long content (chips, titles, lists) **truncates or wraps** gracefully — never pushes
  the layout.
- **E4.** Modals/drawers are centered/anchored and scroll internally when tall; the page behind
  them is locked, not double-scrolling.

## F. Interaction & Feedback

- **F1.** Every mutating action gives feedback: toast/inline success or a visible error
  (no silent failure — CLAUDE.md §0).
- **F2.** Toasts appear in **one consistent location** per portal.
- **F3.** Destructive actions confirm before firing; irreversible ones say so.
- **F4.** Buttons show pending/disabled state during in-flight requests (no double-submit).

## G. Consistency

- **G1.** Shared components (buttons, inputs, badges, cards, modals) come from one kit —
  no bespoke re-styles per page.
- **G2.** Same concept = same label, icon, and color everywhere (a "Refresh" icon is always the
  same icon; a status color means the same thing across pages).
- **G3.** Date/number/currency formatting is consistent (India locale, ₹, DD MMM YYYY).

## H. Role & Data Rules

- **H1.** A page shows only what the current **role** may see; role-gated actions are hidden or
  disabled with a reason, never shown-then-403.
- **H2.** All data is **tenant-scoped** (clinic/branch) — no cross-clinic leakage; scope comes
  from the token, never the URL/body.
- **H3.** A page that reads a shared/HIGH-risk endpoint honors the same auth/refresh pattern as
  its portal family (per CLAUDE.md token map).

---

## Compliance

Each portal page is audited against the rules above and recorded pass/fail with the specific
gap. Fixes bring the page to full compliance before it's marked done. This standard is a living
document — extend it as new cross-cutting rules emerge.
