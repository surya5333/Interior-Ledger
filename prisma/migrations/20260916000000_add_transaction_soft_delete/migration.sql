-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN "deleted_by_id" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_deleted_at_idx" ON "Transaction"("deleted_at");

-- CreateIndex
CREATE INDEX "Transaction_deleted_by_id_idx" ON "Transaction"("deleted_by_id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
