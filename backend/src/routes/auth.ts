import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { env } from "../config/env";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { loginSchema, userSchema } from "../schemas/user";
import { CSRF_COOKIE_NAME, createCsrfToken } from "../utils/csrf";
import type { AuthContext } from "../utils/get-user-id";

const isSecure = process.env.NODE_ENV !== "development";

const sharedCookieOptions = {
        maxAge: env.SESSION_TTL_SECONDS,
        path: "/" as const,
        sameSite: "lax" as const,
        secure: isSecure,
};

const sessionCookieOptions = {
        ...sharedCookieOptions,
        httpOnly: true,
};

const csrfCookieOptions = {
        ...sharedCookieOptions,
        httpOnly: false,
};

export const authRoutes = new Elysia()
	// Registro
	.post(
		"/register",
		async (
			ctx: AuthContext & {
				body: { username: string; email: string; password: string };
			},
		) => {
			const {
				body: { username, email, password },
				jwt,
				cookie,
				set,
			} = ctx;
			try {
				const [exists] = await db
					.select()
					.from(usersTable)
					.where(eq(usersTable.email, email));

				if (exists) {
					set.status = 409;
					return { error: "Email já registrado" };
				}

				const salt = await bcrypt.genSalt(10);
				const hash = await bcrypt.hash(password, salt);

				const [newUser] = await db
					.insert(usersTable)
					.values({ username, email, password: hash, salt })
					.returning();

                                const exp =
                                        Math.floor(Date.now() / 1000) + env.SESSION_TTL_SECONDS;
                                const token = await jwt.sign({ userId: newUser.id, exp });
                                const csrfToken = createCsrfToken();
                                cookie.jwt?.set?.({
                                        value: token,
                                        ...sessionCookieOptions,
                                });
                                cookie[CSRF_COOKIE_NAME]?.set?.({
                                        value: csrfToken,
                                        ...csrfCookieOptions,
                                });

				const { password: _, salt: __, ...publicUser } = newUser;
				return publicUser;
			} catch (error) {
				console.error("Erro no registro:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		},
		{
			body: userSchema,
			detail: {
				tags: ['Auth']
			},
		},
	)
	// Login
	.post(
		"/login",
		async (
			ctx: AuthContext & {
				body: { email: string; password: string };
			},
		) => {
			const {
				body: { email, password },
				jwt,
				cookie,
				set,
			} = ctx;
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

                                const exp =
                                        Math.floor(Date.now() / 1000) + env.SESSION_TTL_SECONDS;
                                const token = await jwt.sign({ userId: user.id, exp });
                                const csrfToken = createCsrfToken();
                                cookie.jwt?.set?.({
                                        value: token,
                                        ...sessionCookieOptions,
                                });
                                cookie[CSRF_COOKIE_NAME]?.set?.({
                                        value: csrfToken,
                                        ...csrfCookieOptions,
                                });

				const { password: _, salt: __, ...publicUser } = user;
				return publicUser;
			} catch (error) {
				console.error("Erro no login:", error);
				set.status = 500;
				return { error: "Erro interno do servidor" };
			}
		},
		{
			body: loginSchema,
			detail: {
				tags: ["Auth"]
			},
		},
	)
	// Logout
	.post(
		"/logout",
                (ctx: AuthContext) => {
                        ctx.cookie.jwt?.remove?.(sessionCookieOptions);
                        ctx.cookie[CSRF_COOKIE_NAME]?.remove?.(csrfCookieOptions);
			return { message: "Logout realizado com sucesso" };
		},
		{
			detail: {
				tags: ["Auth"]
			},
		},
	);
