import { jest } from "@jest/globals";

const mockQuery = jest.fn();

jest.unstable_mockModule("../src/config/db.js", () => ({
    default: { query: mockQuery },
}));

process.env.JWT_SECRET = "test-secret";

const request = (await import("supertest")).default;
const jwt = (await import("jsonwebtoken")).default;
const { default: app } = await import("../src/app.js");

const USER_ID = "22222222-2222-2222-2222-222222222222";
const APP_ID = "11111111-1111-1111-1111-111111111111";
const token = jwt.sign({ userId: USER_ID }, process.env.JWT_SECRET);
const auth = (r) => r.set("Authorization", `Bearer ${token}`);

beforeEach(() => {
    mockQuery.mockReset();
});

describe("POST /apps", () => {
    it("creates a new app without rotating existing keys", async () => {
        mockQuery.mockImplementation(async (sql) => {
            if (sql.includes("INSERT INTO apps")) {
                return { rows: [{ id: APP_ID, user_id: USER_ID, name: "Second App", api_key: "app_live_new" }] };
            }
            return { rows: [] };
        });

        const res = await auth(request(app).post("/apps")).send({ name: "Second App" });

        expect(res.statusCode).toBe(201);
        expect(res.body.api_key).toBe("app_live_new");

        // The regression that motivated this: creating a second app must never
        // issue an UPDATE against an existing app's key.
        const updates = mockQuery.mock.calls.filter(([sql]) => sql.includes("UPDATE apps"));
        expect(updates).toHaveLength(0);
    });

    it("rejects a blank app name", async () => {
        const res = await auth(request(app).post("/apps")).send({ name: "   " });
        expect(res.statusCode).toBe(400);
    });

    it("requires authentication", async () => {
        const res = await request(app).post("/apps").send({ name: "X" });
        expect(res.statusCode).toBe(401);
    });
});

describe("GET /apps", () => {
    it("returns an empty list rather than 404 when the user has no apps", async () => {
        mockQuery.mockImplementation(async () => ({ rows: [] }));

        const res = await auth(request(app).get("/apps"));

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe("POST /apps/:appId/rotate-key", () => {
    it("rotates the key of an owned app", async () => {
        mockQuery.mockImplementation(async (sql) => {
            if (sql.includes("SELECT api_key FROM apps")) {
                return { rows: [{ api_key: "app_live_old" }] };
            }
            if (sql.includes("UPDATE apps")) {
                return { rows: [{ id: APP_ID, name: "App", api_key: "app_live_rotated" }] };
            }
            return { rows: [] };
        });

        const res = await auth(request(app).post(`/apps/${APP_ID}/rotate-key`));

        expect(res.statusCode).toBe(200);
        expect(res.body.api_key).toBe("app_live_rotated");
    });

    it("404s when the app is not owned by the caller", async () => {
        mockQuery.mockImplementation(async (sql) => {
            if (sql.includes("SELECT api_key FROM apps")) return { rows: [] };
            if (sql.includes("UPDATE apps")) return { rows: [] };
            return { rows: [] };
        });

        const res = await auth(request(app).post(`/apps/${APP_ID}/rotate-key`));

        expect(res.statusCode).toBe(404);
    });
});
