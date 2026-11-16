-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "card_brand" TEXT,
ADD COLUMN     "card_last4" TEXT,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_ref" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_ref_key" ON "orders"("payment_ref");

