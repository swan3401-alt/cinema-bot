-- CreateTable
CREATE TABLE "UserPref" (
    "telegramId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPref_pkey" PRIMARY KEY ("telegramId")
);
