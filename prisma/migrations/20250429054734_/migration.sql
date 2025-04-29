-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT;
