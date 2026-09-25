/**
 * Header (SRS §3.7, rebuilt in P7-3; header polish in P9-Extras). One instrument
 * row now, the way a real terminal carries the top line. No product name, no
 * tagline: the phase strips marketing chrome and shows only what the server sent
 * or a documented client-side derivation.
 *
 * Instrument row, all derived from BOOK plus the session aggregates and your own
 * orders (never from EXEC arrival order): symbol, last, session change, bid, ask,
 * mid, spread in cents and basis points, session volume, and the P9-Extras Filled
 * and Rem counters. The last-frame clock rides at the end of the same row as
 * session meta, and the reused ConnectionBadge is pinned to the top-right corner.
 *
 * P9-Extras: the P7-3 second "session row" is dissolved. The last-frame clock
 * moved up into the instrument row and the badge moved to the corner (CSS
 * margin-left:auto). Whole-number counters (Volume, Filled, Rem) render through
 * the shared format.ts formatQty so they carry thousands separators. P8-6 had
 * already removed the FIX session identity strip (SenderCompID / TargetCompID /
 * MsgSeqNum); the client MsgSeqNum counter still lives in reducer state and is
 * still incremented, only its header display is gone.
 *
 * Filled and Rem are YOUR-order aggregates, distinct from Volume (whole-market
 * session volume). Filled sums the executed portion over every one of your orders;
 * Rem sums the still-working remainder over your non-terminal orders. Both are
 * pure exported helpers (mirroring deriveHeader / buildLadder / validateOrderInput)
 * so they are unit-tested without a DOM. Spread cents/bps and change stay local
 * pure helpers here; the midpoint and clock formatters live in format.ts so this
 * header, the depth-ladder divider, and the trade tape share one definition each.
 */

import { centsToDollars, EMPTY_PRICE, formatClockNanos, formatQty, midpointLabel } from "../format";
import { ConnectionBadge } from "./ConnectionBadge";
import { isTerminal } from "../state/reducer";
import type { BookState, ConnectionStatus, MyOrder, TapeEntry } from "../state/reducer";

const SYMBOL = "ASML";

export type ChangeDirection = "up" | "down" | "flat" | "none";

export interface HeaderModel {
    readonly last: string;
    readonly changeAbs: string;
    readonly changePct: string;
    readonly changeDir: ChangeDirection;
    readonly bestBid: string;
    readonly bestAsk: string;
    readonly mid: string;
    readonly spreadCents: string;
    readonly spreadBps: string;
    readonly volume: string;
    readonly filledQty: string;
    readonly remainingQty: string;
    readonly lastFrame: string;
}

export interface HeaderInput {
    readonly book: BookState;
    readonly tape: readonly TapeEntry[];
    readonly orders: readonly MyOrder[];
    readonly sessionVolume: number;
    readonly sessionOpenCents: number;
    readonly lastFrameNanos: number;
}

/** Both tops present and real (guards the -1 empty-book sentinel). */
function twoSided(bestBid: number, bestAsk: number): boolean {
    return bestBid > 0 && bestAsk > 0;
}

/** Spread as an integer number of cents ("50"), or EMPTY_PRICE when one-sided. */
function spreadCentsLabel(bestBid: number, bestAsk: number): string {
    if (!twoSided(bestBid, bestAsk)) return EMPTY_PRICE;
    return String(bestAsk - bestBid);
}

/**
 * Spread in basis points relative to the mid, from integer cents, at fixed
 * precision. bps = spread / mid * 10000 = 20000 * (ask - bid) / (ask + bid).
 * Only bps (an inherently fractional ratio) touches float, at the display edge;
 * prices stay integer cents. EMPTY_PRICE when one-sided.
 */
function spreadBpsLabel(bestBid: number, bestAsk: number): string {
    if (!twoSided(bestBid, bestAsk)) return EMPTY_PRICE;
    const bps = (20000 * (bestAsk - bestBid)) / (bestAsk + bestBid);
    return bps.toFixed(2);
}

interface ChangeParts {
    readonly abs: string;
    readonly pct: string;
    readonly dir: ChangeDirection;
}

/**
 * Session change against the session's first trade price. Signed dollar delta
 * (from integer cents) plus a signed percent (fractional, display edge only).
 * Blank until both a last price and a session-open price exist. There is no
 * previous close, so this is a session change, never a daily change. dir drives
 * the up/down colour.
 */
function changeLabel(lastCents: number, sessionOpenCents: number): ChangeParts {
    if (lastCents <= 0 || sessionOpenCents <= 0) {
        return { abs: EMPTY_PRICE, pct: EMPTY_PRICE, dir: "none" };
    }
    const deltaCents = lastCents - sessionOpenCents;
    const dir: ChangeDirection = deltaCents > 0 ? "up" : deltaCents < 0 ? "down" : "flat";
    const sign = deltaCents > 0 ? "+" : deltaCents < 0 ? "-" : "";
    const abs = `${sign}${centsToDollars(Math.abs(deltaCents))}`;
    const pctValue = (deltaCents / sessionOpenCents) * 100;
    const pct = `${deltaCents > 0 ? "+" : ""}${pctValue.toFixed(2)}%`;
    return { abs, pct, dir };
}

/**
 * Total quantity of your orders executed this session (P9-Extras): the sum of the
 * filled portion, originalQty - remainingQty clamped at zero, over every order.
 * Mirrors OpenOrders.filledOf per row, kept inline so this header derivation stays
 * free of a sibling-component import. Honest across statuses because the reducer
 * preserves a cancelled row's unfilled remainder (nextOrder ORDER_CANCELLED), so a
 * cancelled order contributes only its pre-cancel fill and a PENDING / REJECTED row
 * contributes zero. Pure and exported for direct unit testing.
 */
export function sessionFilledQty(orders: readonly MyOrder[]): number {
    return orders.reduce((sum, o) => sum + Math.max(0, o.originalQty - o.remainingQty), 0);
}

/**
 * Your still-working size this session (P9-Extras): the sum of remainingQty over
 * non-terminal orders only (!isTerminal, i.e. PENDING / OPEN / PARTIALLY_FILLED).
 * Terminal rows (FILLED / CANCELLED / REJECTED) are excluded, so a cancel's
 * unfilled leftover never counts as working. Pure and exported for direct unit
 * testing.
 */
export function sessionWorkingQty(orders: readonly MyOrder[]): number {
    return orders.reduce((sum, o) => (isTerminal(o.status) ? sum : sum + o.remainingQty), 0);
}

/** Pure, exported: every header field from one state slice. */
export function deriveHeader(input: HeaderInput): HeaderModel {
    const { book, tape, orders, sessionVolume, sessionOpenCents, lastFrameNanos } = input;
    const lastCents = tape.length > 0 ? tape[0].priceCents : -1;
    const change = changeLabel(lastCents, sessionOpenCents);

    return {
        last: centsToDollars(lastCents),
        changeAbs: change.abs,
        changePct: change.pct,
        changeDir: change.dir,
        bestBid: centsToDollars(book.bestBid),
        bestAsk: centsToDollars(book.bestAsk),
        mid: midpointLabel(book.bestBid, book.bestAsk),
        spreadCents: spreadCentsLabel(book.bestBid, book.bestAsk),
        spreadBps: spreadBpsLabel(book.bestBid, book.bestAsk),
        volume: formatQty(sessionVolume),
        filledQty: formatQty(sessionFilledQty(orders)),
        remainingQty: formatQty(sessionWorkingQty(orders)),
        lastFrame: formatClockNanos(lastFrameNanos),
    };
}

/** Append a unit only to a real value, leaving the EMPTY_PRICE sentinel bare. */
function withUnit(value: string, unit: string): string {
    return value === EMPTY_PRICE ? value : `${value}${unit}`;
}

export interface HeaderProps {
    readonly book: BookState;
    readonly tape: readonly TapeEntry[];
    readonly orders: readonly MyOrder[];
    readonly sessionVolume: number;
    readonly sessionOpenCents: number;
    readonly lastFrameNanos: number;
    readonly connection: ConnectionStatus;
    /**
     * Session-open price in cents for the Open field (P10-5 seam). Distinct from
     * sessionOpenCents above, which is the first-TRADE price that anchors Chg: this
     * is the market open (the Alpaca ignition price, arriving P11), rendered directly
     * in the JSX rather than through deriveHeader so the pure model stays book-derived.
     * Omitted this phase, so the field shows the "—" sentinel via centsToDollars(-1)
     * until P11 supplies a value.
     */
    readonly openCents?: number;
}

export function Header({
                           book,
                           tape,
                           orders,
                           sessionVolume,
                           sessionOpenCents,
                           lastFrameNanos,
                           connection,
                           openCents,
                       }: HeaderProps) {
    const m = deriveHeader({ book, tape, orders, sessionVolume, sessionOpenCents, lastFrameNanos });

    const changeClass =
        m.changeDir === "up"
            ? " header__value--up"
            : m.changeDir === "down"
                ? " header__value--down"
                : "";

    return (
        <div className="header">
            <div className="header__instrument">
                <span className="header__ticker">{SYMBOL}</span>

                <div className="header__metric">
                    <span className="header__label">Last</span>
                    <span className="header__value" data-testid="header-last">{m.last}</span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Chg</span>
                    <span className={`header__value${changeClass}`} data-testid="header-change">
            {m.changeAbs}
                        <span className="header__value-sub" data-testid="header-change-pct">{m.changePct}</span>
          </span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Open</span>
                    <span className="header__value" data-testid="header-open">{centsToDollars(openCents ?? -1)}</span>
                </div>

                <div className="header__metric header__metric--bid">
                    <span className="header__label">Bid</span>
                    <span className="header__value" data-testid="header-bid">{m.bestBid}</span>
                </div>

                <div className="header__metric header__metric--ask">
                    <span className="header__label">Ask</span>
                    <span className="header__value" data-testid="header-ask">{m.bestAsk}</span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Mid</span>
                    <span className="header__value" data-testid="header-mid">{m.mid}</span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Spread</span>
                    <span className="header__value" data-testid="header-spread">
            <span data-testid="header-spread-cents">{withUnit(m.spreadCents, "\u00A2")}</span>
            <span className="header__value-sub" data-testid="header-spread-bps">
              {withUnit(m.spreadBps, " bps")}
            </span>
          </span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Volume</span>
                    <span className="header__value" data-testid="header-volume">{m.volume}</span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Filled</span>
                    <span className="header__value" data-testid="header-filled">{m.filledQty}</span>
                </div>

                <div className="header__metric">
                    <span className="header__label">Rem</span>
                    <span className="header__value" data-testid="header-remaining">{m.remainingQty}</span>
                </div>

                <div className="header__metric header__metric--last-frame">
                    <span className="header__label">Last frame</span>
                    <span className="header__value" data-testid="header-last-frame">{m.lastFrame}</span>
                </div>

                <ConnectionBadge status={connection} />
            </div>
        </div>
    );
}