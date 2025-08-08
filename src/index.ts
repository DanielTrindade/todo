import app from "./app";
import { env } from "./config/env";
import { client } from "./db";

const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server rodando em http://localhost:${env.PORT}`);
});

process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    server.stop();
    await client.end();
    process.exit(0);
});

export default app;
