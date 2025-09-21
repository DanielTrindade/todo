import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { healthRoutes } from "../../src/routes/health";

import { ensureTestEnv } from "../helpers/env";

ensureTestEnv();

describe("healthRoutes", () => {
    it("returns status ok with timestamp", async () => {
        const app = new Elysia().use(healthRoutes);

        const response = await app.handle(
            new Request("http://localhost/health"),
        );

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe("ok");
        expect(typeof body.timestamp).toBe("string");
        expect(() => new Date(body.timestamp)).not.toThrow();
    });
});
