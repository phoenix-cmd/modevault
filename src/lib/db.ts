// MODELVAULT — Prisma 8 Database Client
// The client comes from the app's Composer service (service.mts), never from
// DATABASE_URL. Call getDb() inside a route handler or page — never at module
// scope (next build imports modules without the runtime environment).
import service from "../../service.mjs";
import type { PostgresClient } from "@prisma/orm-postgres/runtime";
import type { Contract } from "@/prisma/contract"

type Db = PostgresClient<Contract>

let cached: Db | undefined

export function getDb(): Db {
  cached ??= service.load().db.client
  return cached
}
