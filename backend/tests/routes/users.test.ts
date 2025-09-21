import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { jwt as jwtPlugin } from "@elysiajs/jwt";
import { Elysia } from "elysia";

import { ensureTestEnv, resetEnv } from "../helpers/env";
import { createDbMock } from "../helpers/mockDb";

ensureTestEnv();

const dbMock = createDbMock();
let mockedUserId: string | undefined = "user-1";

const getUserIdMock = mock(async ({ set }: { set: { status?: number } }) => {
	if (mockedUserId) {
		return mockedUserId;
	}
	set.status = 401;
	return undefined;
});

mock.module("../../src/db", () => ({
	db: dbMock,
	client: { end: async () => {} },
}));

mock.module("../../src/utils/get-user-id", () => ({
	getUserId: getUserIdMock,
}));

let userRoutes: typeof import("../../src/routes/users")["userRoutes"];

beforeAll(async () => {
	resetEnv();
	userRoutes = (await import("../../src/routes/users")).userRoutes;
});

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
        .use(userRoutes);
};

beforeEach(() => {
	resetEnv();
	mockedUserId = "user-1";
	dbMock.state.selectResult = [];
	dbMock.state.selectWhereResult = null;
	dbMock.state.insertResult = [];
	dbMock.state.updateResult = [];
	dbMock.state.deleteResult = { count: 0 };
	getUserIdMock.mockClear();
});

describe("userRoutes", () => {
	it("lists users without sensitive fields", async () => {
		const now = new Date("2024-01-07T00:00:00.000Z");
		dbMock.state.selectResult = [
			{
				id: "user-1",
				username: "john",
				email: "john@example.com",
				password: "secret",
				salt: "salt",
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/", { method: "GET" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveLength(1);
		expect(body[0]).toMatchObject({
			id: "user-1",
			email: "john@example.com",
		});
		expect(body[0].password).toBeUndefined();
		expect(body[0].salt).toBeUndefined();
	});

	it("returns a user by id", async () => {
		const now = new Date("2024-01-08T00:00:00.000Z");
		dbMock.state.selectWhereResult = [
			{
				id: "user-1",
				username: "john",
				email: "john@example.com",
				password: "secret",
				salt: "salt",
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", { method: "GET" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			id: "user-1",
			username: "john",
		});
		expect(body.password).toBeUndefined();
		expect(body.salt).toBeUndefined();
	});

	it("returns 404 when user is missing", async () => {
		dbMock.state.selectWhereResult = [];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/missing", { method: "GET" }),
		);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({ error: "Usuário não encontrado" });
	});

	it("rejects update when user is not authenticated", async () => {
		mockedUserId = undefined;

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "new" }),
			}),
		);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: "Autenticação necessária" });
	});

	it("rejects update when ids mismatch", async () => {
		mockedUserId = "user-2";

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "new" }),
			}),
		);

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body).toEqual({ error: "Permissão negada" });
	});

	it("updates current user", async () => {
		const now = new Date("2024-01-09T00:00:00.000Z");
		dbMock.state.updateResult = [
			{
				id: "user-1",
				username: "new",
				email: "john@example.com",
				password: "secret",
				salt: "salt",
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "new" }),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			id: "user-1",
			username: "new",
		});
		expect(body.password).toBeUndefined();
		expect(body.salt).toBeUndefined();
	});

	it("rejects delete when ids mismatch", async () => {
		mockedUserId = "user-2";

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", { method: "DELETE" }),
		);

		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body).toEqual({ error: "Permissão negada" });
	});

	it("deletes current user", async () => {
		dbMock.state.deleteResult = { count: 1 };

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/users/user-1", { method: "DELETE" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ message: "Usuário e todos associados deletados" });
	});
});
