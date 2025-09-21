# Codebase Overview

## Overview
- Purpose: REST API for a Todo app with user accounts, authentication via JWT cookie, and CRUD on todos.
- Framework: `elysia` (Bun web framework) with Swagger docs, JWT plugin, and Drizzle ORM over PostgreSQL.
- Auth model: Cookie-based JWT (httpOnly) set on register/login; validated per-request for protected routes.

## Tech Stack
- Runtime: `bun`
- Web: `elysia`, `@elysiajs/jwt`, `@elysiajs/swagger`
- DB: `postgres` client + `drizzle-orm` with `drizzle-kit` for migrations
- Security: `bcryptjs` for password hashing
- Validation: Elysia `t` schemas (TypeBox-like)
- Dev tooling: `biome` for formatting/linting, `tsconfig` with `bun-types`

## Project Structure
- `src/index.ts`: Starts the server, reads `env.PORT`, handles graceful shutdown (`SIGTERM` stops Elysia and `client.end()`).
- `src/app.ts`: Builds the Elysia app:
  - Registers error handler plugin, JWT plugin (`name: "jwt"`), Swagger docs at `/v1/swagger` and JSON spec at `/v1/swagger/json`.
  - Sets permissive CORS headers (all origins/methods/headers).
  - Decorates `userId` with `getUserId` (note: routes directly import the util instead of using the decoration).
  - Mounts route modules: `health`, `auth`, `todos`, `users`.
- `src/config/env.ts`: Validates required env vars (`DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, optional `PORT`) and exports `env`.
- `src/db/index.ts`: Creates a `postgres` client and Drizzle `db` instance using `env.DATABASE_URL`.
- `src/db/schema/`:
  - `users.ts`: `users` table with `id`, `username`, `email` (unique), `password`, `salt`, timestamps; indices on email and username; Drizzle relations to todos; exported types `User`, `NewUser`, `PublicUser`.
  - `todos.ts`: `todos` table with `id`, `userId` (FK cascade), `description`, `priority` (enum: `low|medium|high`), `done`, timestamps; several helpful indices; relation back to `users`.
- `src/routes/`:
  - `health.ts`: `GET /health` (public).
  - `auth.ts`: `POST /register`, `POST /login`, `POST /logout` with cookie-based JWT.
  - `todos.ts`: CRUD under `/todos` (all require auth).
  - `users.ts`: `GET /users` and `GET /users/:id` (public), `PUT /users/:id`, `DELETE /users/:id` (require ownership).
- `src/schemas/`: Elysia `t` schemas for request bodies (`todoCreate`, `todoUpdate`, `user`, `login`, `userUpdate`).
- `src/types/priority.ts`: TS enum-like for `PriorityEnum` and type `Priority` used in API validation.
- `src/utils/get-user-id.ts`: Helper to extract and verify `jwt` from cookies, set `401` on failure, and return `userId`.
- `drizzle/`: SQL migrations (`0000_*.sql`, `0001_*.sql`), generated `schema.ts`, `relations.ts`, and meta journal.
- `docker-compose.yml`: PostgreSQL 15 service with default creds/db and healthcheck.
- `README.md`: Setup, env vars, run commands, and route summary.

## Runtime Flow
- `bun run dev` executes `src/index.ts`.
- `src/app.ts` configures:
  - Cookies with `cookie: { secrets: [env.COOKIE_SECRET] }`.
  - JWT plugin with `secret: env.JWT_SECRET` and cookie name `jwt`.
  - Swagger UI at `/v1/swagger` configured with Scalar; JSON served at `/v1/swagger/json`.
  - Global CORS headers on every request.
  - Routes registered and live on `env.PORT` (default 3000).
- Shutdown closes HTTP server and DB client cleanly.

## Authentication
- `register`:
  - Validates request (`userSchema`).
  - Rejects duplicate emails.
  - Hashes password with `bcryptjs` (salt rounds 10), stores `salt` and `hash`.
  - Signs JWT `{ userId }`, sets `cookie.jwt` httpOnly, 24h maxAge; returns user fields excluding `password` and `salt`.
- `login`:
  - Validates request (`loginSchema`).
  - Loads user by email, verifies password with `bcrypt.compare`.
  - Issues and sets JWT cookie like register; returns public user fields.
- `logout`:
  - Removes `cookie.jwt` and returns message.
- `getUserId` util:
  - Reads `cookie.jwt.value`, verifies via `ctx.jwt.verify`, checks expiration (`exp`), returns `userId` or sets `401` and returns `undefined`.
  - Routes call this explicitly to gate protected operations.

## Routes
- `GET /health`: Returns `status: "ok"` and ISO timestamp.
- `POST /register`: Create user, set JWT cookie, respond with public user.
- `POST /login`: Authenticate, set JWT cookie, respond with public user.
- `POST /logout`: Clear JWT cookie.
- `/todos` (auth required via `getUserId`):
  - `GET /`: List all todos for the current user.
  - `POST /`: Create todo with `description` and optional `priority` (default `low`).
  - `GET /:id`: Fetch a todo by id owned by current user.
  - `PUT /:id`: Partial update (`description`, `priority`, `done`), updates `updatedAt`.
  - `DELETE /:id`: Delete owned todo.
- `/users`:
  - `GET /`: List all users (public) with sensitive fields removed.
  - `GET /:id`: Get a user by id (public) without `password` and `salt`.
  - `PUT /:id`: Update own `username`/`email` only (403 if not owner).
  - `DELETE /:id`: Delete own account (and cascaded todos due to FK).

## Validation & Errors
- Validation: Elysia schemas on relevant endpoints (`body: schema`).
- Error handling: Central `onError` plugin:
  - `VALIDATION` → 400 with message.
  - `NOT_FOUND` → 404.
  - Default → 500.
- Responses: Simple JSON objects with either resource data or `{ error: "..." }`.

## Database
- Connection: `postgres` client via `DATABASE_URL`; Drizzle ORM wraps client.
- Migrations: Drizzle SQL and `schema.ts` files in `drizzle/`; config in `drizzle.config.ts`.
- Indices: Useful indices for `todos` (userId, priority, done combos) and `users` (email, username).
- Relations: Declared in Drizzle to enable type-safe joins.

## Docs & Tooling
- Swagger: Available at `/v1/swagger` with tags for Auth, Health, Todos, Users.
- Lint/format: `biome.json` enables formatter with tabs and linter with recommended rules.
- TypeScript: Strict mode, ES2022 modules, Bun types enabled.

## Testing
- `tests/getUserId.test.ts` (Bun test):
  - Uses `jose` to create tokens and assert `getUserId` behavior for expired, missing, invalid tokens.
  - Note: `jose` is not listed in `devDependencies`; tests may require adding it or running in an environment where it’s available.
- `package.json` test script is a placeholder and exits 1; tests are not wired.

## Running Locally
- `bun install`
- `docker compose up -d db`
- `.env` with `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, optional `PORT`
- `bun run dev` → API on `http://localhost:3000` (default)

## Notable Details / Opportunities
- Decorator unused: `app.decorate("userId", getUserId)` is defined but routes import `getUserId` directly; could standardize on `ctx.userId(...)` or remove the decoration.
- Public user listing: `GET /users` exposes all users’ public fields; depending on requirements, consider restricting or adding pagination.
- CORS: Wide open (`*`). If deploying, tighten origins and headers.
- Env loading: `dotenv` is listed but not imported in runtime; Bun typically auto-loads `.env`. If running outside Bun, ensure envs are set.
- Tests wiring: Add a proper test script and ensure `jose` is available if you want CI coverage.

