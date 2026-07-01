# Bharath Health — UX Design System (the "mature tool" rulebook)

> The complete interaction rulebook for every portal, form, page and modal. Codifies the
> patterns mature tools (Claude Code, good IDEs, Linear, Notion) use so the product feels
> organized, dense-but-readable, and predictable everywhere. Pairs with:
> - `ux-visual-standard.md` — type scale, color, hierarchy, density (the *look*).
> - `portal-page-standard.md` — shell, spacing, states, responsiveness (the *layout*).
> This doc = the *components and interactions* (the *behavior*).
>
> **How we use it:** one portal at a time, every screen is checked against the
> per-component rules below; new screens compose these primitives so quality can't
> regress. Note: these are standard interaction patterns (not a copy of any product's
> internals) — codified for our React + Tailwind stack.

---

## 0. Golden rules (apply to everything)
1. **Every icon-only control has a tooltip** naming its action (+ keyboard shortcut if any). No naked icon a user must guess.
2. **Nothing is a dead end** — a number/row/status is clickable to its detail; every list has loading / empty / error states.
3. **One kit, one meaning** — one icon per concept, one color per meaning, one component per job. Same everywhere.
4. **Dense but scannable** — hierarchy (type/weight/color) does the work, not whitespace.
5. **Keyboard-first is possible** — focus rings visible, tab order sane, primary actions have shortcuts.
6. **No silent failure** — every action shows success or a visible error.

---

## 1. Icons + Tooltips (the thing you pointed at)
- **Kit:** Lucide, one icon per concept (search, filter, sort, export, refresh, edit, delete, print, more…). Sizes 14–16px inline, 18–20px nav.
- **Tooltip on every icon-only button** — appears ~300ms after hover, instant for subsequent icons in the same group (skip the delay once one is open). Content = action name, optional `⌘K`-style shortcut on the right. Also `aria-label` for screen readers.
- Color: `gray-400/500` default → `gray-700` on hover; semantic only when it means something (red delete, amber warn).
- **`More` (⋯) menu** for overflow actions instead of a crowded row.
- Spec: `Tooltip` component (Radix-style), `IconButton` (icon + title + aria-label + `:active` scale 0.97).

## 2. Sidebar / navigation (collapsible · resizable · scrollable · organized)
- **Collapsible** to an icon rail (labels → tooltips when collapsed); state persists (localStorage).
- **Resizable width** by dragging the divider (min/max clamp); width persists. Content reflows.
- **Scrolls independently** (its own scroll container) when items overflow; the header/footer of the rail stay pinned.
- **Grouped** by workflow with small group labels; one active item with a *filled* active treatment (not just color).
- Sub-navigation inside a feature = **tabs**, never new sidebar entries.
- Spec: `Sidebar` (collapse toggle in header, `ResizeHandle`, `NavGroup`, `NavItem`).

## 3. Toolbars & data controls (search · sort · filter · export · view)
Every data-heavy page gets a **single-line control bar** (icons + tooltips, collapses to a "Filters" sheet on mobile):
- **Search** — leading magnifier icon, debounced, `⌘F`/`/` to focus, clearable (✕).
- **Filter** — a `Filter` icon button → popover with the real filters; an active-count badge (`Filters · 3`). Simple binary filter = a toggle chip; never a row of word-buttons.
- **Sort** — a `Sort` icon → menu of sortable fields with asc/desc; or sortable **column headers** (click to toggle, show ▲/▼). One active sort indicator.
- **Export** — a `Download` icon → menu (CSV / PDF / Excel as applicable); export respects current filters; disabled + tooltip when nothing to export.
- **View toggle** — segmented icon control (list / board / calendar) where relevant.
- **Refresh** — lives in the app header (per page standard), never in the content bar.
- Spec: `Toolbar`, `SearchInput`, `FilterPopover`, `SortMenu`, `ExportMenu`, `SegmentedToggle`.

## 4. Inputs & fields (forms + inline)
- **Text / number** — label above (Section-label role), inline validation message below in red; units shown as a suffix adornment.
- **Select** — searchable when >7 options; keyboard navigable; a simple binary/short choice → segmented toggle, not a dropdown.
- **Multi-select** — chips with ✕; typeahead to add.
- **Date / date-range** — a single button showing the value → popover calendar; range as one control, never two bare date inputs.
- **Voice / mic** — a `Mic` icon-button on long free-text fields (SOAP, notes, counselling) for dictation; shows a recording state; tooltip "Dictate". (Wire to the browser SpeechRecognition where available; graceful hide otherwise.)
- **Chips / tags** — for tags, allergies, problems: tinted, removable, typeahead add.
- **Field ↔ dictionary:** every clinical field **binds a canonical `field_id`** from the field dictionary (§ field-id-contract). The label is presentation; the id is the truth.
- Spec: `Field`, `Select`, `MultiSelect`, `DateRange`, `MicInput`, `ChipInput`.

## 5. Tables & lists (dense records)
- **Sticky header** (Section-label style), **sortable columns**, **row hover**, optional row selection (checkbox), **zebra optional** for very dense tables.
- Right-align numbers, **mono** for ids/codes/doses, **truncate + tooltip** for long text, status as **badge**.
- **Row actions** = icon buttons revealed on hover + a `⋯` overflow; click row = open detail (drawer/modal).
- **Pagination** or virtualized scroll for long lists; show total count.
- States: loading skeleton rows, empty (with a next action), error (with retry).
- Spec: `DataTable` (columns config, sort, selection, rowActions, empty/loading/error slots).

## 6. Modals & drawers
- **Modal** (centered) for focused create/confirm; **side drawer** (right) for detail/inspect alongside context.
- Header (title + close ✕), scrollable body (internal scroll — never double scroll), footer with actions (primary right).
- Close on ✕ / Esc / backdrop (not for destructive-in-progress); focus trapped; opens from `scale(0.96)+opacity`.
- Destructive confirm modal states the consequence and names the item.
- Spec: `Modal`, `Drawer`, `ConfirmDialog`.

## 7. Buttons & actions
- Hierarchy: **primary** (filled brand), **secondary** (outline), **ghost** (text), **danger** (red), **icon** (§1). One primary per view.
- States: hover, focus ring, `:active` scale 0.97, disabled (with tooltip reason), loading (spinner, no double-submit).

## 8. Feedback
- **Toasts** in one consistent corner; success/info/error variants; auto-dismiss + manual close; swipe/undo where relevant.
- **Inline** validation/errors next to the field/section.
- **Skeletons** for loading (not spinners on content areas); **progress** for long ops.

## 9. Status, badges, tags
- Status = badge (tinted bg + colored text + 1px border). One color per state, identical across portals (pending=amber, done=green, critical=red, info=blue, neutral=gray).

## 10. Command & quick actions (optional, high-leverage)
- A **command palette** (`⌘K`) for global search + jump-to + actions — the fastest way through a dense app. Roll out after the core primitives.

## 11. Keyboard & accessibility
- Visible focus ring on every interactive element; logical tab order; Esc closes overlays; Enter submits.
- Icon-only controls carry `aria-label`; color is never the only signal (pair with icon/text); target size ≥ 28px.
- Shortcuts: `/` or `⌘F` search, `⌘K` palette, `Esc` close, `⌘Enter` submit — shown in tooltips.

## 12. Motion (already built for public; reuse)
- `transform`/`color` transitions only, ≤160–220ms, strong ease-out; `:active` scale; reveal from `opacity+translateY` (never `scale(0)`); honor `prefers-reduced-motion`. Never animate high-frequency actions.

---

## Where each pattern applies (quick matrix)
| Surface | Must use |
|---|---|
| **Page** | shell + sidebar (§2), toolbar (§3), tables/lists (§5), states, header refresh |
| **Form** | fields (§4, dictionary-bound), sections/collapsibles, mic on long text, inline validation, sticky save bar |
| **Modal/Drawer** | §6 + buttons (§7) + focus/keyboard (§11) |
| **Every icon** | tooltip + aria-label (§1) |
| **Every list** | loading/empty/error + click-through (§0.2, §5) |

---

## Rollout plan (one portal at a time, same as agreed)
1. **Build the shared primitive kit** (`frontend/shared/ui/`): `IconButton+Tooltip`, `Sidebar(resizable)`, `Toolbar`, `SearchInput`, `FilterPopover`, `SortMenu`, `ExportMenu`, `DataTable`, `Field/Select/DateRange/MicInput/ChipInput`, `Modal/Drawer/ConfirmDialog`, `Badge`, `Toast`, plus tokens. One source, all portals import it.
2. **Reference screen first** — reskin the **OPD chart** (densest) with the kit; you approve the look/feel on one screen.
3. **Sweep portal by portal** — Provider → Staff → CareChart → Pharmacy → Lab → Imaging → Admin → Patient → Public. Each screen checked against §1–§12.
4. **Lock it** — the primitives ARE the standard; new screens compose them. A lint/checklist in review keeps every page compliant.

*This is the behavior/pattern layer. Combined with the visual standard (hierarchy) and the
page standard (layout), it defines a single mature UX every portal must meet.*
