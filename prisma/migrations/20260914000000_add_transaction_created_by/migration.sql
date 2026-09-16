-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_created_by_id_idx" ON "Transaction"("created_by_id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
