import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const provider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase()
const allowed = new Set(["sqlite", "postgresql"])
if (!allowed.has(provider)) {
  console.error(`Unsupported DATABASE_PROVIDER "${provider}". Use sqlite or postgresql.`)
  process.exit(1)
}

const sourcePath = path.join(process.cwd(), "prisma", "schema.prisma")
const source = await readFile(sourcePath, "utf8")
const generated = source.replace(
  /provider\s*=\s*"sqlite"/,
  `provider = "${provider}"`
)

if (provider === "sqlite") {
  console.log("Using prisma/schema.prisma (sqlite).")
  process.exit(0)
}

const outDir = path.join(process.cwd(), "prisma", ".generated")
const outPath = path.join(outDir, "schema.postgres.prisma")
await mkdir(outDir, { recursive: true })
await writeFile(outPath, generated, "utf8")
console.log(`Generated ${path.relative(process.cwd(), outPath)} for PostgreSQL.`)
console.log("Set DATABASE_URL to your PostgreSQL connection string, then run:")
console.log("  npm run db:postgres:push")
console.log("  npm run db:postgres:generate")
console.log("  node prisma/seed.js")
