import { drizzle } from "drizzle-orm/d1";

import * as relations from "./relations.server";
import * as schema from "./schema.server";

export function db(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema, ...relations } });
}

export type Database = ReturnType<typeof db>;
