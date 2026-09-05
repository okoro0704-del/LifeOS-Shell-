import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const rows = await p.$queryRawUnsafe(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY(ARRAY[
         'PersonalVaultItem','DeviceSession','CrossSpaceBridge','BusinessMember','Business'
       ])
     ORDER BY 1`,
  );
  console.log(
    "tables:",
    rows.map((r) => r.table_name).join(", "),
  );

  const fks = await p.$queryRawUnsafe(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name IN (
         'PersonalVaultItem','DeviceSession','CrossSpaceBridge','BusinessMember'
       )
     ORDER BY 1, 2`,
  );
  console.log("fks:", JSON.stringify(fks, null, 2));
} finally {
  await p.$disconnect();
}
