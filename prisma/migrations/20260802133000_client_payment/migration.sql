-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "is_client_payment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "contact_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_is_client_payment_project_id_idx" ON "Transaction"("is_client_payment", "project_id");
