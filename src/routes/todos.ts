import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../db";
import { todosTable } from "../db/schema/todos";
import { todoCreateSchema, todoUpdateSchema } from "../schemas/todo";
import { type Priority, PriorityEnum } from "../types/priority";
import type { AuthContext } from "../utils/get-user-id";
import { getUserId } from "../utils/get-user-id";

export const todoRoutes = new Elysia({ prefix: "/todos" })
	.get("/", async (ctx: AuthContext) => {
		const { jwt, cookie, set } = ctx;
		const userId = await getUserId({ jwt, cookie, set });
		if (!userId) {
			return { error: "Autenticação necessária" };
		}

		try {
			const todos = await db
				.select()
				.from(todosTable)
				.where(eq(todosTable.userId, userId));
			return todos;
		} catch (error) {
			console.error("Erro ao buscar todos:", error);
			set.status = 500;
			return { error: "Erro interno do servidor" };
		}
	})
	.post(
		"/",
		async (
			ctx: AuthContext & {
				body: { description: string; priority?: Priority };
			},
		) => {
			const {
				body: { description, priority },
				jwt,
				cookie,
				set,
			} = ctx;
			const userId = await getUserId({ jwt, cookie, set });
			if (!userId) {
				return { error: "Autenticação necessária" };
			}

			try {
				const [todo] = await db
					.insert(todosTable)
					.values({
						userId,
						description,
						priority: priority || PriorityEnum.LOW,
					})
					.returning();
				return todo;
			} catch (error) {
				console.error("Erro ao criar todo:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		},
		{ body: todoCreateSchema },
	)
	.get("/:id", async (ctx: AuthContext & { params: { id: string } }) => {
		const {
			params: { id },
			jwt,
			cookie,
			set,
		} = ctx;
		const userId = await getUserId({ jwt, cookie, set });
		if (!userId) {
			return { error: "Autenticação necessária" };
		}

		try {
			const [todo] = await db
				.select()
				.from(todosTable)
				.where(and(eq(todosTable.id, id), eq(todosTable.userId, userId)));

			if (!todo) {
				set.status = 404;
				return { error: "Todo não encontrado" };
			}
			return todo;
		} catch (error) {
			console.error("Erro ao buscar todo:", error);
			set.status = 500;
			return { error: "Erro interno do servidor" };
		}
	})
	.put(
		"/:id",
		async (
			ctx: AuthContext & {
				params: { id: string };
				body: {
					description?: string;
					priority?: Priority;
					done?: boolean;
				};
			},
		) => {
			const {
				params: { id },
				body,
				jwt,
				cookie,
				set,
			} = ctx;
			const userId = await getUserId({ jwt, cookie, set });
			if (!userId) {
				return { error: "Autenticação necessária" };
			}

			try {
				const [updated] = await db
					.update(todosTable)
					.set({
						...body,
						updatedAt: new Date(),
					})
					.where(and(eq(todosTable.id, id), eq(todosTable.userId, userId)))
					.returning();

				if (!updated) {
					set.status = 404;
					return { error: "Todo não encontrado" };
				}
				return updated;
			} catch (error) {
				console.error("Erro ao atualizar todo:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		},
		{ body: todoUpdateSchema },
	)
	.delete("/:id", async (ctx: AuthContext & { params: { id: string } }) => {
		const {
			params: { id },
			jwt,
			cookie,
			set,
		} = ctx;
		const userId = await getUserId({ jwt, cookie, set });
		if (!userId) {
			return { error: "Autenticação necessária" };
		}

		try {
			const result = await db
				.delete(todosTable)
				.where(and(eq(todosTable.id, id), eq(todosTable.userId, userId)));

			if (result.count === 0) {
				set.status = 404;
				return { error: "Todo não encontrado" };
			}
			return { message: "Todo deletado com sucesso" };
		} catch (error) {
			console.error("Erro ao deletar todo:", error);
			set.status = 500;
			return { error: "Erro interno do servidor" };
		}
	});
