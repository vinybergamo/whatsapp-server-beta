-- AlterTable
ALTER TABLE "webhooks" ADD COLUMN     "events" TEXT[] DEFAULT ARRAY[]::TEXT[];
