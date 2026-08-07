import { defineConfig, env } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DIRECT_URL (port 5432) for CLI operations like db push/migrate
    // The pgbouncer pooler (port 6543) doesn't support these operations
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
