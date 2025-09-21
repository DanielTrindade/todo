export const ensureTestEnv = () => {
    process.env.DATABASE_URL ??= "postgres://localhost:5432/test";
    process.env.JWT_SECRET ??= "test-jwt-secret";
    process.env.COOKIE_SECRET ??= "test-cookie-secret";
    process.env.SESSION_TTL_SECONDS ??= "86400";
};

export const resetEnv = () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/test";
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.COOKIE_SECRET = "test-cookie-secret";
    process.env.SESSION_TTL_SECONDS = "86400";
};
