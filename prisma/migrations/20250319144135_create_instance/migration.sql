-- CreateTable
CREATE TABLE "Instance" (
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

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Instance_token_key" ON "Instance"("token");
