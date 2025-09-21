import { jwt as jwtPlugin } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { env } from "./config/env";
import { errorHandler } from "./plugins/error-handler";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { todoRoutes } from "./routes/todos";
import { userRoutes } from "./routes/users";
import { getUserId } from "./utils/get-user-id";

export const app = new Elysia({
	cookie: { secrets: [env.COOKIE_SECRET] },
})
	.use(errorHandler)
	.use(
		jwtPlugin({
			secret: env.JWT_SECRET,
			name: "jwt",
		}),
	)
	.use(
		swagger({
			documentation: {
				info: {
					title: "Todo App documentation",
					version: "1.0.0",
				},
				tags: [
					{ name: "Auth", description: "Authentication endpoints" },
                    { name: "Health", description: "Health check endpoint" },
                    { name: "Todos", description: "Todos endpoints" },
                    { name: "Users", description: "Users endpoints" }
				],
			},
			path: "/v1/swagger",
            scalarConfig: {
                spec: {
                    url: "/v1/swagger/json",
                },
            },
		}),
	)
	.decorate("userId", getUserId)
	.onRequest(({ set }) => {
		set.headers["Access-Control-Allow-Origin"] = "*";
		set.headers["Access-Control-Allow-Methods"] =
			"GET, POST, PUT, DELETE, OPTIONS";
		set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
	})
	.use(healthRoutes)
	.use(authRoutes)
	.use(todoRoutes)
	.use(userRoutes);

export default app;
