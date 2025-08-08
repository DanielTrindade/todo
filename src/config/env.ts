if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL é obrigatório");
}
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET é obrigatório");
}
if (!process.env.COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET é obrigatório");
}

export const env = {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    COOKIE_SECRET: process.env.COOKIE_SECRET!,
    PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
};
