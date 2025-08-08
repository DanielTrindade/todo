import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Usando o esquema de pull push
 * npx drizzle-kit pull -> mudanças feita no schema pelo código ou seja drizzle
 * npx drizzle-kit push -> mudanças feita no schema pelo SGBD
 */

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://todo_user:todo_password@localhost:5432/todo_db",
  },
});