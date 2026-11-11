import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** The application's database. The e2e tests put PGlite in its place, with the same query API. */
export type Database = NodePgDatabase;

/** The constraint a PostgreSQL error is about, when it is a unique violation. */
export function uniqueViolation(error: unknown): string | null {
  const cause = (error as { cause?: unknown })?.cause ?? error;
  const { code, constraint } = (cause ?? {}) as {
    code?: string;
    constraint?: string;
  };
  return code === '23505' ? (constraint ?? '') : null;
}
