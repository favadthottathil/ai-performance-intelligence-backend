import request from "supertest";
import app from "../src/app.js";

describe("Metrics API", () => {
    it("should collect a metric successfully", async () => {
        const response = await request(app).post("/metrics").send({
            event: "screen_render",
            screen: "home",
            timestamp: new Date().toISOString(),
        });
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Metric collected successfully");
    });
});