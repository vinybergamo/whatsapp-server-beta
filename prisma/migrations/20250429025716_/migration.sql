/*
  Warnings:

  - A unique constraint covering the columns `[document]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "document" TEXT,
ADD COLUMN     "documentType" TEXT DEFAULT 'BR:CPF';

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");
