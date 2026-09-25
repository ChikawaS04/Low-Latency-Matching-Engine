# Build Guide — Phase 8: UI Refinement

**Status:** COMPLETE (2026-09-15). P8-0 through P8-8 all done and green. P8-7's
acceptance run surfaced three layout regressions from P8-4 / P8-5 (depth curve
clipped, depth bids clipped at high Depth, controls column spilling); P8-8 (Panel
layout and overflow) fixed all three with the page-scroll model, and its re-run
is clean. Two items are deferred to Phase 9 because they need a wire/engine change
that Phase 8's presentation-only lock excludes: deepening the server BOOK depth
prefix past the 10-level-per-side cap, and turning the Depth selector into a
scrolling viewport so the themed depth-pane scrollbar engages. See "Deferred to
Phase 9" at the end of P8-8.

## Purpose

Phase 7 made the terminal read like a real one. Phase 8 refines its surface:
a coherent typographic system, an Interactive-Brokers-style neutral palette,
uniform themed scrollbars, corrected scroll-region sizing, and removal of the
FIX teaching annotations that do not belong on a working ticket.

This phase is presentation only. It adds no engine capability, no protocol
support, no reducer logic, and no synthetic order flow. Every change lives in
`styles/terminal.css`, in component markup and labels, or in font assets.

## Design direction

- Institutional, not neon. Flat neutral charcoal, one brand red, a muted
  institutional green, a single steel-blue accent used sparingly. Less blue
  tint than the current GitHub-dark theme.
- A real order ticket does not print tag numbers next to its fields. The
  tag-level view already lives in the FIX inspector; the ticket shows plain
  labels and values.
- Token names stay stable. Component code references colours and fonts through
  the existing CSS variables, so a palette or type change is a value swap in one
  place, not a churn across components.
- No marketing chrome, consistent with Phase 7. Nothing invented for a
  screenshot.

## Explicitly out of scope

- Participant harness, trading bots, agent design or implementation. Paused,
  deferred to a later phase. Phase 8 is UI only.
- Any change to `MatchingEngine`, the wire contract, `messages.ts`, or reducer
  accumulation logic. The one permitted reducer touch is removing a display, not
  changing state (see P8-6).
- L3 depth, per-level order counts, new panels, or any functional behaviour
  change. Depth and tape stay L2.
- LLM anything. Not this project.

## Carried constraints

These are as-built facts the phase designs around, not problems to fix here.

1. **Colour flows through tokens.** `DepthCurve`, `TradeTape` tick colouring, and
   the ladder all reference semantic tokens (`var(--bid)`, `var(--ask)`,
   `var(--bid-bar)`, `var(--ask-bar)`, and the background/panel/text set). A
   palette swap must keep every token name so no component edit is forced.
2. **Cents stay internal.** Dollars exist only at the format edge. No visual
   change touches a price value, only its typeface and colour.
3. **Tests assert specific text and testids.** Several suites assert the presence
   of labels this phase removes or renames (P8-6). Those assertions are revised
   in the same step, flagged explicitly, never silently deleted.
4. **One chat per step.** Each PN step is greenlit before code; as-built notes
   with the confirmed-green result are appended after.

---

## P8-0 — Reconciliation ✅

**Goal:** resolve every open question below before any code is written. No
deliverables beyond written answers appended to this guide.

**Questions:**

- **Q8-1 — Token inventory.** Enumerate every colour-bearing CSS variable defined
  in `styles/terminal.css` `:root` today (names and current values), and list any
  component that hardcodes a colour instead of reading a token. P8-2 cannot swap
  values safely until the full token surface and any hardcoded strays are known.
- **Q8-2 — Font delivery.** Confirm the mechanism: self-hosted via
  `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` npm packages
  (preferred for a local Vite app, no external CDN, deterministic build) versus a
  linked web font. Confirm the current base font declaration and where it is set
  (`terminal.css`, `index.html`, or a global).
- **Q8-3 — Numeric cell coverage.** Identify which cells must switch to the mono
  tabular face (prices, sizes, totals, IDs, timestamps, spread, mid, bps, volume,
  filled/total) versus which stay sans (labels, headers, buttons, status words).
  This is the map P8-1 applies.
- **Q8-4 — Removed-label test dependencies.** Find every test assertion that
  references the labels P8-6 removes or renames: the header session identity
  fields and `MsgSeqNum` (`header.render.test.tsx`), the field tag labels and the
  "Primitive: ... cents" annotation and the "AUTO, CLIENT-ASSIGNED" caption
  (`orderEntry.test.tsx`), and the `ClOrdId` / `OrigClOrdID` field labels
  (`orderEntry.test.tsx`, `cancelTicket.test.tsx`). P8-6 revises exactly these and
  no others.
- **Q8-5 — Depth pane height policy.** CONFIRMED: each pane sizes to the selected
  Depth (8 / 10 / 14) levels per side and scrolls only when the server prefix
  exceeds the visible window. Recorded here; drives P8-4.

**Dependencies:** none.

> **Resolved (P8-0).** Answers reconciled against as-built source read directly
> from the working tree (`app/frontend/src/**`, `app/frontend/test/**`,
> `index.html`, `package.json`), not from this guide's prose. Two of the four
> questions returned findings that correct the kickoff's own expectations; both
> are called out below rather than papered over, because they change what P8-1,
> P8-2, and P8-6 do. `conversation_search` was not needed — every fact traces to
> current source.
>
> **Q8-1 — Token inventory.**
>
> Fifteen colour-bearing variables are defined in `:root` today (the only other
> `:root` entries are two font stacks and two geometry tokens, listed under Q8-2
> and at the end here):
>
> | Token | Value | Role in use |
> |---|---|---|
> | `--bg` | `#0a0e17` | app background, input fields, raw-packet `<pre>` |
> | `--surface` | `#10151f` | panels, topbar, toolbar, modal |
> | `--surface-2` | `#161d29` | chips, buttons, badges, selected/hover surfaces, divider |
> | `--line` | `#232c3b` | default borders, row rules |
> | `--line-strong` | `#303c50` | strong borders, control outlines |
> | `--text` | `#d4dae4` | primary text and numbers |
> | `--text-dim` | `#7c8798` | labels, muted values, statuses |
> | `--text-faint` | `#56606f` | captions, empty states, faintest text |
> | `--bid` | `#2ea043` | bid / up / positive |
> | `--bid-bar` | `rgba(46, 160, 67, 0.16)` | bid depth-bar fill, buy chip active |
> | `--ask` | `#e5484d` | ask / down / negative, error borders |
> | `--ask-bar` | `rgba(229, 72, 77, 0.16)` | ask depth-bar fill, sell chip active, error bg |
> | `--live` | `#2ea043` | connection-live dot (duplicate of `--bid`) |
> | `--warn` | `#d9a441` | connecting / reconnecting dot (amber) |
> | `--focus` | `#4c8dff` | keyboard focus, active-control accent |
>
> **No component (`.tsx`) hardcodes a colour.** Grep over `src/components/**`,
> `App.tsx`, `depth.ts`, and `format.ts` for hex / `rgb()` / `rgba()` / `hsl()`
> returns nothing. `DepthCurve.tsx`, the only component that sets SVG paint
> inline, reads tokens throughout (`fill="var(--bid-bar)"`, `stroke="var(--ask)"`,
> `fill="var(--text-dim)"`, etc.); `DepthLadder.tsx`'s only inline style is a bar
> `width` percentage, not a colour. So the palette swap is genuinely a
> value-only edit to `:root`, as carried constraint 1 assumes — for components.
>
> **The strays are four hardcoded colour literals inside `terminal.css` itself**,
> not in any component, and P8-2 must convert them or they will keep a legacy hue
> after the swap:
> 1. `.badge--live .badge__dot` → `box-shadow: 0 0 0 0 rgba(46, 160, 67, 0.5)` —
>    the bid green, hardcoded (initial box-shadow state).
> 2. `@keyframes live-pulse` → `rgba(46, 160, 67, 0.5)` and `rgba(46, 160, 67, 0)`
>    — same bid green, twice, in the pulse ring.
> 3. `.depth-curve__hit:hover` → `fill: rgba(76, 141, 255, 0.08)` — the focus
>    blue (`#4c8dff`), hardcoded.
> 4. `.fix-inspector__backdrop` → `background: rgba(4, 6, 10, 0.7)` — a near-black
>    modal scrim; no token corresponds to it today.
>
> Strays 1–3 mirror an existing token's hue but bypass the token (a `box-shadow`
> spread and an SVG `fill` at partial alpha, where a bare `var()` will not carry
> the alpha). P8-2 options: introduce alpha-carrying tokens (e.g. a
> `--live-ring` / `--focus-ghost`) or use `color-mix(in srgb, var(--bid) 50%,
> transparent)`. Stray 4 wants a new `--scrim` token (Palette A names none).
>
> **Naming gaps P8-2 must decide (guide appendix vs. as-built):**
> - `--live` is an exact duplicate of `--bid` (`#2ea043`). Palette A gives both
>   the same institutional green, so either keep the alias or collapse it.
> - `--warn` (amber `#d9a441`) has **no role in Palette A** — the appendix lists
>   only bid green, ask red, and the blue accent. The connecting / reconnecting
>   badge dot depends on it. Decision needed: keep amber for the degraded-link
>   state (recommended — it is the one honestly non-charcoal signal and reads
>   instantly), or fold it into the accent. Flagging, not deciding, here.
> - `--text-faint` has no distinct Palette A target; it sits below Text muted
>   `#8A8F98`. It should map to a slightly darker muted value in the swap.
> - Palette A's **Row hover `#1E2023`** has no dedicated token today; `--surface-2`
>   currently doubles as the hover / raised surface. Either keep that dual use or
>   add a `--row-hover`.
> - **Scroll thumb / track** (`--scroll-thumb` `#3A3D42` hover `#4A4E54`, track
>   transparent) do not exist yet; P8-3 adds them. Named here so P8-2 lands them
>   in the same `:root` rewrite.
>
> **Q8-2 — Font delivery.**
>
> Neither font is delivered today. `package.json` has exactly two runtime
> dependencies (`react`, `react-dom`) and no `@fontsource/*`; `index.html` has no
> `<link>` to Google Fonts or any font host; `main.tsx` imports no font CSS. The
> current type is pure fallback: `terminal.css` `:root` defines
>
> ```
> --mono: "JetBrains Mono", "SFMono-Regular", "SF Mono", "Cascadia Code",
>         ui-monospace, Menlo, Consolas, monospace;
> --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
>         Helvetica, Arial, sans-serif;
> ```
>
> and the base declaration is `body { font-family: var(--sans); font-size: 13px }`
> in `terminal.css`. `"JetBrains Mono"` is *named* but not bundled, so today it
> renders only where a machine happens to have it installed and falls back to a
> system monospace otherwise. There is no CDN or web-font link to remove.
>
> **Mechanism decision: self-hosted `@fontsource` packages, confirmed as the
> path.** For a local Vite app it needs `npm i @fontsource/ibm-plex-sans
> @fontsource/ibm-plex-mono`, then `import "@fontsource/ibm-plex-sans"` and
> `import "@fontsource/ibm-plex-mono"` (plus the `700` / mono weights actually
> used) once at the app entry (`main.tsx`, above `import App`). No external CDN,
> deterministic build, offline-safe — consistent with the no-marketing-chrome,
> reproducible-build posture. These are the first non-React dependencies in the
> frontend; `npm run build` must be re-run to confirm the assets bundle.
>
> **Naming correction the guide must absorb before P8-1/P8-2.** The Phase 8
> "Type tokens" appendix names `--font-sans` / `--font-mono`, but the as-built
> tokens are `--sans` / `--mono`, and they are already referenced in the base
> numeric-cell rule and ~40 places across `terminal.css`. Per the phase's own
> "token names stay stable" principle, the recommendation is to **keep `--sans` /
> `--mono`** and update the guide appendix to match, rather than rename every
> reference (a rename touches every `var(--sans)` / `var(--mono)` site for zero
> behavioural gain and risks a missed reference). P8-1 then only: adds the two
> `@fontsource` imports, puts `"IBM Plex Sans"` at the front of `--sans` and
> `"IBM Plex Mono"` at the front of `--mono` (keeping the existing fallbacks), and
> confirms `tabular-nums` is on the numeric cells (see Q8-3). If David prefers the
> `--font-*` names, that is the alternative and it is flagged as a real edit-cost
> fork.
>
> **Q8-3 — Numeric cell coverage.**
>
> A base rule already routes six containers to `--mono` + `tabular-nums` +
> `"tnum" 1`: `.header__value`, `.header__session-value`, `.depth-ladder`,
> `.trade-tape`, `.order-entry__input`, `.open-orders__table`. Everything under
> those inherits mono unless a child overrides to `--sans`. IBM Plex Mono ships
> tabular figures, so P8-1 is mostly a face swap over this existing structure; the
> map below is the audit of what is numeric vs. sans, per component, so nothing is
> missed and no word cell is left in mono.
>
> - **Header (`Header.tsx`).** Mono: `header-last`, `header-change` (abs) +
>   `header-change-pct`, `header-bid`, `header-ask`, `header-mid`,
>   `header-spread-cents` + `header-spread-bps`, `header-volume`, `header-seqnum`
>   (until P8-6 removes it), `header-last-frame` (clock). The ticker `ASML`
>   (`.header__ticker`) is mono by choice (a symbol). Sans: every `.header__label`
>   ("Last", "Chg", "Bid", "Ask", "Mid", "Spread", "Volume", "Last frame"), the
>   `client-assigned` tag, and the `SenderCompID` / `TargetCompID` *values*
>   (`OMS-UI` / `OMS-ENGINE` — identifiers, not numbers; and all removed in P8-6).
> - **DepthLadder (`DepthLadder.tsx`).** Mono: row `price`, `qty`, `cum`; the
>   depth `<select>` options (8 / 10 / 14); the divider `spread-value` /
>   `mid-value` / `last-value`. Sans: the `Depth` control label, the
>   Price / Size / Total column head, and the divider labels Spread / Mid / Last.
> - **TradeTape (`TradeTape.tsx`).** Mono: `time`, `price`, `qty`, and the
>   precision toggle (`ms` / `ns`). Sans (already explicit in CSS): the Side value
>   BUY / SELL (`.trade-tape__side`, kept sans deliberately so it never reads as a
>   green/red side), the Time / Price / Size / Side head, the block-filter buttons
>   (All / >200 / >500), and the empty message.
> - **OpenOrders (`OpenOrders.tsx`).** Mono (via the table base): `id`, `time`
>   (Sent), `price`, `filled / total`. Sans: the `th` header row, the `status`
>   value (`.open-orders__status` — OPEN / PARTIALLY_FILLED / …), and the Cancel
>   button. **One cell to fix in P8-1:** the Side value BUY / SELL
>   (`.open-orders__side`) currently *inherits mono* from the table base but is a
>   status word — it should be set to `--sans` to match TradeTape's Side and the
>   "status words stay sans" rule. This is the only misclassified cell found.
> - **FixInspector (`FixInspector.tsx`).** Already split correctly and needs no
>   change beyond inheriting the new faces: mono for `row-time`, the raw SOH
>   `<pre>`, the tag table (tag numbers + values), the EXEC field table, the JSON
>   `<pre>`, and the echo `seqNum`; sans for the IN / OUT direction badge, the
>   NEW / CANCEL / execType row label, the ALL / NEW / CANCEL / EXEC filters, the
>   title / subtitle, and the verbatim / JSON captions.
> - **DepthCurve (`DepthCurve.tsx`).** SVG `<text>` axis labels are prices; they
>   set no explicit `font-family`, so today they inherit the body sans. If the
>   axis numbers should be tabular mono to match every other price, P8-1 adds
>   `font-family: var(--mono)` on the axis-label text. Minor; flagging so it is a
>   decision, not an omission.
> - **ConnectionBadge** renders status words (Live / Connecting / Reconnecting) —
>   sans, correct.
>
> **Q8-4 — Removed-label test dependencies. This is the finding that changes
> P8-6's test plan.** A full grep of `test/**` for every string P8-6 removes or
> renames (`Tag 44/38/11/41`, `Primitive`, `client-assigned`, `AUTO`,
> `OrigClOrdID`, `ClOrdId`, `SenderCompID`, `TargetCompID`, `MsgSeqNum`,
> `OMS-UI`, `OMS-ENGINE`, `header-sender/target/seqnum/session`) shows the
> affected surface is **much smaller than the kickoff's P8-6 note assumes** — only
> `header.render.test.tsx` has a genuinely affected assertion. Details:
>
> - **`header.render.test.tsx` — one test to remove, one prop to drop.** The whole
>   test *"labels the FIX session identity client-assigned and never as server
>   data"* asserts `getByTestId("header-session-id")` contains `client-assigned`,
>   `header-sender` === `OMS-UI`, `header-target` === `OMS-ENGINE`, and
>   `header-seqnum` === `7`. All four testids are removed by P8-6, so this test is
>   deleted. Its `renderHeader({ msgSeqNum: 7 })` line goes with it, and the
>   `msgSeqNum: 7` entry in the shared `renderHeader` default props (and the
>   `msgSeqNum` field on `HeaderProps`) must go too if P8-6 drops the prop from the
>   component. The badge test and the last-frame test in the same `describe` block
>   are **kept unchanged** — both survive P8-6. This matches the guide's P8-6 note.
> - **`orderEntry.test.tsx` — zero affected assertions (corrects the guide).** No
>   test asserts the tag labels (`Tag 44` / `Tag 38` / `Tag 11`), the
>   `Primitive: 18530L cents` annotation, the `auto, client-assigned` caption, or
>   the `ClOrdId` field-label text. Every test queries by `data-testid` or by the
>   input value. The one clOrdId test asserts
>   `getByTestId("order-entry-clordid-value").textContent === "1757000000123"` —
>   the *value*, which P8-6 keeps — and the word "client-assigned" appears only in
>   that test's `it(...)` description string, not in any assertion. So the guide's
>   P8-6 instruction to "drop assertions on the removed tag labels, the Primitive
>   annotation, and the AUTO caption" and to "update the field label assertion" is
>   **moot: those assertions do not exist.** `orderEntry.test.tsx` needs **no
>   change** for P8-6 (the `it` description may optionally be reworded, cosmetic).
> - **`cancelTicket.test.tsx` — zero affected assertions (corrects the guide).**
>   No test asserts the `OrigClOrdID` field-label text. The only `OrigClOrdID`
>   match is `expect(getByTestId("cancel-ticket-error").textContent)
>   .toMatch(/OrigClOrdID/i)` — that is the *validation error message* text
>   (`"OrigClOrdID must be a positive whole number"`, from `ID_REASON` in
>   `CancelTicket.tsx`), which P8-6 does **not** reword; it renames the field
>   *label* only. The other `origClOrdId` matches are the exported function/type
>   name `validateOrigClOrdId`, unaffected. So `cancelTicket.test.tsx` needs **no
>   change** for P8-6 as currently scoped.
>
> **Consequence for P8-6, needs greenlight.** As written, P8-6 revises exactly one
> test (delete the header session-identity test + drop the `msgSeqNum` prop
> plumbing); `orderEntry.test.tsx` and `cancelTicket.test.tsx` stay green
> untouched. Two optional scope questions fall out, neither required by the guide:
> (a) if the ticket's inline labels should be *asserted* after the rename
> (e.g. a new `getByText("Order ID")` / `getByText("Order ID to cancel")` test to
> lock the new wording), that is a test *addition*, not a revision; (b) if the
> CancelTicket validation error message and the input `aria-label`
> (`"OrigClOrdID to cancel"`) should also be reworded to "Order ID" language for
> consistency, that touches `CancelTicket.tsx` and line 53's error assertion — a
> deliberate scope extension to decide, currently out of P8-6.
>
> **Q8-5 — Depth pane height policy.** Unchanged; carried as CONFIRMED above,
> drives P8-4.
>
> **Net effect on the downstream steps.** P8-1: keep `--sans` / `--mono` names,
> add two `@fontsource` imports in `main.tsx`, prepend the IBM Plex faces to both
> stacks, set `.open-orders__side` to sans, optionally set the DepthCurve axis
> labels to mono; the tabular-nums structure already exists. P8-2: rewrite the 15
> `:root` colour values to Palette A, decide `--warn` (keep amber, recommended)
> and `--live`/`--text-faint`/row-hover mappings, and convert the four hardcoded
> `terminal.css` colour literals to tokens or `color-mix`. P8-6: revise only
> `header.render.test.tsx`; `orderEntry.test.tsx` and `cancelTicket.test.tsx` need
> no revision (only optional additions). Nothing here changes P8-3, P8-4, P8-5,
> or P8-7.

---

## P8-1 — Typographic system ✅

**Goal:** one coherent type system. IBM Plex Sans for chrome, IBM Plex Mono for
every numeric cell, with tabular figures so columns do not jitter as values tick.

**Deliverables:**
- IBM Plex Sans and IBM Plex Mono added as self-hosted assets per Q8-2 (no
  external CDN), imported once at the app entry.
- Two font tokens in `terminal.css` `:root`: per Q8-2 the as-built names
  `--sans` / `--mono` are kept (IBM Plex prepended to each existing fallback
  stack), not renamed to `--font-sans` / `--font-mono`, unless David decides
  otherwise. Body defaults to sans.
- Every numeric cell identified in Q8-3 set to `--mono` with
  `font-variant-numeric: tabular-nums` (and `font-feature-settings: "tnum" 1`) so
  digits align in fixed columns. The base rule already covers most; P8-1 adds the
  `.open-orders__side` → sans fix and (optional) DepthCurve axis-label → mono.
- Labels, section titles, buttons, and status words set to `--sans`.

**Tests:** no logic changes, so no new unit tests. The full existing suite stays
green (assertions query text and testids, not fonts). `npm run build` passes with
the new font assets bundled.

**Dependencies:** P8-0 (Q8-2, Q8-3).

**Open item:** slashed zero (`"zero" 1`) left off by default to avoid a surprising
glyph; flag if you want it on for the data cells.

> **As-built (P8-1).** Delivered as complete files and confirmed green locally by
> David on 2026-09-13: full frontend suite passing, `npm run build` passing with
> the font assets bundled. Source read directly from the working tree before any
> edit (`package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`,
> `src/styles/terminal.css`, `Header.tsx`, `OpenOrders.tsx`, `DepthCurve.tsx`),
> not from this guide's prose. Scope held exactly to three files; no component
> logic, markup, reducer, or wire change.
>
> **Font delivery.** Added the two self-hosted packages to `package.json`
> `dependencies` (the first non-React deps in the frontend): `@fontsource/ibm-plex-sans`
> and `@fontsource/ibm-plex-mono`, `^5` line. No CDN, no `index.html` `<link>`.
> `npm install` resolved and pinned them in the lockfile. The font CSS is imported
> once at the top of `src/main.tsx`, above `import App` (which transitively imports
> `./styles/terminal.css` via `App.tsx`), as seven explicit per-weight side-effect
> imports.
>
> **Weight audit (the import list driver).** Every `font-weight` in `terminal.css`
> was traced to the face it resolves to. `.header__value-sub` is nested inside
> `.header__value` (Header.tsx), so it inherits mono, not sans — confirmed from
> source, not assumed. Result, and exactly the weight files imported:
> - **IBM Plex Sans:** 400 (body default, labels, session values, empty messages),
>   600 (panel titles, toolbar button, side buttons, submit, cancel submit, blotter
>   `th`, inspector title, tags `th`), 700 (`.fix-inspector__row-dir`).
> - **IBM Plex Mono:** 400 (all plain numeric cells: depth qty/cum, tape
>   time/price/qty, blotter td, inputs, inspector raw/tags/json, presets, nudge,
>   depth select, precision), 500 (`.header__value-sub`, `.header__metric--last-frame
>   .header__value`), 600 (`.header__value`, `.depth-ladder__price`,
>   `.depth-ladder__divider-value`, chip value, clOrdId value), 700
>   (`.header__ticker`).
> No other weights are used, so no other weight files were imported.
>
> **Token faces.** Kept the as-built `--sans` / `--mono` names (no rename, per
> Q8-2). Prepended `"IBM Plex Sans"` to `--sans` and `"IBM Plex Mono"` to `--mono`,
> keeping the existing fallback stacks. `"JetBrains Mono"` is retained in the
> `--mono` fallback per the locked "keep existing fallbacks" decision; it is now
> effectively unreachable (IBM Plex Mono is bundled and resolves first) but
> harmless, and removing it was deliberately declined to keep the change
> value-prepend-only. The guide's Type-tokens appendix (which drops JetBrains Mono)
> is the one cosmetic divergence, left as-is.
>
> **The two classification fixes.**
> - `.open-orders__side` (BUY / SELL) was the single misclassified cell from Q8-3:
>   it inherited mono from the `.open-orders__table` base. Added a dedicated rule
>   setting `font-family: var(--sans)`. Its colour (bid green / ask red via
>   `row--buy` / `row--sell`) and size are untouched — type only.
> - DepthCurve's only price-bearing SVG text, `.depth-curve__mid-label` (the mid
>   marker), had no rule and inherited body sans. Added `font-family: var(--mono)`
>   plus `font-variant-numeric: tabular-nums` so it reads tabular like every other
>   price. The empty-state text `.depth-curve__empty` ("No depth") is a status word
>   and was deliberately left sans.
>
> **Open item resolved.** Slashed zero left OFF (no `"zero" 1` added), per the
> locked default. If wanted later for data cells it is a one-line addition to the
> base numeric rule.

---

## P8-2 — Colour system (Palette A, neutral charcoal) ✅

**Goal:** replace the current palette values with the neutral charcoal,
IBKR-inspired set, keeping every token name stable so no component edit is forced.

**Deliverables:**
- The 15 colour tokens enumerated in Q8-1 rewritten to Palette A (role to hex in
  the appendix below). Names unchanged; only values change. Decide `--warn`
  (keep amber, recommended), the `--live`/`--bid` duplication, `--text-faint`, and
  the Row-hover mapping per Q8-1.
- The four hardcoded colour literals in `terminal.css` found in Q8-1 (badge
  live-pulse box-shadow + keyframes, depth-curve hover fill, inspector backdrop)
  converted to tokens or `color-mix`, so nothing keeps a stray legacy hue.
- Add the `--scroll-thumb` / track tokens here (used by P8-3).
- Bid green and ask red desaturated to the institutional values; the cyan number
  accents from the current theme dropped in favour of the mono tabular treatment
  from P8-1.

**Tests:** none new. `DepthCurve` and `TradeTape` inherit the new values through
their existing token references (carried constraint 1), so their component tests
stay green. Full suite green; `npm run build` passes.

**Dependencies:** P8-0 (Q8-1), P8-1.

> **As-built (P8-2).** Delivered as one complete file (`styles/terminal.css`) and
> confirmed green locally by David on 2026-09-13: full frontend suite passing
> (DepthCurve / TradeTape component tests included, via their `var()` token
> references), `npm run build` passing. Source verified directly against the
> working-tree file after the P8-1 merge (the font tokens already leading with IBM
> Plex), not from this guide's prose. Scope held to `styles/terminal.css` only —
> no component logic, markup, `main.tsx`, or `package.json` touched.
>
> **Q8-1 re-verified before the edit.** The 15 `:root` colour tokens matched the
> inventory exactly (no sixteenth colour token had appeared), and all four
> hardcoded colour literals were present and unchanged: the badge initial
> box-shadow, the `live-pulse` two stops, the depth-curve hover fill, and the
> inspector backdrop.
>
> **Colour swap (token → new hex), names unchanged:** `--bg` #0E0E0F, `--surface`
> #17181A, `--surface-2` #1E2023, `--line` #26282B, `--line-strong` #33363B,
> `--text` #E6E7E9, `--text-dim` #8A8F98, `--text-faint` #5C6067, `--bid` #2E9E5B,
> `--bid-bar` rgba(46, 158, 91, 0.14), `--ask` #D13438, `--ask-bar`
> rgba(209, 52, 56, 0.14), `--live` #2E9E5B, `--warn` #C99A3C, `--focus` #4C8DFF
> (already the Palette A accent value, so it did not move).
>
> **Open decisions taken (David away; Claude chose the best-fit option):**
> - `--text-faint` → **#5C6067**: a neutral charcoal one clear step below Text
>   muted #8A8F98, dropping the old blue tint of #56606f.
> - **Row hover: kept the dual use.** `--surface-2` becomes #1E2023 (the Palette A
>   Row-hover value) and no `--row-hover` token was added — no current rule needs a
>   row-hover distinct from the raised/selected surface. Introduce `--row-hover` in
>   P8-4/P8-5 if a hover state must differ from raised surfaces.
> - **Strays 1–3 via `color-mix`** (no new alpha tokens): the badge initial
>   box-shadow and `live-pulse` 0% → `color-mix(in srgb, var(--live) 50%,
>   transparent)`; `live-pulse` 70/100% → `transparent`; the depth-curve hover fill
>   → `color-mix(in srgb, var(--focus) 8%, transparent)`. Because `--focus` keeps
>   its exact value, the hover renders identically while now tracking the token;
>   strays 1–2 pick up the new institutional green automatically.
> - **Stray 4 → new `--scrim` token:** `--scrim: rgba(6, 6, 7, 0.7)` (near-black
>   over the charcoal base, the blue tint of the old rgba(4, 6, 10, 0.7) dropped);
>   `.fix-inspector__backdrop` now reads `background: var(--scrim)`.
> - **Scroll tokens landed now** for P8-3: `--scroll-thumb` #3A3D42,
>   `--scroll-thumb-hover` #4A4E54 (hover token added now, as recommended),
>   `--scroll-track` transparent.
>
> **Locked decisions honoured.** `--live` kept as its own alias of `--bid` (both
> #2E9E5B) so no component reference churns; `--warn` kept as a distinct amber for
> the degraded-link state, retuned #d9a441 → #C99A3C to sit slightly more muted
> with the charcoal set (it does not collapse into the accent); every token NAME
> stayed stable, so no component edit was forced (carried constraint 1).
>
> **Flags decided (Claude's call, David away).** `--line-strong` → **#33363B**:
> Palette A names no distinct strong border, so this is a charcoal step between the
> new panel border #26282B and the scroll thumb #3A3D42, keeping control outlines a
> touch stronger than row rules without reaching scroll-thumb brightness. `--warn`
> retune as above.
>
> **File banner.** The `terminal.css` top comment gained a P8-2 marker; the
> semantic-colour note (green = bid/up, red = ask/down, amber = degraded link, blue
> = focus) still holds under Palette A.
>
> **Net effect on downstream steps.** P8-3 now inherits `--scroll-thumb` /
> `--scroll-thumb-hover` / `--scroll-track`, so the shared scrollbar rule is the
> only work left there. `--scrim` is available to any later modal. Nothing here
> changed P8-4, P8-5, P8-6, or P8-7.

---

## P8-3 — Uniform themed scrollbars ✅

**Goal:** one scrollbar style across every scroll region, matching the charcoal
theme, replacing the leaking OS-native scrollbar (the arrow buttons and scroll
ball in the current screenshots).

**Deliverables:**
- A single shared scrollbar treatment defined once in `terminal.css`, applied to
  every internal scroll container. The overflow regions in the current tree are:
  `.depth-ladder__asks`, `.depth-ladder__bids`, `.trade-tape__rows`,
  `.fix-inspector__list`, `.fix-inspector__detail`, and `.open-orders`
  (`overflow-x`). P8-4 and P8-5 add / re-shape the depth panes and the blotter
  body; the shared rule covers those too.
- WebKit: thin track (8px), transparent or panel-coloured track, a rounded thumb
  in a muted token (`--scroll-thumb`) that brightens on hover, and
  `::-webkit-scrollbar-button { display: none }` to remove the arrows.
- Firefox: `scrollbar-width: thin` and `scrollbar-color: var(--scroll-thumb)
  transparent`.

**Tests:** none new (purely cosmetic). Full suite green.

**Dependencies:** P8-0 (Q8-1), P8-2 (thumb colour comes from the final palette).

> **As-built (P8-3).** Delivered as one complete file (`styles/terminal.css`) and
> confirmed green locally by David on 2026-09-13: full frontend suite passing,
> `npm run build` passing. Source verified directly against the working-tree file
> after the P8-2 merge (the scroll tokens already present in `:root`), not from
> this guide's prose. The local dev shell would not start at read time, so the
> file was staged from the working tree to confirm the as-built surface. Scope
> held to `styles/terminal.css` only — one added rule block, the file banner
> marker, nothing else; no component logic, markup, `main.tsx`, or `package.json`
> touched.
>
> **Surface re-verified before the edit.** The three scroll tokens were present in
> `:root` unchanged from P8-2 (`--scroll-thumb` #3A3D42, `--scroll-thumb-hover`
> #4A4E54, `--scroll-track` transparent), and no sixteenth-onward token had
> appeared. All six overflow regions carry the exact class names the kickoff
> lists, confirmed in both the CSS and the component markup: `.depth-ladder__asks`
> / `.depth-ladder__bids` (`overflow-y`, DepthLadder.tsx), `.trade-tape__rows`
> (`overflow-y`, TradeTape.tsx), `.fix-inspector__list` / `.fix-inspector__detail`
> (`overflow-y`, FixInspector.tsx), and `.open-orders` (`overflow-x`,
> OpenOrders.tsx). **No scrollbar styling existed anywhere in the file** — no
> `::-webkit-scrollbar`, no `scrollbar-width`, no `scrollbar-color`, no
> `scrollbar-gutter` — so nothing was duplicated.
>
> **Application mechanism: CSS-only grouped selector, zero markup touch.** One
> shared block lists the six existing class names for each pseudo-element (and for
> the Firefox `scrollbar-width` / `scrollbar-color` pair). This themes only the
> intended regions, matches the file's flat no-nesting style, and adds no class to
> any component. Inheritance for the later steps: P8-4 is structure-preserving and
> keeps `.depth-ladder__asks` / `.depth-ladder__bids`, so both depth panes inherit
> with no edit at all; P8-5's new blotter scroll body inherits by appending its
> one new class to the selector lists here (a `terminal.css`-only edit, no
> component markup touched). The utility-class alternative was declined for the
> markup churn, consistent with the P8-1/P8-2 scope discipline.
>
> **Decisions taken (all as recommended, David greenlit).**
> - **Track: transparent** (`var(--scroll-track)`). Near-forced: the locked rule is
>   colours come only from the three scroll tokens, and a panel-coloured track
>   would need `--surface`, which is not a scroll token. The thumb floats over the
>   panel's own `--surface`.
> - **Thumb geometry:** `border-radius: 4px` with a `2px solid transparent` border
>   and `background-clip: padding-box`, so the visible thumb is inset and floats
>   off the track edge (roughly a 4px visible thumb inside the 8px track, fully
>   rounded). The full-width alternative (no border) was declined for the quieter
>   inset look.
> - **`scrollbar-gutter`: left OFF in P8-3.** Blanketing it across the shared rule
>   would reserve a bottom gutter on the horizontal `.open-orders`, which is not
>   wanted. Deferred to P8-4 (the two equal depth panes, where a stable gutter
>   keeps the sides symmetric) and P8-5 (the blotter body), applied selectively to
>   those reshaped containers there.
>
> **Rule specifics worth carrying forward.** Both axes are covered:
> `::-webkit-scrollbar` sets `width: 8px` (the vertical panes) and `height: 8px`
> (the horizontal `.open-orders`, and any later horizontal case).
> `::-webkit-scrollbar-button { display: none }` removes the OS arrows;
> `::-webkit-scrollbar-corner` is themed to the track so a both-axes container
> never flashes a default corner. The thumb uses `background-color` longhand (not
> the `background` shorthand) in both the base and `:hover` rules, so the
> `background-clip: padding-box` set once on the thumb is not reset by the hover
> colour swap (the shorthand would reset it). Firefox gets `scrollbar-width: thin`
> and `scrollbar-color: var(--scroll-thumb) var(--scroll-track)`.
>
> **Placement.** The new section sits with the cross-cutting global rules, right
> after the `:focus-visible` rule and before the shell section, not inside any
> component block. The `terminal.css` top comment gained a P8-3 marker.
>
> **Net effect on downstream steps.** P8-4 and P8-5 inherit the shared treatment
> as described (P8-4 with no edit; P8-5 by appending its body class to the selector
> lists). Nothing here changed P8-6 or P8-7.

---

## P8-4 — Depth ladder two-pane scroll layout ✅

**Goal:** fix both depth scroll bugs. The ask side currently has no bounded scroll
region so rows clip into the table, and the bid pane is too short. Rebuild the
ladder as two equal-height scroll panes around a pinned spread bar.

**Deliverables:**
- `DepthLadder` markup restructured into: an asks scroll pane (best ask nearest
  the spread), a pinned spread / mid / last bar, and a bids scroll pane (best bid
  nearest the spread). The pure `buildLadder` helper and every P7-4 assertion stay
  untouched; this is layout only.
- Both panes sized per the Q8-5 policy (size to the selected Depth levels per
  side, scroll only past that), each its own bounded overflow region using the
  P8-3 shared scrollbar, so neither side clips and both scroll symmetrically.
- The spread bar stays fixed between the two panes and does not scroll with either.

**Tests:** existing `depthLadder.test.tsx` stays green (structure-preserving; the
`spread-value` / `mid-value` / `last-value` testids and the row testids are kept).
Add a render assertion that both panes are independently scrollable containers and
the spread bar sits between them.

**Dependencies:** P8-2, P8-3, P8-0 (Q8-5).

> **As-built (P8-4).** Delivered as three complete files (`DepthLadder.tsx`,
> `styles/terminal.css`, `test/depthLadder.test.tsx`) and confirmed green locally
> by David on 2026-09-13: full frontend suite passing (the new two-pane assertion
> and every P7-4 / render assertion included), `npm run build` passing. Source
> verified directly against the working tree before any edit — `DepthLadder.tsx`
> and its `buildLadder`, the `cumulate` helper in `depth.ts`, `depthLadder.test.tsx`,
> the `.depth-ladder` rules and the P8-3 shared-scrollbar block in `terminal.css`,
> and `App.tsx`'s ladder-panel wrapper — not from this guide's prose. Layout only:
> no reducer, wire, engine, `buildLadder`, or App/panel change.
>
> **Root cause confirmed against source.** The DOM was already asks / divider /
> bids, and `.depth-ladder__asks` / `.depth-ladder__bids` already had
> `overflow-y: auto` (and already inherited the P8-3 scrollbar). The bug was the
> sizing, not the structure: both panes were `flex: 1; min-height: 0`, so they
> split whatever vertical space `.depth-ladder` (itself `flex: 1` in the panel,
> sharing height with the sibling depth curve) had left. On a squeezed panel the
> asks pane's `justify-content: flex-end` + overflow clipped the top ask rows
> unreachably (the flex-end overflow bug), and the equally-squeezed bids pane
> showed only a few rows. So the fix is deterministic sizing (Q8-5), not a
> restructure.
>
> **What changed.**
> - `.depth-ladder`: from `flex: 1; min-height: 0` to `flex: 0 0 auto`
>   (content-sized, so the divider stays pinned between the panes with the depth
>   curve directly beneath, no floating gap), plus a new `--depth-row-h: 22px`
>   token as the single source for the row/pane height.
> - `.depth-ladder__asks, .depth-ladder__bids`: from `flex: 1; min-height: 0` to
>   `flex: 0 0 auto; height: calc(var(--depth-rows, 10) * var(--depth-row-h))`,
>   keeping `overflow-y: auto`. Each pane is now a bounded, deterministic-height
>   scroll region sized to the selected Depth. `.depth-ladder__asks {
>   justify-content: flex-end }` kept so an underfull ask side hugs the divider.
> - `.depth-ladder__row`: `height` switched from a bare `22px` to
>   `var(--depth-row-h)`, plus `flex: 0 0 auto` so rows never shrink under the
>   pane's fixed height.
> - `.depth-ladder__divider`: added `flex: 0 0 auto` — explicit that the
>   spread / mid / last bar is a block sibling of the panes, never inside a scroll
>   container, so it never scrolls with either side.
> - `DepthLadder.tsx`: the sole markup touch is `style={{ "--depth-rows": depth }}`
>   (a `CSSProperties` cast; `type CSSProperties` added to the existing `react`
>   import) on both panes — a count, not pixels, so the row height stays
>   single-sourced in CSS. `buildLadder`, `spreadLabel`, `renderRow`, the controls,
>   head, and divider markup, and every testid are untouched.
>
> **Why no pane actually scrolls today, and the scroll clause is still honoured.**
> `buildLadder` caps each side to the selected depth and the server prefix is ≤10
> (P4-6), so rendered rows per side = min(prefix, depth) ≤ depth = the pane's row
> capacity. A pane fits its rows exactly and only scrolls if the server prefix ever
> exceeds the selected-depth window — the Q8-5 policy, with `overflow-y: auto` as
> the bounded safety valve that also guarantees the flex-end asks pane can never
> clip. Because content never exceeds the window under the current cap, the
> flex-end + overflow clip cannot occur.
>
> **Scrollbar and gutter (both flags decided; David greenlit "Proceed" on the
> recommendations).**
> - The P8-3 shared scrollbar targets `.depth-ladder__asks` / `.depth-ladder__bids`
>   by class, so both panes reuse it with zero CSS or markup change, exactly as
>   P8-3's as-built note predicted.
> - `scrollbar-gutter`: **left OFF.** Under the ≤10 server prefix the window equals
>   the cap, so neither pane ever shows a scrollbar — there is no scrollbar-induced
>   asymmetry to stabilise, and reserving a gutter would instead misalign the row
>   columns from the (non-reserved) Price / Size / Total head. If the server prefix
>   ever grows past the selected depth, revisit by applying `scrollbar-gutter:
>   stable` to both panes AND a matching right gutter on `.depth-ladder__head`
>   together.
>
> **New render assertion.** One new `describe("DepthLadder (P8-4 two-pane scroll
> layout)")` with a single `it`: asserts asks and bids are two distinct container
> elements; each side's rows live only in their own pane and neither pane holds the
> other side's rows (independent scroll containers); the `.depth-ladder__divider`
> (found via the `spread-value` testid's closest divider) is contained in neither
> pane and sits between them in document order (`compareDocumentPosition`) — the
> spread bar pinned between, scrolling with neither; and both panes carry the
> `--depth-rows` sizing hook equal to the selected depth, tracking the selector
> symmetrically (10 → 14). No existing test modified; `buildLadder` and every P7-4
> assertion unchanged.
>
> **Decision flagged, out of scope.** `.depth-ladder` becoming content-sized means
> that on a very short viewport at Depth 14 the `.panel--ladder` (`overflow:
> hidden`) could clip the bottom of the depth curve below; fixing that is a
> panel/App concern and this step was scoped to `DepthLadder.tsx` + `terminal.css`
> only, so it was left out of P8-4. **[P8-7 acceptance found this clip does occur,
> at Depth 8 as well; fixed in P8-8.]**
>
> **Net effect on downstream steps.** P8-5 (blotter sizing) is unaffected and
> still inherits the P8-3 scrollbar by appending its body class to the selector
> lists. Nothing here changed P8-6 or P8-7.

---

## P8-5 — Blotter sizing ✅

**Goal:** the Open Orders blotter stops collapsing to one cramped row.

**Deliverables:**
- `OpenOrders` given a fixed min-height showing roughly 4 to 5 rows, a sticky
  header row, and an internal scroll body using the P8-3 shared scrollbar.
- Consistent row height so the header, the rows, and the scroll track align.
- The Cancel-by-ID ticket below is unaffected.

**Tests:** existing `openOrders.test.tsx` stays green (row fields and testids
unchanged). Add a render assertion that the header row is sticky and the body is
the scroll container.

**Dependencies:** P8-3.

> **As-built (P8-5).** Delivered as three complete files (`OpenOrders.tsx`,
> `styles/terminal.css`, `test/openOrders.test.tsx`) and confirmed green locally
> by David on 2026-09-13: full frontend suite passing (the new render assertion
> and all seven existing OpenOrders tests included), `npm run build` passing.
> Source verified directly against the working tree before any edit —
> `OpenOrders.tsx` and its markup, `openOrders.test.tsx`, `openOrders.logic.test.ts`,
> the `.open-orders` / `.open-orders__table` rules and the P8-3 shared-scrollbar
> block and the P8-4 `--depth-row-h` pattern in `terminal.css`, and `App.tsx`'s
> controls-panel wrapper (OpenOrders sits between Order entry and the Cancel-by-ID
> ticket) — not from this guide's prose. The local dev shell would not start, so
> the files were staged from the working tree to confirm the as-built surface.
> Layout only: no reducer, wire, engine, or field change; every existing testid and
> row field preserved; `.open-orders__side` stays sans (P8-1).
>
> **Root cause confirmed against source.** The blotter was a single
> `.open-orders` div wrapping either the empty state or one `.open-orders__table`,
> with `.open-orders { overflow-x: auto }` its only sizing rule. Nothing reserved
> vertical space, so a one-order blotter rendered header + one row and the
> Cancel-by-ID ticket sat directly beneath it. The fix is a bounded scroll body
> with a reserved min-height, not a restructure of the row markup.
>
> **What changed.**
> - `OpenOrders.tsx`: the `<table>` is wrapped in a new
>   `<div className="open-orders__scroll" data-testid="open-orders-scroll">`. The
>   single table is kept (header and rows in one table) so the columns auto-align
>   with no fixed-width bookkeeping. The empty branch is unchanged. No field,
>   testid, or state behaviour changed; the row markup is untouched.
> - `.open-orders`: dropped `overflow-x: auto`; gained `--blotter-row-h: 26px`, the
>   single source for header / row / scroll-track height (mirrors P8-4's
>   `--depth-row-h`).
> - New `.open-orders__scroll`: `min-height: calc(var(--blotter-row-h) * 5.5)`
>   (sticky header + ~4.5 order rows always reserved — the anti-collapse floor),
>   `max-height: calc(var(--blotter-row-h) * 9.5)` (past which it scrolls
>   internally instead of pushing the Cancel-by-ID ticket down), `overflow: auto`,
>   `scrollbar-gutter: stable`.
> - `.open-orders__table th`: added `position: sticky; top: 0; z-index: 1;
>   height: var(--blotter-row-h); background: var(--surface)`, and the header
>   underline moved from `border-bottom` to `box-shadow: inset 0 -1px 0
>   var(--line-strong)` (a collapsed table border does not stay put under a sticky
>   cell; box-shadow does). Padding / font / colour / alignment unchanged.
> - `.open-orders__table td`: added `height: var(--blotter-row-h)` for a consistent
>   row height that aligns with the header and the scroll track.
> - `.open-orders__empty`: added `display: flex; align-items: center;
>   min-height: calc(var(--blotter-row-h) * 5.5)` so the panel does not jump
>   between "No orders yet" and the first order (the shared padding / colour rule
>   with `.trade-tape__empty` is untouched).
>
> **The overflow relationship (the one finding, corrects the kickoff framing).**
> The kickoff framed P8-5 as "keep `.open-orders` overflow-x, add a vertical body,"
> but CSS couples the two axes: an element with `overflow-y: auto` computes
> `overflow-x` to `auto` too, so a purely-vertical inner body nested in a
> purely-horizontal outer would produce a doubled horizontal scrollbar, and
> clipping the inner's x would break horizontal scroll entirely. So the new
> vertical body absorbs **both** axes (`overflow: auto`) and `.open-orders` drops
> its `overflow-x`. Horizontal behaviour is preserved (a wide table still scrolls
> sideways, now on the inner body), and because header and rows are one table
> inside that body, they scroll horizontally together while the header pins only
> vertically. The scroll region therefore moved from `.open-orders` to
> `.open-orders__scroll`, which **replaced** `.open-orders` across all six P8-3
> selector groups (the Firefox `scrollbar-width` / `scrollbar-color` pair and the
> five WebKit pseudo-element groups) — the shared scrollbar reused, no new
> scrollbar rule, exactly the P8-3 mechanism.
>
> **Decisions taken (David greenlit "Proceed" on the recommendations).**
> - Consolidate both axes on `.open-orders__scroll`; `.open-orders` becomes the
>   plain semantic region.
> - Replace `.open-orders` with `.open-orders__scroll` in the six P8-3 groups (the
>   old wrapper no longer scrolls).
> - `min-height` 5.5 row units, `max-height` 9.5 row units.
> - **`scrollbar-gutter: stable` ON** for the blotter body — unlike P8-4's OFF,
>   because the blotter genuinely toggles between no scrollbar (few orders, reserved
>   min-height) and a scrollbar (many orders), so a stable gutter keeps the table's
>   right edge from jumping as the list crosses the scroll threshold.
> - Empty-state min-height parity ON.
> - `--blotter-row-h: 26px` (≈ the pre-P8-5 natural row height, so nothing visibly
>   jumps), and the sticky-header underline via box-shadow.
>
> **New render assertion.** One new `it` in `openOrders.test.tsx`: asserts the
> scroll body (`open-orders-scroll`) contains every `open-orders-row`, and that the
> single table's `<thead>` lives inside that same body ahead of the rows in
> document order — the sticky-header + scroll-body DOM contract the CSS keys off.
> jsdom does not apply `terminal.css`, so the assertion locks the structural
> contract, not the computed `position: sticky` (mirroring P8-4's structural
> approach). All seven existing tests kept unchanged; `openOrders.logic.test.ts`
> (which only tests `filledOf`) untouched.
>
> **Net effect on downstream steps.** P8-6 (FIX annotation cleanup) is unaffected.
> Nothing here changed P8-7.

---

## P8-6 — FIX annotation cleanup ✅

**Goal:** strip the FIX teaching annotations from the ticket and header. The
tag-level view stays in the FIX inspector only. Every underlying value is kept.

**Deliverables:**
- **Order entry (`OrderEntry`):** remove the bare tag numbers (`Tag 44`, `Tag 38`,
  `Tag 11` — note the as-built casing is "Tag NN", not "TAG NN"), keep the plain
  `Price` and `Qty` field labels, remove the "Primitive: 18530L cents" helper
  under Price, remove the "auto, client-assigned" caption (as-built lowercase,
  rendered uppercase by CSS `text-transform`) while keeping the auto-generated ID
  value, and rename the `ClOrdId` field label to **Order ID**.
- **Cancel ticket (`CancelTicket`):** remove `Tag 41`, rename the `OrigClOrdID`
  field label to **Order ID to cancel**. (Decision needed per Q8-4: whether to
  also reword the validation error message and the input `aria-label`, currently
  "OrigClOrdID ..."; out of scope unless greenlit.)
- **Header (`Header`):** remove the FIX session identity strip (SenderCompID
  OMS-UI, TargetCompID OMS-ENGINE, MsgSeqNum) and its "client-assigned" caption.
  Keep the `ConnectionBadge` (Live) and the Last-frame indicator: those are
  liveness, not FIX identity chrome. Drop the `msgSeqNum` prop from `HeaderProps`
  (the reducer counter stays in state).
- The reducer `msgSeqNum` counter is left in state (still incremented, cheap,
  documents the FIX concept and stays distinct from the inspector counters); only
  its header display is removed. No reducer logic change.

**Tests (revised, flagged per Q8-4 — the affected surface is smaller than first
assumed):**
- `header.render.test.tsx`: delete the "labels the FIX session identity
  client-assigned" test (its `header-sender` / `header-target` / `header-seqnum` /
  `client-assigned` assertions) and drop the `msgSeqNum` prop from the shared
  `renderHeader` default props; keep the two-row structure, the badge test, and
  the last-frame test unchanged.
- `orderEntry.test.tsx`: **no change required** — no assertion references the tag
  labels, the "Primitive" annotation, or the "auto, client-assigned" caption; the
  clOrdId assertion is on the value via `order-entry-clordid-value` and survives.
  (Optional: reword one `it(...)` description; optional: add a `getByText("Order
  ID")` test to lock the new label.)
- `cancelTicket.test.tsx`: **no change required** — the only `OrigClOrdID` match
  is the validation error message, which is not reworded by this step. (Optional:
  add a `getByText("Order ID to cancel")` test; only touch line 53 if the error
  message is reworded per the decision above.)
- Every other assertion across the suite is preserved.

**Dependencies:** P8-0 (Q8-4), P8-2.

> **As-built (P8-6).** Delivered as seven files and confirmed green locally by
> David on 2026-09-14: full frontend suite passing (the revised header render test
> and the two new label-lock tests included), `npm run build` passing. Five files
> carried the change (`src/components/OrderEntry.tsx`,
> `src/components/CancelTicket.tsx`, `src/components/Header.tsx`, `src/App.tsx`,
> `test/header.render.test.tsx`) plus two test files that gained P8-6 additions
> (`test/orderEntry.test.tsx`, `test/cancelTicket.test.tsx`). Source verified
> directly against the working tree before any edit (all three components,
> `App.tsx`, `state/reducer.ts`, and the three test files); the local dev shell has
> been slow to start these last phases, so the files were staged from the working
> tree to confirm the as-built surface. Presentation only: no wire, no engine, no
> reducer logic change.
>
> **Q8-4 re-verified against current source before the edit.** Re-read in full,
> `orderEntry.test.tsx` and `cancelTicket.test.tsx` carried zero assertions on any
> removed tag label, the Primitive helper, the "auto, client-assigned" caption, or
> a renamed field label; only `header.render.test.tsx` had an affected assertion.
> The finding held exactly as P8-0 recorded it. The as-built casing matched too:
> `Tag 44` / `Tag 38` / `Tag 11` / `Tag 41` (classes `order-entry__tag` /
> `cancel-ticket__tag`), the `Primitive: 18530L cents` helper
> (`order-entry__primitive`), the lowercase `auto, client-assigned` caption
> (`order-entry__clordid-note`), and the `client-assigned` header caption
> (`header__session-tag`).
>
> **What changed, per component (markup and labels only).**
> - `OrderEntry.tsx`: removed the `Tag 44` and `Tag 38` spans from the Price and
>   Qty field heads (the `order-entry__field-head` wrappers kept, now holding just
>   the plain label); removed the `Primitive: 18530L cents` helper under Price; in
>   the clOrdId block removed the `Tag 11` span and the `auto, client-assigned`
>   note, renamed the label `ClOrdId` to `Order ID`, and kept the
>   `order-entry__clordid-value` span with its `clOrdIdPreview` value. The top
>   JSDoc was trimmed so it no longer describes a Tag 11 field. No prop, state,
>   validation, or handler change.
> - `CancelTicket.tsx`: removed the `Tag 41` span and renamed the label
>   `OrigClOrdID` to `Order ID to cancel`. Decision (a) taken (below): the
>   validation error string `ID_REASON` was reworded to `Order ID must be a
>   positive whole number` and the input `aria-label` to `Order ID to cancel`. The
>   exported `validateOrigClOrdId` name and its internal comment are kept (not
>   user-facing). No validation or handler change.
> - `Header.tsx`: removed the entire `header__session-id` block (the
>   `client-assigned` caption plus the SenderCompID / TargetCompID / MsgSeqNum
>   fields), removed the now-unused `SENDER_COMP_ID` / `TARGET_COMP_ID` module
>   constants and their comment, and dropped `msgSeqNum` from `HeaderProps` and the
>   destructured parameter list. `ConnectionBadge` and the Last-frame metric are
>   kept, so the session row and the two-row structure survive. `deriveHeader` /
>   `HeaderModel` / `HeaderInput` never carried `msgSeqNum`, so they are untouched.
>
> **msgSeqNum unthreaded without a reducer touch.** Three edits, none in the
> reducer: `HeaderProps` loses the field, the `<Header>` call in `App.tsx` loses
> the `msgSeqNum={state.msgSeqNum}` line, and the reducer is unchanged. The
> `msgSeqNum` counter stays in reducer state (field, initial `0`, incremented on
> the SENT path, spread into new state) and is still advanced on every outbound
> frame; `state.msgSeqNum` is now read nowhere in the app, which is not a TS error
> for an unused state field. Only the header display and the prop thread are gone.
>
> **Open decisions taken (David greenlit "pick what is best in line with what I
> want").**
> - **(a) CancelTicket error message and input aria-label reworded to "Order ID"
>   language.** Chosen because the goal of this step is a working ticket with plain
>   labels and values and no FIX chrome leaking in; leaving `OrigClOrdID` in a
>   user-visible validation error and in the screen-reader aria-label of a field
>   whose label now reads "Order ID to cancel" would leak exactly the chrome P8-6
>   removes. Both are presentation (text shown and announced), so this stays inside
>   the presentation-only constraint. Consequence: `cancelTicket.test.tsx` is now a
>   revision after all, not the untouched file Q8-4 described under the un-reworded
>   scope. Its line-53 error assertion moved from `/OrigClOrdID/i` to `/Order ID/i`.
> - **(b) Label-locking assertions added.** Consistent with the per-step test
>   discipline of P8-4 and P8-5, which each locked their new visible contract; the
>   renamed labels were otherwise unasserted. A new `describe` in
>   `orderEntry.test.tsx` locks the plain `Order ID` label and the kept id value,
>   and asserts the removed chrome is gone (`ClOrdId`, `Tag 11`, `Tag 44`,
>   `Tag 38`, `Primitive`, `client-assigned` all `queryByText` null); a new
>   `describe` in `cancelTicket.test.tsx` locks the `Order ID to cancel` label and
>   asserts `OrigClOrdID` and `Tag 41` gone.
>
> **Test net.** `header.render.test.tsx` revised: deleted the "labels the FIX
> session identity client-assigned" test and dropped `msgSeqNum` from the shared
> `renderHeader` default props; the two-row structure, the badge test, and the
> last-frame test are kept. `cancelTicket.test.tsx`: line-53 error assertion
> revised (decision a) plus one new label-lock test (b). `orderEntry.test.tsx`: no
> revision, two new label-lock tests added (b). Every other assertion across the
> suite is preserved.
>
> **Orphaned CSS, flagged for P8-7.** Removing the markup leaves several
> `terminal.css` rules matching no element: `order-entry__tag`,
> `order-entry__primitive`, `order-entry__clordid-note`, `cancel-ticket__tag`, and
> the `header__session-id` / `header__session-tag` / `header__session-field` /
> `header__session-value` set. They are harmless and `terminal.css` was outside the
> P8-6 three-component scope, so they were left as-is; P8-7 can drop them in its
> visual pass if wanted.
>
> **Net effect on P8-7.** Unaffected and ready. The working ticket now shows plain
> labels and values, the header is a clean two-row strip (instrument row plus
> ConnectionBadge and Last-frame), and every FIX tag detail removed here still
> lives in the FIX inspector, which is exactly the P8-7 inspector acceptance check.

---

## P8-7 — Assembly and acceptance ✅

**Goal:** verify the refreshed surface as a whole.

**Deliverables:**
- A visual pass confirming the type system, palette, scrollbars, two-pane depth,
  blotter sizing, and FIX cleanup read as one coherent terminal, in every panel.
- Full frontend suite green with the P8-6 revisions in place.
- `frontend/README.md` screenshot placeholders refreshed if captured.
- A manual visual acceptance run recorded as a result table in this guide.

**Acceptance run (manual, against the live stack, backend on :8080, Vite on
:5173):** connect and read the header; place a resting order and read the ladder,
both depth panes, and the blotter; cross it and read the tape; scroll the blotter
and both depth panes and confirm the themed scrollbar with no OS arrows; open the
FIX inspector and confirm the tag-level view still carries the FIX detail removed
from the ticket.

**Tests:** full frontend suite green; `WebSocketRoundTripTest` green (no backend
file touched this phase).

**Dependencies:** P8-1 through P8-6.

> **As-built (P8-7).** Verification-and-documentation step, run 2026-09-14. All
> three automated greens confirmed by David on the live tree: full frontend suite
> green, `npm run build` green, `WebSocketRoundTripTest` green (no backend file
> touched this phase). Source-side verification done by Claude directly against the
> working tree (staged from the PC, dev shell slow to start): the `terminal.css`
> banner markers and Palette A tokens, the shared scrollbar block, the two-pane
> depth sizing and the blotter sizing all matched their as-built notes; the FIX
> cleanup in `Header.tsx` / `OrderEntry.tsx` / `CancelTicket.tsx` was confirmed
> (plain `Order ID` / `Order ID to cancel` labels, `msgSeqNum` prop gone,
> reworded cancel error); and the P8-6 test revisions matched source.
>
> **Optional-scope decisions taken (David greenlit).**
> - **(a) Orphaned CSS dropped.** The eight rule blocks P8-6 left unreferenced
>   (`order-entry__tag`, `order-entry__primitive`, `order-entry__clordid-note`,
>   `cancel-ticket__tag`, and the four `header__session-id/-tag/-field/-value`)
>   were removed, plus a ninth stale touch point: `.header__session-value` was also
>   dropped from the base numeric-cell grouped selector at the top of the file (the
>   kickoff called it "seven"; the true count is eight blocks plus that grouped
>   entry). Three now-inaccurate comments were corrected to match the P8-6 markup
>   (session row, order-entry field head, clordid). The banner gained the missing
>   `P8-1` marker and a `P8-7` marker. `terminal.css`-only, no markup or test
>   touched; the suite and build stayed green.
> - **(b) README screenshots: deferred.** New captures were not taken this step;
>   the placeholders stay. Logged as a follow-up.
>
> **Acceptance result table (run 1, David on the live stack).**
>
> | # | Check | Result | Notes |
> |---|---|---|---|
> | 1 | Connect, Live badge, green dot | PASS | Live + green dot |
> | 2 | Header session row: FIX identity gone, badge + last-frame only | PASS | only Live + Last frame |
> | 3 | Instrument row mono tabular, bid green / ask red, charcoal | PASS | Bid green, Ask red |
> | 4 | Resting order in ladder, best price hugs divider | PASS | ladder reflects book |
> | 5 | Two-pane layout, divider pinned | PASS | asks above, bids below |
> | 6 | Depth sizing 8 / 10 / 14 | FAIL → P8-8 | resizes, but the ladder overflows the panel and clips |
> | 7 | Blotter OPEN, ~4–5 rows, sticky header, Side sans | PASS | blotter itself fine |
> | 8 | Tape tick colour + own-trade marker | NOT RUN | no order crossed this run; re-run in P8-8 |
> | 9 | Blotter scroll: themed thumb, no OS arrows, stable gutter | PASS | "works very well" |
> | 10 | Depth pane scroll | N/A | no pane overflowed (prefix fits Depth); correct, no bar needed |
> | 11 | FIX inspector, tag detail preserved | NOT RUN | inspector not opened this run; re-run in P8-8 |
> | 12 | Coherence, one terminal across panels | FAIL → P8-8 | type / palette / scroll coherent; ladder clip + controls spill break it |
> | A | Depth curve visible below the ladder | FAIL → P8-8 | only the title shows at Depth 8; worse at 10 / 14 |
> | B | Controls column contained (Order entry + blotter + Cancel by ID) | FAIL → P8-8 | spills below the panel; page scroll reveals it |
>
> **Three regressions surfaced, one root cause, routed to P8-8 per decision (c).**
> The layout is viewport-locked (`.workspace { flex: 1; min-height: 0 }`, cells
> stretched to one screen, `.panel--ladder { overflow: hidden }`) but the content
> no longer fits one screen, so panels clip or spill: (A) `.panel--ladder`'s
> `overflow: hidden` clips the depth curve, and the bottom bids rows at Depth
> 10 / 14, once the P8-4 content-sized ladder plus the curve exceed the cell — the
> exact panel-height clip P8-4's as-built flagged and deferred; (B) `.panel--controls`
> has no internal scroll, so Order entry + blotter + Cancel by ID overflow the cell
> and only the page scroll contains them. Row 10's "no pane scrollbar" is correct
> behaviour, not a defect: `buildLadder` caps rows to the Depth and the prefix
> fits, so no pane overflows. These are P8-4 / P8-5 regressions, so they are fixed
> inside Phase 8 as the added step P8-8 rather than logged to a later phase, and
> Phase 8 stays in progress until P8-8's re-run is clean (rows 6, 8, 11, 12, A, B).

---

## P8-8 — Panel layout and overflow ✅

**Goal:** resolve the three P8-7 regressions by committing the layout to one
height model. Chosen model (David): **Model C, content-height panels plus page
scroll** — formalize the page scroll already in use, so panels size to their
content and nothing clips or spills. This is presentation only, the same locked
constraints as the rest of Phase 8: no engine, wire, `messages.ts`, reducer, or
markup change. `styles/terminal.css` only.

**Root cause (from the P8-7 run).** The app is viewport-locked but its content
exceeds one screen, and the two panels that overflow handle it differently and
both wrongly: the ladder panel clips (`overflow: hidden`), the controls panel
spills (no overflow rule). Model C drops the viewport lock and lets the page
scroll to the tallest column, which is the behaviour David already likes.

**Deliverables (all `terminal.css`):**
- `.workspace`: drop `flex: 1; min-height: 0`, add `align-items: start`. Columns
  size to their own content and top-align; the page scrolls to the tallest.
- `.panel--ladder`: remove `overflow: hidden`. The depth curve and the full ladder
  always show; nothing is clipped.
- `.depth-ladder__asks, .depth-ladder__bids`: `height` → `max-height` (option (a),
  greenlit). Each side sizes to its actual level count (no empty gap when a side
  has fewer levels than the Depth) and still caps at the selected Depth;
  `overflow-y: auto` stays as the bounded valve for a prefix beyond the window.
- `.trade-tape`: replace `flex: 1` with `min-height: 240px` and `max-height: 60vh`
  so the empty panel keeps presence and a busy tape scrolls internally rather than
  stretching the page (both tunable). The blotter's P8-5 internal scroll is
  unchanged.
- Banner: `P8-8` marker added.

**Tests:** no unit-test change (jsdom does not compute layout; the structural DOM
tests are unaffected by CSS). The full suite stays green and `npm run build`
passes. Verification is a manual re-run of the failing / not-run acceptance rows
(6, 8, 11, 12, A, B) against the live stack.

**Dependencies:** P8-4, P8-5, P8-7.

> **As-built (P8-8).** Delivered as one complete file (`styles/terminal.css`) and
> confirmed green locally by David on 2026-09-15: full frontend suite green,
> `npm run build` green. CSS only, no markup or test touched, so no unit-test
> change; jsdom does not compute layout, so the fix is verified by the manual
> re-run below, not by a new assertion. Model C (page-scroll) applied exactly as
> planned.
>
> **What changed (all `terminal.css`).**
> - `.workspace`: dropped the viewport lock (`flex: 1; min-height: 0`), added
>   `align-items: start`. Columns size to their own content and top-align; the page
>   scrolls to the tallest column, which is the behaviour David already liked.
> - `.panel--ladder`: removed `overflow: hidden` (the clip that cut the depth curve
>   and the bottom bids rows at Depth 10 / 14). Replaced with a comment recording
>   why the clip is gone.
> - `.depth-ladder__asks, .depth-ladder__bids`: `height` → `max-height` (option (a),
>   greenlit). Each side sizes to its actual level count with no empty gap and still
>   caps at the selected Depth; `overflow-y: auto` stays as the latent valve.
> - `.trade-tape`: `flex: 1` → `min-height: 240px; max-height: 60vh`, so the empty
>   "No trades yet" panel keeps presence and a busy tape scrolls internally rather
>   than stretching the page. The blotter's P8-5 internal scroll is unchanged.
> - Banner gained the `P8-8` marker.
>
> **Acceptance result table (run 2, David on the live stack, 2026-09-15).** All
> layout rows clean; the only non-passing items are the two depth-feed matters
> deferred to Phase 9, which are not P8-8 layout defects.
>
> | # | Check | Result | Notes |
> |---|---|---|---|
> | 6 | Depth sizing 8 / 10 / 14, curve and both sides fully visible, no clip | PASS | layout correct; the 14-shows-10 level count is the Phase 9 feed item, not a layout fail |
> | 8 | Tape tick colour + own-trade marker | PASS | |
> | 10 | Depth pane scroll (themed bar, no OS arrows) | DEFERRED → Phase 9 | cannot engage until the feed carries more levels than the window (see below) |
> | 11 | FIX inspector, tag detail preserved | PASS | tag-level view intact |
> | 12 | Coherence, one terminal across panels | PASS | curve visible, controls contained, page scrolls cleanly |
> | A | Depth curve visible below the ladder | PASS | fully visible at every Depth |
> | B | Controls column contained (Order entry + blotter + Cancel by ID) | PASS | no spill |
>
> **Deferred to Phase 9 (decided 2026-09-15).** Two related depth-feed matters,
> both requiring a wire/engine change that Phase 8's presentation-only lock
> excludes, so they are Phase 9 feature work rather than a P8-8 fix:
> 1. **Depth 14 shows only 10 levels per side.** The server trims BOOK to a ≤10
>    prefix (P4-6), documented at `DEPTH_OPTIONS` in `DepthLadder.tsx`, so the
>    selector's 14 (and 10) can only ever render what the wire carries. Confirmed
>    against source and against a live book with 16 ask levels present but only the
>    best 10 delivered. Fix: raise the server BOOK depth prefix (e.g. 20+ per side).
> 2. **The depth-pane scrollbar never engages.** `buildLadder` slices each side to
>    `depth`, and each pane is sized to `depth` rows, so rendered rows always equal
>    the pane capacity and nothing overflows. To make the pane scroll, Depth must
>    become a viewport size and `buildLadder` must render the deeper book beyond the
>    window. This depends on item 1 (there must be more levels than the window to
>    scroll to).
>
> Phase 9 scope for these: raise the BOOK prefix on the wire, redefine Depth as the
> visible window, have `buildLadder` render the deeper book so `overflow-y` engages
> the P8-3 themed scrollbar, and update the `buildLadder` cap test, the P8-4
> pane-scroll assertion, and any backend depth test (plus `WebSocketRoundTripTest`
> if it asserts the prefix). Needs its own Phase 9 reconciliation before code.

---

## Appendix — Palette A (neutral charcoal)

Role to target value. Token names are confirmed and mapped in P8-0 / P8-2; only
values change.

```
Background base     #0E0E0F
Panel               #17181A
Panel border        #26282B
Row hover           #1E2023
Text primary        #E6E7E9
Text muted          #8A8F98
Bid / positive      #2E9E5B
Ask / negative      #D13438
Accent / focus      #4C8DFF
Bid bar fill        rgba(46, 158, 91, 0.14)
Ask bar fill        rgba(209, 52, 56, 0.14)
Scroll thumb        #3A3D42   (hover #4A4E54)
Scroll track        transparent
```

## Appendix — Type tokens

As-built token names are `--sans` / `--mono` (not `--font-sans` / `--font-mono`);
per Q8-2 these are kept and IBM Plex is prepended to each existing fallback stack.

```
--sans: "IBM Plex Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont,
        "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--mono: "IBM Plex Mono", "SFMono-Regular", "SF Mono", "Cascadia Code",
        ui-monospace, Menlo, Consolas, monospace;

/* numeric cells */
font-family: var(--mono);
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```
