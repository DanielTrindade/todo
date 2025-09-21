import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../src/utils/csrf";

export const TEST_CSRF_TOKEN = "test-csrf-token";

export const withCsrf = (init: RequestInit = {}) => {
        const headers = new Headers(init.headers ?? {});
        headers.set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);
        const existingCookie = headers.get("cookie");
        const csrfCookie = `${CSRF_COOKIE_NAME}=${TEST_CSRF_TOKEN}`;
        headers.set(
                "cookie",
                existingCookie ? `${existingCookie}; ${csrfCookie}` : csrfCookie,
        );

        return {
                ...init,
                headers,
        };
};
