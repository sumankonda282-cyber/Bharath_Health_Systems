# UX Visual Standard — dense, readable, "IDE-grade" (all portals)

> Extends `portal-page-standard.md` (which covers layout/spacing/states). This layer is
> about **visual hierarchy and text differentiation** — the thing that was missing:
> pages look flat, text isn't differentiated, so a data-dense screen is hard to read.
> Goal = the feel of a mature tool (like the Claude Code / a good IDE): a single page can
> hold a LOT of text and still be instantly scannable, because type, weight, color and
> subtle structure do the work — **NOT extra whitespace/gaps** (density stays tight).

## The core problem to fix
Right now most text is one size/one weight/one gray → everything reads at the same
"volume", so the eye can't find the important bits. Maturity = a clear **hierarchy**:
label < value < heading, muted < normal < emphasized, so scanning is effortless.

---

## 1. Type scale (the backbone — differentiation, not size inflation)
Four roles, applied everywhere. Small absolute sizes (dense), big *contrast* between roles.

| Role | Style | Use |
|---|---|---|
| **Section label** | 11px · UPPERCASE · tracking-wide · `gray-400` · semibold | "CHIEF COMPLAINT", "SUBJECTIVE", column headers |
| **Primary value** | 14px · `gray-900` · semibold | the actual content (a complaint, a name, a result) |
| **Secondary** | 12px · `gray-500` · normal | supporting detail, sub-labels |
| **Meta** | 11px · `gray-400` | timestamps, ids, hints |
| **Mono** | 12px · mono · `gray-500` | IDs, codes, MRN, LOINC, doses |

One `<h1>`/page (page title in header). In-content, use the **Section label** role — never big marketing headings.

## 2. Color = meaning, never decoration
- **Text hierarchy:** `gray-900` (primary) → `gray-600` (secondary) → `gray-400` (meta). This alone creates most of the readability.
- **Surfaces (elevation by tone, not heavy shadow):** page `#F0F4F8` → card `#FFFFFF` + 1px `gray-200` border → popover white + soft shadow. Medium depth: **1px borders + a subtle shadow**, never 3D bevels/gradients.
- **Semantic accents (one meaning each, consistent across all portals):** navy=primary/brand, red=critical/allergy, amber=warning/pending, green=done/normal, blue=info. A color must mean the same thing on every page.
- Status always = a **badge** (tinted bg + colored text + 1px border), never bare colored text.

## 3. Density with structure (how one page holds a lot of text)
- Group related fields into a **labeled block**: a Section label row + its values, separated by a hairline `divider` (`border-gray-100`) — **segmentation by lines/tone, not blank space.**
- **Key–value rows:** label (Secondary, fixed width) + value (Primary) on one line; wraps gracefully. This packs demographics/vitals/results tightly and readably.
- **Tables** for repeating data: sticky header (Section-label style), zebra or hover row, right-aligned numbers, mono for codes, truncate-with-tooltip. Tables > stacks of cards for dense lists.
- **Collapsible sections** (chevron) for secondary content (Previous History, ROS) so the page stays scannable but everything is one click away.

## 4. Icons (proper, consistent — like the reference)
- One kit (Lucide), one icon per concept, everywhere. Nav = icon + label; dense toolbars/row-actions = **icon-only + tooltip**.
- Icons carry meaning at small sizes (14–16px), colored only when semantic (red allergy, amber alert). Decorative icons stay `gray-400`.

## 5. Sidebar & shell (organized, collapsible)
- Collapsible to an **icon rail** (state persists) — labels return on expand; grouped by workflow; one active item with a clear active treatment (filled, not just color).
- Sub-navigation inside a feature = **tabs**, never new sidebar items.
- Header: page title + context left; refresh/help/profile right (per page standard).

## 6. Interaction polish (medium, not flashy)
- Hover: subtle bg/border shift. Focus: a visible ring. Press: `scale(0.97)`. Transitions `transform`/`color` only, ≤160ms, strong ease-out (the motion layer already built for public).
- Never animate high-frequency actions.

---

## How we roll it out (proposal)
1. **Shared primitives** — a small set of components/classes encoding the above:
   `SectionLabel`, `KeyValue`, `DataTable`, `Badge`, `Card`, `Collapsible`, and the
   type/color tokens. One source, imported by all portals (like the motion layer).
2. **Reference page first** — reskin the **OPD chart** with these primitives (it's the
   densest, most-scrutinised page). You review the "look" on one page before we sweep.
3. **Sweep portal by portal** — apply the primitives; no layout/gap changes, purely
   hierarchy/differentiation/icons.
4. **Lock it** — the primitives ARE the standard; new pages compose them, so maturity
   can't regress.

*This is the hierarchy/readability layer. It changes how text and structure look, not
the spacing — density stays tight, legibility goes up.*
