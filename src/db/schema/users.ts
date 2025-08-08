import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { todosTable } from "../schema/todos";
export const usersTable = pgTable(
	"users",
	{
		id: varchar("id")
			.$defaultFn(() => createId())
			.primaryKey(),
		username: varchar("username", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		password: text("password").notNull(),
		salt: varchar("salt", { length: 64 }).notNull().default(""),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("users_email_idx").on(table.email),
		index("users_username_idx").on(table.username),
	],
);

/**
 * Relacionamento da tabela de users com a tabela de todos
 * é uma relação de que cada usuário pode ter o ou mais todo
 */
export const usersTableRelations = relations(usersTable, ({ many }) => ({
    todos: many(todosTable),
}));

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

// Tipos para respostas da API (sem campos sensíveis)
export type PublicUser = Omit<User, "password" | "salt">;
