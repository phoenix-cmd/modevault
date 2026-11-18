// MODELVAULT — Prisma Client Singleton
import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import path from "node:path"

function resolveDatabaseUrl(): string {
  let raw = (process.env.DATABASE_URL || "").trim()

  // 1. Strip wrapping single or double quotes (common when copy-pasting .env into Vercel dashboard)
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim()
  }

  // 2. Handle Vercel serverless environment:
  // On Vercel, the function deployment root (/var/task) is read-only.
  // Copy the bundled seed dev.db to /tmp/dev.db so SQLite operations and mutations succeed.
  if (process.env.VERCEL) {
    const tmpDbPath = "/tmp/dev.db"
    const bundledDbPath = path.join(process.cwd(), "prisma", "dev.db")
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(bundledDbPath)) {
        fs.copyFileSync(bundledDbPath, tmpDbPath)
      }
    } catch (e) {
      console.warn("Failed to copy SQLite database to /tmp:", e)
    }

    if (fs.existsSync(tmpDbPath)) {
      return `file:${tmpDbPath}`
    }
  }

  // 3. If a valid file: URL was provided
  if (raw.startsWith("file:")) {
    const filePath = raw.slice(5)
    // If it's a relative path like file:./dev.db, resolve it absolutely so
    // it never depends on process working directory inside lambdas or subdirectories
    if (!path.isAbsolute(filePath)) {
      const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath
      const resolved = path.resolve(process.cwd(), "prisma", cleanPath).replace(/\\/g, "/")
      return `file:${resolved}`
    }
    return raw
  }

  // 4. If someone passed a relative path like ./dev.db or prisma/dev.db without file: prefix
  if (raw && !raw.includes("://") && (raw.endsWith(".db") || raw.endsWith(".sqlite"))) {
    const cleanPath = raw.startsWith("./") ? raw.slice(2) : raw
    const resolved = path.resolve(process.cwd(), "prisma", cleanPath).replace(/\\/g, "/")
    return `file:${resolved}`
  }

  // 5. Default fallback for SQLite: resolved absolute path to prisma/dev.db
  const defaultPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")
  return `file:${defaultPath}`
}

const dbUrl = resolveDatabaseUrl()
process.env.DATABASE_URL = dbUrl

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
