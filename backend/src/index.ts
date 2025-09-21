import app from "./app";
import { env } from "./config/env";
import { client } from "./db";

const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server rodando em http://localhost:${env.PORT}`);
    console.log(`📖 documentação da API em http://localhost:${env.PORT}/v1/swagger`)
});

process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    server.stop();
    await client.end();
    process.exit(0);
});

export default app;
