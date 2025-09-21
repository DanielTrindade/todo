import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { jwt as jwtPlugin } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { jwtVerify } from "jose";

import { ensureTestEnv, resetEnv } from "../helpers/env";
import { createDbMock } from "../helpers/mockDb";

ensureTestEnv();

const dbMock = createDbMock();

mock.module("../../src/db", () => ({
    db: dbMock,
    client: { end: async () => {} },
}));

const bcryptCompare = mock(async (password: string, hash: string) => {
    return password === "correct-password" && hash === "hashed-correct-password";
});

mock.module("bcryptjs", () => ({
    default: {
        genSalt: async () => "salt",
        hash: async (password: string) => `hashed-${password}`,
        compare: bcryptCompare,
    },
}));

let authRoutes: typeof import("../../src/routes/auth")['authRoutes'];

beforeAll(async () => {
    resetEnv();
    authRoutes = (await import("../../src/routes/auth")).authRoutes;
});

const getSessionTtlSeconds = () =>
    Number.parseInt(process.env.SESSION_TTL_SECONDS ?? "86400", 10);

const createApp = () => {
    const cookieSecret = process.env.COOKIE_SECRET ?? "test-cookie-secret";
    const jwtSecret = process.env.JWT_SECRET ?? "test-jwt-secret";

    return new Elysia({
        cookie: { secrets: [cookieSecret] },
    })
        .use(
            jwtPlugin({
                secret: jwtSecret,
                name: "jwt",
            }),
        )
        .use(authRoutes);
};

beforeEach(() => {
    resetEnv();
    dbMock.state.selectResult = [];
    dbMock.state.selectWhereResult = null;
    dbMock.state.insertResult = [];
    dbMock.state.updateResult = [];
    dbMock.state.deleteResult = { count: 0 };
    bcryptCompare.mockClear();
});

describe("authRoutes", () => {
    it("registers a new user and returns public data", async () => {
        const createdAt = new Date("2024-01-01T00:00:00.000Z");
        const updatedAt = new Date("2024-01-01T00:00:00.000Z");
        dbMock.state.selectWhereResult = [];
        dbMock.state.insertResult = [
            {
                id: "user-1",
                username: "john",
                email: "john@example.com",
                password: "hashed-StrongPass1",
                salt: "salt",
                createdAt,
                updatedAt,
            },
        ];

        const app = createApp();

        const before = Math.floor(Date.now() / 1000);
        const response = await app.handle(
            new Request("http://localhost/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    username: "john",
                    email: "john@example.com",
                    password: "StrongPass1",
                }),
            }),
        );
        const after = Math.floor(Date.now() / 1000);

        expect(response.status).toBe(200);
        const setCookie = response.headers.get("set-cookie");
        expect(setCookie).toContain("jwt=");
        const sessionTtlSeconds = getSessionTtlSeconds();
        expect(setCookie).toContain(`Max-Age=${sessionTtlSeconds}`);

        const token = setCookie?.match(/jwt=([^;]+)/)?.[1];
        expect(token).toBeTruthy();

        if (!token) {
            throw new Error("JWT token not found in cookie");
        }

        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET ?? "test-jwt-secret",
        );
        const { payload } = await jwtVerify(token, secret);
        expect(payload.userId).toBe("user-1");
        if (!payload.exp) {
            throw new Error("Token is missing exp claim");
        }

        expect(payload.exp).toBeGreaterThanOrEqual(before + sessionTtlSeconds);
        expect(payload.exp).toBeLessThanOrEqual(after + sessionTtlSeconds);

        const body = await response.json();
        expect(body).toMatchObject({
            id: "user-1",
            username: "john",
            email: "john@example.com",
        });
        expect(body.password).toBeUndefined();
        expect(body.salt).toBeUndefined();
        expect(body.createdAt).toBe(new Date(createdAt).toISOString());
        expect(body.updatedAt).toBe(new Date(updatedAt).toISOString());
    });

    it("returns 409 when email already exists", async () => {
        dbMock.state.selectWhereResult = [
            {
                id: "user-1",
                username: "john",
                email: "john@example.com",
            },
        ];

        const app = createApp();
        const response = await app.handle(
            new Request("http://localhost/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    username: "john",
                    email: "john@example.com",
                    password: "StrongPass1",
                }),
            }),
        );

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body).toEqual({ error: "Email já registrado" });
    });

    it("logs in a user and strips sensitive fields", async () => {
        const now = new Date("2024-01-02T00:00:00.000Z");
        dbMock.state.selectWhereResult = [
            {
                id: "user-2",
                username: "jane",
                email: "jane@example.com",
                password: "hashed-correct-password",
                salt: "salt",
                createdAt: now,
                updatedAt: now,
            },
        ];

        const app = createApp();
        const before = Math.floor(Date.now() / 1000);
        const response = await app.handle(
            new Request("http://localhost/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    email: "jane@example.com",
                    password: "correct-password",
                }),
            }),
        );
        const after = Math.floor(Date.now() / 1000);

        expect(response.status).toBe(200);
        const cookie = response.headers.get("set-cookie");
        expect(cookie).toContain("jwt=");
        const sessionTtlSeconds = getSessionTtlSeconds();
        expect(cookie).toContain(`Max-Age=${sessionTtlSeconds}`);

        const token = cookie?.match(/jwt=([^;]+)/)?.[1];
        expect(token).toBeTruthy();

        if (!token) {
            throw new Error("JWT token not found in cookie");
        }

        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET ?? "test-jwt-secret",
        );
        const { payload } = await jwtVerify(token, secret);
        expect(payload.userId).toBe("user-2");
        if (!payload.exp) {
            throw new Error("Token is missing exp claim");
        }

        expect(payload.exp).toBeGreaterThanOrEqual(before + sessionTtlSeconds);
        expect(payload.exp).toBeLessThanOrEqual(after + sessionTtlSeconds);

        const body = await response.json();
        expect(body).toMatchObject({
            id: "user-2",
            username: "jane",
            email: "jane@example.com",
        });
        expect(body.password).toBeUndefined();
        expect(body.salt).toBeUndefined();
        expect(bcryptCompare).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid credentials", async () => {
        dbMock.state.selectWhereResult = [
            {
                id: "user-2",
                username: "jane",
                email: "jane@example.com",
                password: "hashed-correct-password",
                salt: "salt",
            },
        ];

        const app = createApp();
        const response = await app.handle(
            new Request("http://localhost/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    email: "jane@example.com",
                    password: "wrong-password",
                }),
            }),
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toEqual({ error: "Credenciais inválidas" });
    });

    it("handles logout", async () => {
        const app = createApp();
        const response = await app.handle(
            new Request("http://localhost/logout", {
                method: "POST",
            }),
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ message: "Logout realizado com sucesso" });
    });
});
