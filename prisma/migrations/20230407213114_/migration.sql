-- CreateEnum
CREATE TYPE "ConversionState" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessagingState" AS ENUM ('CHAT', 'ACTION');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('system', 'user', 'assistant');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ConversionJob" (
    "id" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "currentState" "ConversionState" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ConversionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "currentState" "MessagingState" NOT NULL DEFAULT 'CHAT',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToGoogleOAuthCode" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "authCode" TEXT,
    "token" TEXT,
    "refreshToken" TEXT,

    CONSTRAINT "UserToGoogleOAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "data" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "userId" INTEGER,
    "actionId" INTEGER,
    "hash" INTEGER,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "tool" TEXT NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserToGoogleOAuthCode_userId_key" ON "UserToGoogleOAuthCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserToGoogleOAuthCode_authCode_key" ON "UserToGoogleOAuthCode"("authCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserToGoogleOAuthCode_token_key" ON "UserToGoogleOAuthCode"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserToGoogleOAuthCode_refreshToken_key" ON "UserToGoogleOAuthCode"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Password" ADD CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserToGoogleOAuthCode" ADD CONSTRAINT "UserToGoogleOAuthCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
