import type { Config } from "drizzle-kit";

export default {
  schema: "./app/db/schema.server.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "local",
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || "local-divelog-db",
    token: process.env.CLOUDFLARE_D1_TOKEN || "local",
  },
} satisfies Config;
