import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Navbar } from "../src/components/Navbar";

// P5-0's no-globals stance means RTL's auto-cleanup never registers; wire it
// explicitly so renders don't bleed across tests.
afterEach(cleanup);

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Navbar />
        </MemoryRouter>,
    );
}

describe("<Navbar />", () => {
    it("renders both navigation links", () => {
        renderAt("/trading");
        expect(screen.getByText("Trading")).not.toBeNull();
        expect(screen.getByText("Price Chart")).not.toBeNull();
    });

    it("marks Trading active on /trading, not Price Chart", () => {
        renderAt("/trading");
        expect(screen.getByText("Trading").className).toContain("nav__link--active");
        expect(screen.getByText("Price Chart").className).not.toContain("nav__link--active");
    });

    it("marks Price Chart active on /chart, not Trading", () => {
        renderAt("/chart");
        expect(screen.getByText("Price Chart").className).toContain("nav__link--active");
        expect(screen.getByText("Trading").className).not.toContain("nav__link--active");
    });
});
