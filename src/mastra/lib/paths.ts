import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The project root, found by walking up to the folder with the database migrations.
 * Next.js runs from the root, Mastra Studio from a bundled copy deeper inside it:
 * both must open the same database.
 */
function findProjectRoot(start: string) {
  for (let dir = start; ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, "drizzle", "meta", "_journal.json"))) return dir;
    if (path.dirname(dir) === dir) return start;
  }
}

export const PROJECT_ROOT = findProjectRoot(process.cwd());

/** Everything lives locally: one SQLite database plus media files next to it. */
export const DATA_DIR = path.resolve(PROJECT_ROOT, process.env.DATA_DIR ?? ".data");
export const DATABASE_URL = `file:${path.join(DATA_DIR, "lumen.db")}`;
export const MEDIA_DIR = path.join(DATA_DIR, "lessons");
export const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "drizzle");
