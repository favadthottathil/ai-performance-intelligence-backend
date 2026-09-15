import { jest } from "@jest/globals";

const mockQuery = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
    default: { query: mockQuery },
}));

const request = (await import("supertest")).default;
const { default: app } = await import("../src/app.js");

const VALID_KEY = "app_live_valid";
const APP_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockImplementation(async (sql) => {
        if (sql.includes("SELECT id FROM apps WHERE api_key")) {
            return { rows: [{ id: APP_ID }] };
        }
        if (sql.includes("INSERT INTO metrics")) {
            return { rows: [] };
        }
        return { rows: [] };
    });
});

describe("POST /metrics", () => {
    it("rejects requests without an API key", async () => {
        const response = await request(app).post("/metrics").send({
            event: "screen_render",
            screen: "home",
        });

        expect(response.statusCode).toBe(401);
    });

    it("rejects an invalid API key", async () => {
        mockQuery.mockImplementation(async (sql) => {
            if (sql.includes("SELECT id FROM apps WHERE api_key")) {
                return { rows: [] };
            }
            return { rows: [] };
        });

        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_invalid")
            .send({ event: "screen_render", screen: "home" });

        expect(response.statusCode).toBe(401);
    });

    it("rejects a payload missing event or screen", async () => {
        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", VALID_KEY)
            .send({ screen: "home" });

        expect(response.statusCode).toBe(400);
    });

    it("collects a valid metric", async () => {
        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", VALID_KEY)
            .send({ event: "screen_render", screen: "home", render_time: 14 });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Metric collected successfully");

        const insertCall = mockQuery.mock.calls.find(([sql]) =>
            sql.includes("INSERT INTO metrics")
        );
        expect(insertCall).toBeDefined();
        // Column order matches METRIC_COLUMNS: app_id, screen, target, event,
        // render_time, frame_time, frame_dropped, api_latency, is_error,
        // error_message, stack_trace, screen_load_time, client_timestamp.
        expect(insertCall[1]).toEqual([
            APP_ID,
            "home",
            null,
            "screen_render",
            14,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ]);
    });

    it("persists target and client_timestamp when the SDK supplies them", async () => {
        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", VALID_KEY)
            .send({
                event: "api_call",
                screen: "home",
                target: "/v1/users",
                api_latency: 140,
                client_timestamp: "2026-09-15T10:00:00.000Z",
            });

        expect(response.statusCode).toBe(201);

        const [, values] = mockQuery.mock.calls.find(([sql]) =>
            sql.includes("INSERT INTO metrics")
        );

        expect(values[1]).toBe("home");
        expect(values[2]).toBe("/v1/users");
        expect(values[7]).toBe(140);
        expect(values[12]).toBe("2026-09-15T10:00:00.000Z");
    });

    it("stores an unparseable client_timestamp as null rather than failing", async () => {
        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", VALID_KEY)
            .send({
                event: "app_render",
                screen: "home",
                client_timestamp: "not-a-date",
            });

        expect(response.statusCode).toBe(201);

        const [, values] = mockQuery.mock.calls.find(([sql]) =>
            sql.includes("INSERT INTO metrics")
        );
        expect(values[12]).toBeNull();
    });

    it("rejects a metric whose target is not a usable string", async () => {
        const response = await request(app)
            .post("/metrics")
            .set("x-api-key", VALID_KEY)
            .send({ event: "api_call", screen: "home", target: "" });

        expect(response.statusCode).toBe(400);
    });
});

describe("POST /metrics/batch", () => {
    it("rejects a non-array payload", async () => {
        const response = await request(app)
            .post("/metrics/batch")
            .set("x-api-key", VALID_KEY)
            .send({ metrics: "not-an-array" });

        expect(response.statusCode).toBe(400);
    });

    it("rejects an empty batch", async () => {
        const response = await request(app)
            .post("/metrics/batch")
            .set("x-api-key", VALID_KEY)
            .send({ metrics: [] });

        expect(response.statusCode).toBe(400);
    });

    it("rejects a batch containing an invalid metric", async () => {
        const response = await request(app)
            .post("/metrics/batch")
            .set("x-api-key", VALID_KEY)
            .send({
                metrics: [
                    { event: "app_render", screen: "home" },
                    { event: "app_render" },
                ],
            });

        expect(response.statusCode).toBe(400);
    });

    it("inserts a batch of metrics in a single query", async () => {
        const response = await request(app)
            .post("/metrics/batch")
            .set("x-api-key", VALID_KEY)
            .send({
                metrics: [
                    { event: "app_render", screen: "home", render_time: 10, frame_dropped: false },
                    { event: "screen_open", screen: "home", screen_load_time: 200 },
                ],
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("2 metrics collected successfully");

        const insertCalls = mockQuery.mock.calls.filter(([sql]) =>
            sql.includes("INSERT INTO metrics")
        );
        expect(insertCalls).toHaveLength(1);

        const [sql, values] = insertCalls[0];
        // One VALUES clause per metric, 13 columns each.
        expect(sql.match(/\(\$\d+/g)).toHaveLength(2);
        expect(values).toHaveLength(26);
    });
});

describe("GET /metrics/stream", () => {
    it("requires a JWT", async () => {
        const response = await request(app).get("/metrics/stream?appId=" + APP_ID);

        expect(response.statusCode).toBe(401);
    });
});
