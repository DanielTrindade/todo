import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { userUpdateSchema } from "../schemas/user";
import { getUserId } from "../utils/get-user-id";

export const userRoutes = new Elysia({ prefix: "/users" })
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
        async ({ params: { id }, body: { username, email }, jwt, cookie, set }) => {
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

                const { password: _password, salt: _salt, ...publicUser } = updated;
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
    });
