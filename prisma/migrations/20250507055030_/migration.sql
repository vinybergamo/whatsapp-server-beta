-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxInstances" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DISCONNECTED';
