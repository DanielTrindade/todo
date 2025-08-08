import { t } from "elysia";

export const userSchema = t.Object({
    username: t.String({ minLength: 3, maxLength: 50 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 6 }),
});

export const loginSchema = t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 1 }),
});

export const userUpdateSchema = t.Object({
    username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
    email: t.Optional(t.String({ format: "email" })),
});
