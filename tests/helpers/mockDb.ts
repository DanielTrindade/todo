export interface DbMockState {
    selectResult: unknown[];
    selectWhereResult: unknown[] | null;
    insertResult: unknown[];
    updateResult: unknown[];
    deleteResult: { count: number };
}

export interface DbMock {
    state: DbMockState;
    select: () => {
        from: (_table: unknown) => Promise<unknown[]> & {
            where: (_where: unknown) => Promise<unknown[]>;
        };
    };
    insert: (_table: unknown) => {
        values: (_values: unknown) => {
            returning: () => Promise<unknown[]>;
        };
    };
    update: (_table: unknown) => {
        set: (_values: unknown) => {
            where: (_where: unknown) => {
                returning: () => Promise<unknown[]>;
            };
        };
    };
    delete: (_table: unknown) => {
        where: (_where: unknown) => Promise<{ count: number }>;
    };
}

export const createDbMock = (): DbMock => {
    const state: DbMockState = {
        selectResult: [],
        selectWhereResult: null,
        insertResult: [],
        updateResult: [],
        deleteResult: { count: 0 },
    };

    return {
        state,
        select: () => ({
            from: () => {
                const promise = Promise.resolve(state.selectResult);
                return Object.assign(promise, {
                    where: () =>
                        Promise.resolve(
                            state.selectWhereResult ?? state.selectResult,
                        ),
                });
            },
        }),
        insert: () => ({
            values: () => ({
                returning: () => Promise.resolve(state.insertResult),
            }),
        }),
        update: () => ({
            set: () => ({
                where: () => ({
                    returning: () => Promise.resolve(state.updateResult),
                }),
            }),
        }),
        delete: () => ({
            where: () => Promise.resolve(state.deleteResult),
        }),
    };
};
