-- Zero-PII cutover: drop gateway contact/name columns; add ZK claim metadata.
-- Apply via: npx prisma db push   OR   psql $DATABASE_URL -f this file

ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastName";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trustTier" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "identityStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "zkVerifiedAt" TIMESTAMP(3);
