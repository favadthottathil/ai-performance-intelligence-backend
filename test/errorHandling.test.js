import { jest } from "@jest/globals";

const mockQuery = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
    default: { query: mockQuery },
}));

const request = (await import("supertest")).default;
const { default: app } = await import("../src/app.js");

const dbError = (code) => Object.assign(new Error(`db down: ${code}`), { code });

beforeEach(() => {
    mockQuery.mockReset();
});

describe("terminal error handler", () => {
    it("serves /health without touching the database", async () => {
        const res = await request(app).get("/health");

        expect(res.statusCode).toBe(200);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it("returns a JSON 404 for an unknown route", async () => {
        const res = await request(app).get("/no-such-route");

        expect(res.statusCode).toBe(404);
        expect(res.body.error).toBe("Not found");
    });

    // A DB outage is retryable, so it must not be reported as a 500 — that
    // tells callers and uptime checks the request itself was at fault.
    it.each([
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
        "ECONNRESET",
    ])("reports a %s database fault as 503", async (code) => {
        mockQuery.mockRejectedValue(dbError(code));

        const res = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_any")
            .send({ event: "app_render", screen: "home" });

        expect(res.statusCode).toBe(503);
        expect(res.body.error).toBe("Service temporarily unavailable");
    });

    it("reports a Postgres 08-class connection exception as 503", async () => {
        mockQuery.mockRejectedValue(dbError("08006"));

        const res = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_any")
            .send({ event: "app_render", screen: "home" });

        expect(res.statusCode).toBe(503);
    });

    it("reports a non-connection failure as 500 without leaking its message", async () => {
        mockQuery.mockRejectedValue(dbError("42P01")); // undefined_table

        const res = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_any")
            .send({ event: "app_render", screen: "home" });

        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe("Internal server error");
        expect(JSON.stringify(res.body)).not.toContain("db down");
    });

    it("rejects an invalid payload before reaching the database", async () => {
        mockQuery.mockResolvedValue({ rows: [{ id: "app-1" }] });

        const res = await request(app)
            .post("/metrics")
            .set("x-api-key", "app_live_any")
            .send({ event: "api_call", screen: "home", target: "" });

        expect(res.statusCode).toBe(400);
        // Auth runs first and may query; no INSERT should have been attempted.
        const inserts = mockQuery.mock.calls.filter(([sql]) =>
            sql.includes("INSERT INTO metrics")
        );
        expect(inserts).toHaveLength(0);
    });
});
