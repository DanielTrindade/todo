import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { jwt as jwtPlugin } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { PriorityEnum } from "../../src/types/priority";
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

let todoRoutes: typeof import("../../src/routes/todos")["todoRoutes"];

beforeAll(async () => {
	resetEnv();
	todoRoutes = (await import("../../src/routes/todos")).todoRoutes;
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
        .use(todoRoutes);
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

describe("todoRoutes", () => {
	it("requires authentication to list todos", async () => {
		mockedUserId = undefined;
		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/", { method: "GET" }),
		);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body).toEqual({ error: "Autenticação necessária" });
	});

	it("returns todos for authenticated user", async () => {
		const now = new Date("2024-01-03T00:00:00.000Z");
		dbMock.state.selectWhereResult = [
			{
				id: "todo-1",
				userId: "user-1",
				description: "Finish tests",
				priority: PriorityEnum.HIGH,
				done: false,
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/", { method: "GET" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body).toHaveLength(1);
		expect(body[0]).toMatchObject({
			id: "todo-1",
			description: "Finish tests",
			priority: PriorityEnum.HIGH,
		});
	});

	it("creates a todo with default priority", async () => {
		const now = new Date("2024-01-04T00:00:00.000Z");
		dbMock.state.insertResult = [
			{
				id: "todo-2",
				userId: "user-1",
				description: "Write docs",
				priority: PriorityEnum.LOW,
				done: false,
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ description: "Write docs" }),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			id: "todo-2",
			description: "Write docs",
			priority: PriorityEnum.LOW,
		});
	});

	it("retrieves a todo by id", async () => {
		const now = new Date("2024-01-05T00:00:00.000Z");
		dbMock.state.selectWhereResult = [
			{
				id: "todo-3",
				userId: "user-1",
				description: "Refactor code",
				priority: PriorityEnum.MEDIUM,
				done: true,
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/todo-3", { method: "GET" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			id: "todo-3",
			description: "Refactor code",
			priority: PriorityEnum.MEDIUM,
		});
	});

	it("returns 404 when todo is not found", async () => {
		dbMock.state.selectWhereResult = [];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/missing", { method: "GET" }),
		);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({ error: "Todo não encontrado" });
	});

	it("updates a todo", async () => {
		const now = new Date("2024-01-06T00:00:00.000Z");
		dbMock.state.updateResult = [
			{
				id: "todo-4",
				userId: "user-1",
				description: "Refined description",
				priority: PriorityEnum.HIGH,
				done: true,
				createdAt: now,
				updatedAt: now,
			},
		];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/todo-4", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					description: "Refined description",
					done: true,
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toMatchObject({
			id: "todo-4",
			description: "Refined description",
			done: true,
		});
	});

	it("returns 404 when updating missing todo", async () => {
		dbMock.state.updateResult = [];

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/missing", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ description: "Does not exist" }),
			}),
		);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({ error: "Todo não encontrado" });
	});

	it("deletes a todo", async () => {
		dbMock.state.deleteResult = { count: 1 };

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/todo-5", { method: "DELETE" }),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ message: "Todo deletado com sucesso" });
	});

	it("returns 404 when deleting missing todo", async () => {
		dbMock.state.deleteResult = { count: 0 };

		const app = createApp();
		const response = await app.handle(
			new Request("http://localhost/todos/missing", { method: "DELETE" }),
		);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({ error: "Todo não encontrado" });
	});
});
