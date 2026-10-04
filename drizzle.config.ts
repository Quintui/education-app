import path from "node:path";
import { defineConfig } from "drizzle-kit";

const dataDir = path.resolve(process.env.DATA_DIR ?? ".data");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/mastra/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: `file:${path.join(dataDir, "lumen.db")}` },
});
