# Build Guide — Phase 9: Real Depth Feed and Scrolling Viewport

**Status:** IN PROGRESS. P9-0, P9-1, P9-2 complete and confirmed green by David
(P9-1 on 2026-09-16, P9-2 on 2026-09-17). P9-3 (assembly and live acceptance) is
the remaining step and is planned below.

## Purpose

Phase 8 closed the terminal's surface but deferred two linked depth-feed defects
because they needed a wire/engine change that Phase 8's presentation-only lock
excluded (see "Deferred to Phase 9" at the end of `Build_Guide_Phase8.md`, P8-8).
Phase 9 fixes both, for real:

1. **Depth selector never showed more than 10 levels per side.** The server
   trimmed the BOOK snapshot to a top-N prefix of at most 10 levels per side (the
   P4-6 cap), so selecting 14 (and even 10 on a deeper book) could not render what
   the selector promised, even with 34+ real resting orders on the book.
2. **The P8-3 themed pane scrollbar could never engage.** `buildLadder` sliced
   each side to the selected Depth and each pane's CSS `max-height` was sized to
   exactly that same Depth via `--depth-rows`, so rendered rows always equalled
   pane capacity and nothing ever overflowed.

The resolution path, confirmed at the Phase 9 kickoff, is "deepen for real":
raise the server-side BOOK prefix past 10, and redefine what Depth means, from a
hard cap on levels shown to a true scrolling viewport size, so the P8-3 scrollbar
finally has something to scroll.

## Design direction

- Deepen the wire but keep it a bounded top-N, not "send the full book". The
  fixed-size reused snapshot array is the whole zero-allocation snapshot contract
  (SRS 5.1, the P6 benchmark posture); an unbounded array would break it for no
  real benefit at demo scale.
- Depth becomes the viewport, not a cap. The selector sizes how many rows a pane
  shows; the pane scrolls to the rest of the book.
- One honest scale. With the whole book rendered, the ladder bars scale to the
  full book's shared max, which is the scale the DepthCurve already uses, so the
  two panels agree rather than each telling a different story.
- No marketing chrome, no invented numbers, consistent with Phases 7 and 8.

## Explicitly out of scope

- L3 / order-by-order depth and per-level order counts. Depth and tape stay L2.
- Participant harness, trading bots, synthetic order flow. Still paused.
- LLM anything. Not this project.
- Any matching-engine semantic change. `fillSide` already walks best-first and
  stops at `maxLevels`, so a deeper N is a value change, not a logic change.

## Carried constraints

These are as-built facts Phase 9 designs around, not problems to fix here.

1. **The snapshot carrier is a fixed-size reused slot.** `BookSnapshotEvent`
   pre-allocates four `long[]` arrays and never clears their tails; only
   `[0, bidLevelCount)` and `[0, askLevelCount)` are valid. The level counts, not
   the array contents, are authoritative. A deeper N must stay a fixed bound so
   the carrier remains zero-allocation across reuse.
2. **BOOK is authoritative and replaced wholesale on the client.** The reducer
   stores the BOOK arrays as received (no client-side depth cap), so a deeper wire
   prefix reaches `state.book` automatically.
3. **The DepthCurve is already full-book.** It is wired in `App.tsx` with no
   `depth` prop, so `buildDepthCurve` already plots every level the server sends
   and already scales to a full-book shared max.
4. **Prices are integer cents end to end; sentinels are `-1L`.** No floats, no
   change to the wire value semantics.

---

## P9-0 — Reconciliation and locked decisions ✅

**Goal:** confirm the two defects against live source, then lock the four design
decisions the kickoff flagged, before any code.

**Decisions locked (David greenlit 2026-09-16).**

1. **Wire depth: `MAX_DEPTH_LEVELS = 20`, kept a compile-time constant, still a
   bounded top-N** (not "send the full book"). It must exceed the largest Depth
   option (14) for scrolling to engage; 20 gives headroom. 20 longs x 4 arrays is
   ~640 B, negligible. A config knob was rejected as scope creep.
2. **Depth becomes a true scrolling viewport, not a higher cap.** A higher hard
   cap would still never scroll and would not satisfy the goal. Depth becomes the
   visible row count (the pane height, already `--depth-rows`); `buildLadder`
   renders the full book so content exceeds the pane and `overflow-y: auto`
   engages the P8-3 scrollbar. `depth` becomes a CSS-only concern.
3. **Bar scaling: full-book shared max (option i), not the visible window.** With
   every level rendered, a level's bar is stable while scrolling and the deepest
   level saturates at 100%. This unifies the ladder with the DepthCurve, which
   already uses a full-book shared max, so the curve needs no separate change. The
   accepted tradeoff: as the book deepens, near-touch bars shrink toward slivers
   because the deep cumulative total dominates.
4. **Test surface, verified precisely against source** (enumerated per step
   below).

**Dependencies:** the P8-8 deferred note; live source read of the frontend depth
path, the wire contract, the backend snapshot path, and every test touching the
cap.

---

## P9-1 — Backend wire depth ✅

**Goal:** raise the server BOOK prefix so the wire actually carries more than 10
levels per side, with no engine logic change.

**Deliverables:** the single constant plus the two truncation-test fixtures that
must build past the new cap to keep exercising truncation.

**Tests:** backend suite green; `WebSocketRoundTripTest` green.

**Dependencies:** P9-0.

> **As-built (P9-1), confirmed green by David 2026-09-16.**
>
> **The change is one constant.** `BookSnapshotEvent.MAX_DEPTH_LEVELS` 10 -> 20
> (`BookSnapshotEvent.java:21`). That symbol does three things at once and all
> three follow it with no edit: it sizes the four reused arrays
> (`new long[MAX_DEPTH_LEVELS]`), it is the clamp in `MatchingEngine.snapshotInto`
> (`Math.min(maxLevels, MAX_DEPTH_LEVELS)`, `MatchingEngine.java:224`), and it is
> the value `MatchingEngineHandler.publishSnapshot()` passes as `maxLevels`
> (`MatchingEngineHandler.java:169`). `fillSide` already walks the `TreeMap`
> best-first and stops at `maxLevels`, so it generalizes to any N. `serializeSnapshot`
> (`WebSocketPublisher.java`) already emits exactly `[0, levelCount)`, so a deeper
> count flows to the wire untouched, and the reducer stores the BOOK arrays
> wholesale, so it reaches `state.book` automatically.
>
> **Files delivered (complete):** `event/BookSnapshotEvent.java` (constant + doc),
> `test/engine/MatchingEngineSnapshotTest.java`,
> `test/engine/MatchingEngineHandlerSnapshotTest.java`. Both truncation tests
> (`moreThanMaxLevels_truncatesToTopN`, `depthTruncatesAtMaxLevels`) were rewritten
> against `MAX_DEPTH_LEVELS + 2` rather than a hardcoded 12, so the fixtures follow
> the constant if it is ever retuned; their boundary-index assertions moved to the
> new cap.
>
> **No change, verified:** `WebSocketRoundTripTest` does not hardcode the prefix
> (its `levelsMatch` checks single-level books, cap-irrelevant).
> `WebSocketPublisherTest` sets level counts explicitly (2, 1, 0) and asserts the
> serialized prefix length, so larger arrays do not affect it; its line-165 comment
> "NOT 10" is now stale prose (logged for P9-3, optional).
> `MatchingEngineSnapshotBenchmark` references the symbol so it tracks
> automatically; its doc comment cites "~384 B" for the four arrays, now ~640 B at
> 20 (JMH prose, no assertion depends on it; logged for P9-3, optional).

---

## P9-2 — Frontend depth viewport, full-book scaling, and scroll ✅

**Goal:** render the full book, scale bars to the full-book shared max, make Depth
a viewport, and make the P8-3 themed scrollbar engage.

**Deliverables:** `buildLadder` renders and scales over the full book;
`DepthLadder` treats Depth as viewport only; the asks-pane overflow interaction is
handled so the scrollbar engages and the touch stays in view; the affected
`buildLadder` unit tests and the one render test are updated.

**Tests:** full frontend suite green; `npm run build` green.

**Dependencies:** P9-1.

> **As-built (P9-2), confirmed green by David 2026-09-17.** Full frontend suite
> green and `npm run build` green on the live tree. Planned against as-built source
> read directly from the connected tree (`DepthLadder.tsx`, `depth.ts`, `App.tsx`,
> `terminal.css`, `depthLadder.test.tsx`), not the kickoff prose; no premise needed
> correction against source.
>
> **`src/components/DepthLadder.tsx`.** `buildLadder` lost its `depth` parameter
> entirely (the only callers were this component and its test). It now cumulates the
> whole book and takes the shared max over the full book (P9-0 option i). It returns
> both sides touch-first: bids highest-first as before, and asks are no longer
> reversed, so they come back lowest-first (touch-first); cumQty now rises down each
> returned array. The component keeps its `depth` state solely to set
> `--depth-rows` for the pane viewport; `paneStyle` is unchanged in shape.
>
> **`src/styles/terminal.css` (two hunks, rest byte-identical).** The shared
> `.depth-ladder__asks, .depth-ladder__bids` rule gained `scrollbar-gutter: stable`
> so both panes reserve the 8px bar whether or not each overflows, keeping the two
> price columns aligned and jitter-free as the live book crosses the viewport
> height. `.depth-ladder__asks` swapped `justify-content: flex-end` for
> `flex-direction: column-reverse`. Over the new touch-first asks order,
> column-reverse paints the best ask at the bottom (visual unchanged from P8-4) and
> solves what plain flex-end could not once the pane overflows: it defaults the
> scroll to the bottom so the touch stays in view, sticks to the bottom as the live
> book updates, and keeps scroll-up reachable (the flex-end + overflow trap the
> kickoff flagged). Underfull asks still pack at the divider. The bids pane needs
> none of this: its touch is the top row, so the default column with its top scroll
> position already keeps the best bid in view.
>
> **`test/depthLadder.test.tsx`.** The pure `buildLadder` tests were updated for the
> touch-first asks order (furthest ask is now the last element). The P7-4
> "depth window and shading" describe was replaced with a P9-2 "full-book render and
> shared-max shading" block, including a 20-level deep-book case proving the pre-P9
> 10-level cap is gone. The render DOM-order test now asserts DOM is best-first on
> both sides (the asks visual is delivered by column-reverse, verified live in P9-3,
> since jsdom applies no layout). The old "re-slices to the selected depth" render
> test was rewritten to assert the viewport model: the full book renders regardless
> of the selector, and only `--depth-rows` changes. The P8-4 two-pane test is
> unchanged and still green.
>
> **No change, confirmed:** `depth.ts`, `DepthCurve.tsx`, `App.tsx`. The curve was
> already full-book with no `depth` prop, so P9-1's deeper feed carries into it for
> free; this closes the P9-0 shared-max question in the affirmative (ladder and
> curve now agree, no separate curve change).
>
> **jsdom caveat.** The column-reverse visual, the default-scroll-to-touch, the
> live bottom-stick, and the themed scrollbar are layout/paint behaviours jsdom
> cannot exercise; the unit tests assert DOM order and the `--depth-rows` hook, and
> the behaviour itself is a P9-3 live-stack check (same posture as P8-8).

---

## P9-3 — Assembly and live acceptance 🔜

**Goal:** verify the two Phase 8 deferred rows on the live stack, run a full
regression, and finalize this guide. This is a verification-and-documentation
step: no new production code is expected unless acceptance surfaces a defect.

**Deliverables:**

- **Live-stack run** (backend on `:8080`, `npm run dev` on `:5173`) with a book
  built deeper than 14 levels per side, confirming:
  - Depth 14 shows 14 real levels per side when the book is that deep (defect 1
    closed); 8 and 10 likewise size their viewport and scroll the remainder.
  - Each pane scrolls the deeper book with the P8-3 themed scrollbar (thin, tinted
    thumb, no OS arrow buttons, no corner), and scroll reaches every level
    (defect 2 closed).
  - Asks pane: the best ask hugs the divider by default (scroll defaults to the
    touch), the pane sticks to the bottom as the live book updates, and scroll-up
    reaches the deep asks. Underfull asks still anchor at the divider with no gap.
  - Bids pane: best bid on top, scroll down for depth.
  - Bar scaling reads correctly: full-book shared max, deepest level saturates,
    bars stable while scrolling; the ladder and the DepthCurve agree.
  - `scrollbar-gutter: stable`: no column jitter or asks/bids misalignment as
    either side crosses the viewport height.
- **Regression:** full frontend suite green, `npm run build` green, and
  `WebSocketRoundTripTest` green (backend untouched in P9-2).
- **Acceptance result table** filling the two rows P8-8 deferred (its row 6 depth
  sizing, its row 10 depth pane scroll), in the P8-8 style.
- **Finalize the guide:** append the P9-3 as-built with the result table, flip
  P9-3 to a completed marker, and set the phase status to COMPLETE.
- **Stale-prose reconciliation (decide, do not assume):** the
  `MatchingEngineSnapshotBenchmark` "~384 B" doc comment (now ~640 B) and the
  `WebSocketPublisherTest` line-165 "NOT 10" comment. Both are prose with no
  assertion behind them; either correct them in this step or log them as
  intentionally left. State the call.

**Acceptance checklist (to fill on the live run):**

| # | Check | Result | Notes |
|---|---|---|---|
| 6 | Depth 8 / 10 / 14 each show that many real levels when the book is deep enough | TBD | defect 1 |
| 10 | Depth pane scrolls the deeper book, themed bar, no OS arrows, all levels reachable | TBD | defect 2 |
| A | Asks default to the touch, stick to bottom on live updates, scroll-up reachable | TBD | column-reverse |
| B | Bids: best bid on top, scroll down for depth | TBD | |
| C | Full-book shared-max bars stable while scrolling; ladder and curve agree | TBD | P9-0 option i |
| D | No asks/bids column jitter as a side crosses the viewport height | TBD | scrollbar-gutter |
| E | Underfull side anchors correctly (asks at divider, no empty gap) | TBD | |
| F | Frontend suite, `npm run build`, `WebSocketRoundTripTest` all green | TBD | regression |

**Dependencies:** P9-1, P9-2.

---

## Reminders carried into every step

- Verify as-built surfaces against the live tree before proposing or writing,
  never trust the kickoff prose or a summary alone. API-surface drift is the
  primary integration risk across phase boundaries.
- Deliver complete files with a path label, never diffs or fragments.
- One chat per step. Present the plan and design decisions; David greenlights
  before any code.
- Never flip a step marker to done until David confirms tests green locally.
- jsdom applies no layout: scroll and paint behaviour is verified on the live
  stack, not by a unit assertion.
