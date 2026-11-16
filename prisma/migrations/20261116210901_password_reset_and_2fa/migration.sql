-- AlterTable
ALTER TABLE "users" ADD COLUMN     "recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reset_token_expires" TIMESTAMP(3),
ADD COLUMN     "reset_token_hash" TEXT,
ADD COLUMN     "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_last_step" INTEGER,
ADD COLUMN     "totp_pending_secret" TEXT,
ADD COLUMN     "totp_secret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_token_hash_key" ON "users"("reset_token_hash");

