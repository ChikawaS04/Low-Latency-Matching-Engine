/**
 * Price chart page scaffold (P10-4).
 *
 * An empty two-region layout, a chart region (left) and a side-panel region
 * (right), both placeholders this phase. It receives the shared reducer state so
 * the data source is already wired for the price chart (P12) and the side panel
 * (P13); it renders nothing functional yet. The state prop is intentionally unused
 * for now (prefixed to satisfy noUnusedParameters) and kept on the signature so the
 * seam is visible and P12 / P13 need no App change to start consuming it.
 */

import type { AppState } from "../state/reducer";

export interface PriceChartPageProps {
    readonly state: AppState;
}

export function PriceChartPage({ state: _state }: PriceChartPageProps) {
    return (
        <main className="chart-page" aria-label="Price chart">
            <section className="chart-page__region chart-page__region--chart" aria-label="Chart">
                <h2 className="panel__title">Price chart</h2>
                <div className="chart-page__placeholder">Chart arrives in P12.</div>
            </section>

            <section className="chart-page__region chart-page__region--panel" aria-label="Side panel">
                <h2 className="panel__title">Session</h2>
                <div className="chart-page__placeholder">Side panel arrives in P13.</div>
            </section>
        </main>
    );
}
