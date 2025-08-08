import {
	boolean,
	foreignKey,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";

export const priority = pgEnum("priority", ["low", "medium", "high"]);

export const users = pgTable(
	"users",
	{
		id: varchar().primaryKey().notNull(),
		username: varchar({ length: 255 }).notNull(),
		email: varchar({ length: 255 }).notNull(),
		password: text().notNull(),
		salt: varchar({ length: 64 }).default("").notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("users_email_idx").using(
			"btree",
			table.email.asc().nullsLast().op("text_ops"),
		),
		index("users_username_idx").using(
			"btree",
			table.username.asc().nullsLast().op("text_ops"),
		),
		unique("users_email_unique").on(table.email),
	],
);

export const todos = pgTable(
	"todos",
	{
		id: varchar().primaryKey().notNull(),
		userId: varchar("user_id").notNull(),
		description: varchar({ length: 255 }).notNull(),
		priority: priority().default("low").notNull(),
		done: boolean().default(false).notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("todos_done_idx").using(
			"btree",
			table.done.asc().nullsLast().op("bool_ops"),
		),
		index("todos_priority_idx").using(
			"btree",
			table.priority.asc().nullsLast().op("enum_ops"),
		),
		index("todos_user_done_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("bool_ops"),
			table.done.asc().nullsLast().op("text_ops"),
		),
		index("todos_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
		),
		index("todos_user_priority_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
			table.priority.asc().nullsLast().op("enum_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "todos_user_id_users_id_fk",
		}).onDelete("cascade"),
	],
);
