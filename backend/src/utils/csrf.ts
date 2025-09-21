import { randomBytes, timingSafeEqual } from "node:crypto";

import type { AuthContext } from "./get-user-id";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";

export const createCsrfToken = () => randomBytes(32).toString("hex");

const safeEqual = (a: string, b: string) => {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
        return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
};

export const validateCsrfToken = (ctx: AuthContext) => {
    const headerToken = ctx.request
        ?.headers.get(CSRF_HEADER_NAME)
        ?.trim();
    const cookieToken = ctx.cookie[CSRF_COOKIE_NAME]?.value;

    if (!headerToken || !cookieToken) {
        ctx.set.status = 403;
        return false;
    }

    if (!safeEqual(headerToken, cookieToken)) {
        ctx.set.status = 403;
        return false;
    }

    return true;
};

