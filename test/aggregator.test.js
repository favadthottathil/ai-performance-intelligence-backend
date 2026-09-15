import { aggregateByScreen } from "../src/services/metrics.aggregator.js";

describe("aggregateByScreen", () => {
    it("attributes API and crash events to the active screen, not to phantom screens", () => {
        const summary = aggregateByScreen([
            { screen: "/home", target: null, event: "screen_open" },
            { screen: "/home", target: null, event: "app_render", render_time: 24, frame_dropped: true },
            { screen: "/home", target: null, event: "app_render", render_time: 10, frame_dropped: false },
            { screen: "/home", target: "/v1/users", event: "api_call", api_latency: 140 },
            { screen: "/home", target: "/v1/orders", event: "api_error", api_latency: 900, is_error: true },
            { screen: "/home", target: "global_error_handler", event: "app_crash", is_error: true },
        ]);

        // The endpoints and the crash handler must not become their own rows.
        expect(summary).toHaveLength(1);

        const home = summary[0];
        expect(home.screen).toBe("/home");
        // Render stats consider only the two render events, undiluted by the
        // zero-render API/crash rows.
        expect(home.avg_render_time_ms).toBe(17);
        expect(home.frame_drop_rate).toBe(0.5);
        expect(home.avg_api_latency_ms).toBe(520);
        expect(home.api_failure_count).toBe(1);
        expect(home.crash_count).toBe(1);
    });

    it("keeps legacy rows out of the per-screen breakdown", () => {
        // Rows written before `target` existed carry the endpoint in `screen`
        // and have no real screen to attribute to.
        const summary = aggregateByScreen([
            { screen: "/home", target: null, event: "app_render", render_time: 12, frame_dropped: false },
            { screen: "/v1/legacy", target: null, event: "api_call", api_latency: 300 },
            { screen: "global_error_handler", target: null, event: "app_crash" },
        ]);

        expect(summary.map((s) => s.screen)).toEqual(["/home"]);
    });

    it("ignores rows without a usable screen", () => {
        const summary = aggregateByScreen([
            { screen: "", target: null, event: "app_render", render_time: 10 },
            { screen: null, target: null, event: "app_render", render_time: 10 },
            { screen: "/ok", target: null, event: "app_render", render_time: 10, frame_dropped: false },
        ]);

        expect(summary).toHaveLength(1);
        expect(summary[0].screen).toBe("/ok");
    });

    it("counts an api_call flagged is_error as a failure", () => {
        const [summary] = aggregateByScreen([
            { screen: "/home", target: "/v1/x", event: "api_call", api_latency: 10, is_error: true },
        ]);

        expect(summary.api_failure_count).toBe(1);
    });

    it("returns an empty array for no metrics", () => {
        expect(aggregateByScreen([])).toEqual([]);
    });
});
