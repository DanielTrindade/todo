export const ensureTestEnv = () => {
    process.env.DATABASE_URL ??= "postgres://localhost:5432/test";
    process.env.JWT_SECRET ??= "test-jwt-secret";
    process.env.COOKIE_SECRET ??= "test-cookie-secret";
};

export const resetEnv = () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/test";
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.COOKIE_SECRET = "test-cookie-secret";
};
