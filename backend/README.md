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
   SESSION_TTL_SECONDS=86400 # optional, padrão: 24 horas
   PORT=3000 # optional
   ```
4. **Run the server**
   ```bash
   bun run dev
   ```
   The API will be available at http://localhost:3000.

## Routes
- `GET /health` – health check endpoint.
- `POST /register` – create a new user.
- `POST /login` – authenticate and receive a JWT cookie válido por 24 horas (ajustável via `SESSION_TTL_SECONDS`).
- `POST /logout` – clear the authentication cookie.
- `/todos` – CRUD operations for todos (`GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`).
- `/users` – user management (`GET`, `GET /:id`, `PUT /:id`, `DELETE /:id`).

## Running
### Development
```bash
bun run dev
```

### Production
```bash
bun src/index.ts
```

