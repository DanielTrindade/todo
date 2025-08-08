import { Elysia } from "elysia";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { userSchema, loginSchema } from "../schemas/user";

export const authRoutes = new Elysia()
    // Registro
    .post(
        "/register",
        async ({ body: { username, email, password }, jwt, cookie, set }) => {
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
    )
    // Login
    .post(
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
    )
    // Logout
    .post("/logout", ({ cookie }) => {
        cookie.jwt.remove();
        return { message: "Logout realizado com sucesso" };
    });
