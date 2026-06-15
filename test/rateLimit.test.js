import { jest } from "@jest/globals";

process.env.METRICS_RATE_LIMIT = "2";

const mockQuery = jest.fn(async (sql) => {
    if (sql.includes("SELECT id FROM apps WHERE api_key")) {
        return { rows: [{ id: "11111111-1111-1111-1111-111111111111" }] };
    }
    return { rows: [] };
});

jest.unstable_mockModule("../src/config/db.js", () => ({
    default: { query: mockQuery },
}));

const request = (await import("supertest")).default;
const { default: app } = await import("../src/app.js");

describe("metrics ingestion rate limiting", () => {
    it("returns 429 once the per-key limit is exceeded", async () => {
        const payload = { event: "screen_render", screen: "home" };

        await request(app).post("/metrics").set("x-api-key", "app_live_rate_limited").send(payload);
        await request(app).post("/metrics").set("x-api-key", "app_live_rate_limited").send(payload);
        const third = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_rate_limited")
            .send(payload);

        expect(third.statusCode).toBe(429);
        expect(third.body.error).toBe("Too many requests, please slow down.");
    });
});
