import { describe, it, expect } from "bun:test";
import { SignJWT, jwtVerify } from "jose";
import { getUserId } from "../src/utils/get-user-id";

const secret = new TextEncoder().encode("secret");

const jwt = {
    verify: async (token: string) => {
        const { payload } = await jwtVerify(token, secret);
        return payload;
    },
};

describe("getUserId", () => {
    it("retorna undefined e status 401 para token expirado", async () => {
        const token = await new SignJWT({ userId: "1" })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
            .sign(secret);

        const set: { status?: number } = {};
        const cookie = { jwt: { value: token } };

        const userId = await getUserId({ jwt, cookie, set });

        expect(userId).toBeUndefined();
        expect(set.status).toBe(401);
    });

    it("retorna undefined e status 401 para token ausente", async () => {
        const set: { status?: number } = {};
        const cookie = { jwt: { value: undefined } };

        const userId = await getUserId({ jwt, cookie, set });

        expect(userId).toBeUndefined();
        expect(set.status).toBe(401);
    });

    it("retorna undefined e status 401 para token inválido", async () => {
        const set: { status?: number } = {};
        const cookie = { jwt: { value: "invalid.token" } };

        const userId = await getUserId({ jwt, cookie, set });

        expect(userId).toBeUndefined();
        expect(set.status).toBe(401);
    });
});
