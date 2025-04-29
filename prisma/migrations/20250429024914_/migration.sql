/*
  Warnings:

  - You are about to drop the `Instance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Instance" DROP CONSTRAINT "Instance_userId_fkey";

-- DropTable
DROP TABLE "Instance";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "avatar" TEXT,
    "password" TEXT,
    "phone" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "connectedPhone" TEXT,
    "picture" TEXT,
    "profileStatus" TEXT,
    "name" TEXT,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "chats" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "platform" TEXT DEFAULT 'smba',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "automaticReading" BOOLEAN NOT NULL DEFAULT false,
    "rejectCalls" BOOLEAN NOT NULL DEFAULT false,
    "rejectCallsMessage" TEXT DEFAULT 'Não posso atender chamadas no momento.',
    "syncContacts" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "instances_token_key" ON "instances"("token");

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
