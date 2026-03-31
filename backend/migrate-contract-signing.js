const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function run() {
  // Add columns to contracts table
  const cols = [
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signerName" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signerEmail" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signerTitle" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signatureData" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signatureType" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signatureIp" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signatureAgent" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signerOtpId" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "counterSignedBy" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "counterSignedAt" TIMESTAMP(3)',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "counterSigData" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "counterSigIp" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "counterSigAgent" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "documentHash" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "signingToken" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3)',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3)',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3)',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "voidedReason" TEXT',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "remindersSent" INTEGER DEFAULT 0',
    'ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3)',
  ];

  for (const sql of cols) {
    await p.$executeRawUnsafe(sql);
  }
  console.log("22 columns added to contracts table");

  // Add unique index on signingToken
  await p.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS contracts_signingToken_key ON contracts("signingToken")');
  console.log("Unique index on signingToken created");

  // Update ContractStatus enum - add new values
  const newStatuses = ["VIEWED", "CLIENT_SIGNED", "AWAITING_COUNTERSIGN", "VOIDED", "EXPIRED"];
  for (const s of newStatuses) {
    try {
      await p.$executeRawUnsafe(`ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS '${s}'`);
      console.log("Added enum value: " + s);
    } catch(e) {
      console.log("Enum value " + s + " exists or error: " + e.message);
    }
  }

  // Create contract_otps table
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS contract_otps (
      id TEXT PRIMARY KEY,
      "contractId" TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT false,
      "verifiedAt" TIMESTAMP(3),
      "verifiedIp" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("contract_otps table created");

  await p.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS contract_otps_contractId_idx ON contract_otps("contractId")');
  await p.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS contract_otps_email_idx ON contract_otps(email)');
  console.log("Indexes created on contract_otps");

  // Regenerate Prisma client
  console.log("\nALL MIGRATIONS COMPLETE");
  await p.$disconnect();
}

run().catch(e => { console.error("MIGRATION FAILED:", e); process.exit(1); });
