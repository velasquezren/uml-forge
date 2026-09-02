-- AlterTable
ALTER TABLE "operation_logs" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'applied';

-- CreateIndex
CREATE INDEX "operation_logs_batchId_idx" ON "operation_logs"("batchId");
