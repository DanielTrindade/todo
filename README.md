# Todo APP - Elysia with Bun runtime

## Getting Started
1. **Install dependencies**
   ```bash
   bun install
   ```
2. **Start the database** (using Docker)
   ```bash
   docker compose up -d db
   ```
3. **Configure environment variables**
   Create a `.env` file with:
   ```bash
   DATABASE_URL=postgres://todo_user:todo_password@localhost:5432/todo_db
   JWT_SECRET=your_jwt_secret
   COOKIE_SECRET=your_cookie_secret
   SESSION_TTL_SECONDS=86400 # optional, padr�o: 24 horas
   PORT=3000 # optional
   ```
4. **Sync the database schema**
   ```bash
   bun run db:push
   bun run db:pull
   ```
   Isso aplica o schema definido em `src/db/schema` ao Postgres e atualiza os artefatos gerados em `drizzle/`.
5. **Run the server**
   ```bash
   bun run dev
   ```
   A API ficar� dispon�vel em http://localhost:3000.

## Database workflow
- `bun run db:push` - aplica o schema definido no c�digo diretamente no banco usando Drizzle.
- `bun run db:pull` - lê o estado atual do banco e atualiza os artefatos gerados (ex.: `drizzle/schema.ts`).
- `bun run db:sync` - executa `push` seguido de `pull` para manter c�digo e banco alinhados.

## Routes
- `GET /health` - health check endpoint.
- `POST /register` - create a new user.
- `POST /login` - authenticate and receive a JWT cookie válido por 24 horas (ajust�vel via `SESSION_TTL_SECONDS`).
- `POST /logout` - clear the authentication cookie.
- `/todos` - CRUD operations for todos (`GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`).
- `/users` - user management (`GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`).

## Running
### Development
```bash
bun run dev
```

### Production
```bash
bun src/index.ts
```

