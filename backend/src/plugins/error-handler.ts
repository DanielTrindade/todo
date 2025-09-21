import type { Elysia } from "elysia";

export const errorHandler = (app: Elysia) =>
	app.onError(({ code, error, set }) => {
		console.error(`Error [${code}]:`, error);
		switch (code) {
			case "VALIDATION":
				set.status = 400;
				return {
					error: "Falha na validação",
					details: (error as Error).message,
				};
			case "NOT_FOUND":
				set.status = 404;
				return { error: "Rota não encontrada" };
			default:
				set.status = 500;
				return { error: "Erro interno do servidor" };
		}
	});
