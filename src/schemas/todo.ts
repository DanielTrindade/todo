import { t } from "elysia";
import { PriorityEnum } from "../types/priority";

export const todoCreateSchema = t.Object({
    description: t.String({ minLength: 1, maxLength: 255 }),
    priority: t.Optional(t.Enum(PriorityEnum)),
});

export const todoUpdateSchema = t.Object({
    description: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    priority: t.Optional(t.Enum(PriorityEnum)),
    done: t.Optional(t.Boolean()),
});
