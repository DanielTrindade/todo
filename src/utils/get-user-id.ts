export interface AuthContext {
    jwt: { verify(token: string): Promise<unknown> };
    cookie: { jwt: { value?: string } };
    set: { status?: number };
}

export const getUserId = async (
    { jwt, cookie, set }: AuthContext,
): Promise<string | undefined> => {
    const token = cookie.jwt.value;

    if (!token) {
        set.status = 401;
        return undefined;
    }

    try {
        const payload = (await jwt.verify(token)) as {
            userId: string;
            exp?: number;
        };

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            set.status = 401;
            return undefined;
        }

        return payload.userId;
    } catch {
        set.status = 401;
        return undefined;
    }
};
