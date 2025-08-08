import { jwt as jwtPlugin } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Elysia, t } from "elysia";
import postgres from "postgres";
import { todosTable } from "./db/schema/todos";
import { usersTable } from "./db/schema/users";
import { PriorityEnum } from "./types/priority";
import { getUserId } from "./utils/get-user-id";

// Validar variáveis de ambiente
if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL é obrigatório");
}
if (!process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET é obrigatório");
}
if (!process.env.COOKIE_SECRET) {
	throw new Error("COOKIE_SECRET é obrigatório");
}

// Inicializar cliente Postgres e Drizzle
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Tratador global de erros
const errorHandler = (app: Elysia) =>
	app.onError(({ code, error, set }) => {
		console.error(`Error [${code}]:`, error);
		switch (code) {
			case "VALIDATION":
				set.status = 400;
				return {
					error: "Falha na validação",
					details: (error as Error).message,
				};
			case "NOT_FOUND":
				set.status = 404;
				return { error: "Rota não encontrada" };
			default:
				set.status = 500;
				return { error: "Erro interno do servidor" };
		}
	});

// Schemas
const userSchema = t.Object({
	username: t.String({ minLength: 3, maxLength: 50 }),
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 6 }),
});

const loginSchema = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 1 }),
});

const todoCreateSchema = t.Object({
	description: t.String({ minLength: 1, maxLength: 255 }),
	priority: t.Optional(t.Enum(PriorityEnum)),
});

const todoUpdateSchema = t.Object({
	description: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	priority: t.Optional(t.Enum(PriorityEnum)),
	done: t.Optional(t.Boolean()),
});

const userUpdateSchema = t.Object({
	username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
	email: t.Optional(t.String({ format: "email" })),
});

// Construir app
const app = new Elysia({
	cookie: { secrets: [process.env.COOKIE_SECRET] },
})
	.use(errorHandler)
	.use(
		jwtPlugin({
			secret: process.env.JWT_SECRET,
			name: "jwt",
		}),
	)
	.use(
		swagger({
			documentation: {
				info: {
					title: 'Todo App documentation',
					version: '1.0.0'
				}
			},
			path: "/v1/swagger",
		}),
	)
	// Decorator para extrair userId do JWT
	.decorate("userId", getUserId)
	// CORS
	.onRequest(({ set }) => {
		set.headers["Access-Control-Allow-Origin"] = "*";
		set.headers["Access-Control-Allow-Methods"] =
			"GET, POST, PUT, DELETE, OPTIONS";
		set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
	});

// Rota pública de saúde
app.get("/health", () => ({
	status: "ok",
	timestamp: new Date().toISOString(),
}));

// Registro
app.post(
	"/register",
	async ({ body: { username, email, password }, jwt, cookie, set }) => {
		try {
			// Checar usuário existente
			const [exists] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.email, email));

			if (exists) {
				set.status = 409;
				return { error: "Email já registrado" };
			}

			// Hash da senha
			const salt = await bcrypt.genSalt(10);
			const hash = await bcrypt.hash(password, salt);

			// Criar usuário
			const [newUser] = await db
				.insert(usersTable)
				.values({ username, email, password: hash, salt })
				.returning();

			// Assinar token
			const token = await jwt.sign({ userId: newUser.id });
			cookie.jwt.set({ value: token, httpOnly: true, maxAge: 60 * 60 * 24 });

			const { password: _, salt: __, ...publicUser } = newUser;
			return publicUser;
		} catch (error) {
			console.error("Erro no registro:", error);
			set.status = 500;
			return { error: "Erro interno do servidor" };
		}
	},
	{ body: userSchema },
);

// Login
app.post(
	"/login",
	async ({ body: { email, password }, jwt, cookie, set }) => {
		try {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.email, email));

			if (!user) {
				set.status = 400;
				return { error: "Credenciais inválidas" };
			}

			const match = await bcrypt.compare(password, user.password);
			if (!match) {
				set.status = 400;
				return { error: "Credenciais inválidas" };
			}

			const token = await jwt.sign({ userId: user.id });
			cookie.jwt.set({ value: token, httpOnly: true, maxAge: 60 * 60 * 24 });

			const { password: _, salt: __, ...publicUser } = user;
			return publicUser;
		} catch (error) {
			console.error("Erro no login:", error);
			set.status = 500;
			return { error: "Erro interno do servidor" };
		}
	},
	{ body: loginSchema },
);

// Logout
app.post("/logout", ({ cookie }) => {
	cookie.jwt.remove();
	return { message: "Logout realizado com sucesso" };
});

// Rotas protegidas de TODOs
app.group("/todos", (group) =>
	group
		.get("/", async ({ jwt, cookie, set }) => {
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
			async ({ body: { description, priority }, jwt, cookie, set }) => {
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

		.get("/:id", async ({ params: { id }, jwt, cookie, set }) => {
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
			async ({ params: { id }, body, jwt, cookie, set }) => {
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

		.delete("/:id", async ({ params: { id }, jwt, cookie, set }) => {
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
		}),
);

// Rotas protegidas de usuários
app.group("/users", (group) =>
	group
		.get("/", async ({ set }) => {
			try {
				const users = await db.select().from(usersTable);
				return users.map(({ password, salt, ...u }) => u);
			} catch (error) {
				console.error("Erro ao buscar usuários:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		})

		.get("/:id", async ({ params: { id }, set }) => {
			try {
				const [user] = await db
					.select()
					.from(usersTable)
					.where(eq(usersTable.id, id));

				if (!user) {
					set.status = 404;
					return { error: "Usuário não encontrado" };
				}

				const { password: _password, salt: _salt, ...publicUser } = user;
				return publicUser;
			} catch (error) {
				console.error("Erro ao buscar usuário:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		})

		.put(
			"/:id",
			async ({
				params: { id },
				body: { username, email },
				jwt,
				cookie,
				set,
			}) => {
				const userId = await getUserId({ jwt, cookie, set });
				if (!userId) {
					return { error: "Autenticação necessária" };
				}
				if (id !== userId) {
					set.status = 403;
					return { error: "Permissão negada" };
				}

				try {
					const [updated] = await db
						.update(usersTable)
						.set({
							...(username ? { username } : {}),
							...(email ? { email } : {}),
							updatedAt: new Date(),
						})
						.where(eq(usersTable.id, id))
						.returning();

					const { password:_password, salt:_salt, ...publicUser } = updated;
					return publicUser;
				} catch (error) {
					console.error("Erro ao atualizar usuário:", error);
					set.status = 500;
					return { error: "Erro interno do servidor" };
				}
			},
			{ body: userUpdateSchema },
		)

		.delete("/:id", async ({ params: { id }, jwt, cookie, set }) => {
			const userId = await getUserId({ jwt, cookie, set });
			if (!userId) {
				return { error: "Autenticação necessária" };
			}
			if (id !== userId) {
				set.status = 403;
				return { error: "Permissão negada" };
			}

			try {
				await db.delete(usersTable).where(eq(usersTable.id, id));
				return { message: "Usuário e todos associados deletados" };
			} catch (error) {
				console.error("Erro ao deletar usuário:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		}),
);

// Shutdown gracioso
process.on("SIGTERM", async () => {
	console.log("Shutting down...");
	await client.end();
	process.exit(0);
});

// Iniciar servidor
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(port, () =>
	console.log(`🚀 Server rodando em http://localhost:${port}`),
);

export default app;
