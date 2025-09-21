import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

//enum de prioridade
export const priority = pgEnum("priority", ["low", "medium", "high"]);

export const todosTable = pgTable(
	"todos",
	{
		id: varchar("id")
			.$defaultFn(() => createId())
			.primaryKey(),
		userId: varchar("user_id")
			.references(() => usersTable.id, { onDelete: "cascade" }) // CASCADE para deletar todos quando usuário é deletado
			.notNull(), // userId deve ser obrigatório
		description: varchar("description", { length: 255 }).notNull(), // Descrição obrigatória
		priority: priority("priority").notNull().default("low"),
		done: boolean("done").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(), // Adicionado para auditoria
		updatedAt: timestamp("updated_at").defaultNow().notNull(), // Adicionado para auditoria
	},
	(table) => [
		// Índices para melhor performance nas consultas
		index("todos_user_id_idx").on(table.userId),
		index("todos_priority_idx").on(table.priority),
		index("todos_done_idx").on(table.done),
		index("todos_user_done_idx").on(table.userId, table.done),
		index("todos_user_priority_idx").on(table.userId, table.priority),
	],
);

/**
 * Relacionamentos entre as tabelas
 */
export const todosTableRelations = relations(todosTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [todosTable.userId],
		references: [usersTable.id],
	}),
}));
