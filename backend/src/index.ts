import { app } from "./app";
import { env } from "./config/env";
import { client } from "./db";

// Log só informativo; o Bun vai iniciar/recaregar o server:
console.log(`🚀 Server alvo: http://localhost:${env.PORT}`);
console.log(`📖 Swagger em: http://localhost:${env.PORT}/v1/swagger`);

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await client.end();
  process.exit(0);
});

// Export default no formato que o Bun entende para servir e fazer HMR:
export default {
  port: Number(env.PORT ?? 3000),
  fetch: app.fetch,
};