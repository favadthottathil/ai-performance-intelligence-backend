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
        expect(insertCall[1]).toEqual([
            APP_ID,
            "home",
            "screen_render",
            14,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ]);
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
        // One VALUES clause per metric, 11 columns each.
        expect(sql.match(/\(\$\d+/g)).toHaveLength(2);
        expect(values).toHaveLength(22);
    });
});

describe("GET /metrics/stream", () => {
    it("requires a JWT", async () => {
        const response = await request(app).get("/metrics/stream?appId=" + APP_ID);

        expect(response.statusCode).toBe(401);
    });
});
