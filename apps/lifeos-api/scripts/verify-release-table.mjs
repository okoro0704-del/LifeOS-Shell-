import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const rows = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='ReleaseArtifact'`,
  );
  console.log("ReleaseArtifact:", rows.length ? "present" : "MISSING");
} finally {
  await p.$disconnect();
}
