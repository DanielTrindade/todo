if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
}
if (!process.env.COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET is required");
}

const parseOrigins = (value?: string) =>
    value
        ?.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("SESSION_TTL_SECONDS must be a positive integer");
    }

    return parsed;
};

const corsOrigins = parseOrigins(process.env.CORS_ORIGINS) ?? [
    "http://localhost:5173",
];

const sessionTtlSeconds = parsePositiveInteger(
    process.env.SESSION_TTL_SECONDS,
    60 * 60 * 24,
);

export const env = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    CORS_ORIGINS: corsOrigins,
    SESSION_TTL_SECONDS: sessionTtlSeconds,
};

