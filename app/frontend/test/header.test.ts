import { describe, expect, it } from "vitest";

import { deriveHeader, sessionFilledQty, sessionWorkingQty } from "../src/components/Header";
import type { HeaderInput } from "../src/components/Header";
import { EMPTY_PRICE } from "../src/format";
import type { BookState, MyOrder, TapeEntry } from "../src/state/reducer";

function book(bestBid: number, bestAsk: number, timestamp = 0): BookState {
    return { bestBid, bestAsk, bids: [], asks: [], timestamp };
}

function tapeAt(priceCents: number, timestamp = 0): TapeEntry[] {
    return [
        {
            tradeId: 1,
            priceCents,
            quantity: 1,
            aggressorOrderId: 1,
            passiveOrderId: 2,
            timestamp,
            mine: false,
        },
    ];
}

function order(over: Partial<MyOrder>): MyOrder {
    return {
        clOrdId: 1,
        side: "BUY",
        priceCents: 15000,
        originalQty: 0,
        remainingQty: 0,
        status: "OPEN",
        ...over,
    };
}

function input(over: Partial<HeaderInput>): HeaderInput {
    return {
        book: book(-1, -1),
        tape: [],
        orders: [],
        sessionVolume: 0,
        sessionOpenCents: -1,
        lastFrameNanos: 0,
        ...over,
    };
}

describe("deriveHeader — quote fields", () => {
    it("formats a two-sided book with an even-cent mid", () => {
        const m = deriveHeader(input({ book: book(15000, 15050) }));
        expect(m.bestBid).toBe("150.00");
        expect(m.bestAsk).toBe("150.50");
        expect(m.mid).toBe("150.25");
    });

    it("renders a half-cent mid exactly (no truncation, no float)", () => {
        expect(deriveHeader(input({ book: book(15000, 15025) })).mid).toBe("150.125");
    });

    it("handles sub-dollar prices", () => {
        const m = deriveHeader(input({ book: book(3, 5) }));
        expect(m.bestBid).toBe("0.03");
        expect(m.bestAsk).toBe("0.05");
        expect(m.mid).toBe("0.04");
    });
});

describe("deriveHeader — spread in cents and basis points", () => {
    it("computes cents and bps at known values", () => {
        const m = deriveHeader(input({ book: book(15000, 15050) }));
        expect(m.spreadCents).toBe("50");
        // 20000 * 50 / 30050 = 33.2778...
        expect(m.spreadBps).toBe("33.28");
    });

    it("computes a one-cent spread's bps", () => {
        const m = deriveHeader(input({ book: book(10000, 10001) }));
        expect(m.spreadCents).toBe("1");
        // 20000 * 1 / 20001 = 0.99995 -> 1.00
        expect(m.spreadBps).toBe("1.00");
    });

    it("blanks both when the book is one-sided", () => {
        const bidOnly = deriveHeader(input({ book: book(15000, -1) }));
        expect(bidOnly.spreadCents).toBe(EMPTY_PRICE);
        expect(bidOnly.spreadBps).toBe(EMPTY_PRICE);

        const askOnly = deriveHeader(input({ book: book(-1, 15025) }));
        expect(askOnly.spreadCents).toBe(EMPTY_PRICE);
        expect(askOnly.spreadBps).toBe(EMPTY_PRICE);
    });
});

describe("deriveHeader — last and session change", () => {
    it("takes last from the newest tape print", () => {
        expect(deriveHeader(input({ tape: tapeAt(15025) })).last).toBe("150.25");
    });

    it("renders a positive session change with sign, percent, and direction", () => {
        const m = deriveHeader(input({ tape: tapeAt(15025), sessionOpenCents: 15000 }));
        expect(m.changeAbs).toBe("+0.25");
        expect(m.changePct).toBe("+0.17%"); // 25 / 15000 = 0.1667%
        expect(m.changeDir).toBe("up");
    });

    it("renders a negative session change", () => {
        const m = deriveHeader(input({ tape: tapeAt(14975), sessionOpenCents: 15000 }));
        expect(m.changeAbs).toBe("-0.25");
        expect(m.changePct).toBe("-0.17%");
        expect(m.changeDir).toBe("down");
    });

    it("renders a flat session change", () => {
        const m = deriveHeader(input({ tape: tapeAt(15000), sessionOpenCents: 15000 }));
        expect(m.changeAbs).toBe("0.00");
        expect(m.changePct).toBe("0.00%");
        expect(m.changeDir).toBe("flat");
    });

    it("blanks change before the first trade (no session open)", () => {
        const m = deriveHeader(input({ tape: [], sessionOpenCents: -1 }));
        expect(m.last).toBe(EMPTY_PRICE);
        expect(m.changeAbs).toBe(EMPTY_PRICE);
        expect(m.changePct).toBe(EMPTY_PRICE);
        expect(m.changeDir).toBe("none");
    });
});

describe("deriveHeader — volume and empty-book sentinels", () => {
    it("groups session volume with thousands separators", () => {
        expect(deriveHeader(input({ sessionVolume: 1240 })).volume).toBe("1,240");
        expect(deriveHeader(input({ sessionVolume: 1_000_000 })).volume).toBe("1,000,000");
        expect(deriveHeader(input({ sessionVolume: 0 })).volume).toBe("0");
    });

    it("renders empty-book -1 sentinels as blank, never as -0.01 or -0.00", () => {
        const m = deriveHeader(input({ book: book(-1, -1), tape: [], sessionOpenCents: -1 }));
        for (const v of [m.last, m.bestBid, m.bestAsk, m.mid, m.spreadCents, m.spreadBps, m.changeAbs, m.changePct]) {
            expect(v).toBe(EMPTY_PRICE);
            expect(v.includes("-")).toBe(false);
        }
    });
});

describe("deriveHeader — session filled and remaining counters", () => {
    it("sums filled over every status and working over non-terminal only", () => {
        const orders: MyOrder[] = [
            order({ clOrdId: 1, status: "PENDING", originalQty: 100, remainingQty: 100 }),
            order({ clOrdId: 2, status: "OPEN", originalQty: 50, remainingQty: 50 }),
            order({ clOrdId: 3, status: "PARTIALLY_FILLED", originalQty: 200, remainingQty: 120 }),
            order({ clOrdId: 4, status: "FILLED", originalQty: 30, remainingQty: 0 }),
            order({ clOrdId: 5, status: "CANCELLED", originalQty: 500, remainingQty: 300 }),
            order({ clOrdId: 6, status: "REJECTED", originalQty: 10, remainingQty: 10 }),
        ];
        const m = deriveHeader(input({ orders }));
        // filled: 0 + 0 + 80 + 30 + (500-300)=200 + 0 = 310
        expect(m.filledQty).toBe("310");
        // working (PENDING + OPEN + PARTIALLY_FILLED only): 100 + 50 + 120 = 270
        expect(m.remainingQty).toBe("270");
    });

    it("groups large counter values with thousands separators", () => {
        const orders: MyOrder[] = [
            order({ clOrdId: 1, status: "FILLED", originalQty: 12340, remainingQty: 0 }),
            order({ clOrdId: 2, status: "OPEN", originalQty: 5000, remainingQty: 5000 }),
        ];
        const m = deriveHeader(input({ orders }));
        expect(m.filledQty).toBe("12,340");
        expect(m.remainingQty).toBe("5,000");
    });

    it("reads zero on both counters with no orders", () => {
        const m = deriveHeader(input({ orders: [] }));
        expect(m.filledQty).toBe("0");
        expect(m.remainingQty).toBe("0");
    });
});

describe("sessionFilledQty / sessionWorkingQty (pure)", () => {
    it("filled counts a cancelled row's pre-cancel fill and ignores its leftover", () => {
        expect(sessionFilledQty([order({ status: "CANCELLED", originalQty: 500, remainingQty: 300 })])).toBe(200);
    });

    it("working excludes every terminal status", () => {
        const orders: MyOrder[] = [
            order({ clOrdId: 1, status: "FILLED", originalQty: 10, remainingQty: 0 }),
            order({ clOrdId: 2, status: "CANCELLED", originalQty: 10, remainingQty: 6 }),
            order({ clOrdId: 3, status: "REJECTED", originalQty: 10, remainingQty: 10 }),
            order({ clOrdId: 4, status: "OPEN", originalQty: 10, remainingQty: 10 }),
        ];
        expect(sessionWorkingQty(orders)).toBe(10);
    });
});

describe("deriveHeader — last frame received", () => {
    it("blanks when no frame has arrived", () => {
        expect(deriveHeader(input({ lastFrameNanos: 0 })).lastFrame).toBe(EMPTY_PRICE);
    });

    it("renders epoch nanos as HH:MM:SS.mmm (tz-agnostic shape)", () => {
        const m = deriveHeader(input({ lastFrameNanos: 1_700_000_000_123_456_789 }));
        expect(m.lastFrame).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });
});