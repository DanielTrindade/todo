import { relations } from "drizzle-orm/relations";
import { users, todos } from "./schema";

export const todosRelations = relations(todos, ({one}) => ({
	user: one(users, {
		fields: [todos.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	todos: many(todos),
}));