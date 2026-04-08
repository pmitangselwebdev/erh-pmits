import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PRISMA_DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum terkonfigurasi");
}

// Parse schema from ?schema= query param (Prisma CLI convention)
// then strip it from the URL before passing to pg (pg doesn't understand it)
const _url = new URL(connectionString);
const pgSchema = _url.searchParams.get("schema") || "public";
_url.searchParams.delete("schema");
const pgConnectionString = _url.toString();

const adapter = new PrismaPg({ connectionString: pgConnectionString }, { schema: pgSchema });

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
