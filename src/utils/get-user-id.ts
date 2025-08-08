export interface AuthContext {
    jwt: {
        verify(token: string): Promise<unknown>;
        sign(payload: unknown): Promise<string>;
    };
    cookie: Record<
        string,
        {
            value?: string;
            set?: (opts: Record<string, unknown>) => void;
            remove?: () => void;
        }
    >;
    set: { status?: number | string };
}

export const getUserId = async (
    { jwt, cookie, set }: AuthContext,
): Promise<string | undefined> => {
    const token = cookie.jwt?.value;

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
