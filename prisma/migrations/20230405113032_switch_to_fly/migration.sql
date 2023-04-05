/*
  Warnings:

  - You are about to drop the column `current_state` on the `ConversionJob` table. All the data in the column will be lost.
  - You are about to drop the column `messageType` on the `Message` table. All the data in the column will be lost.
  - Added the required column `role` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConversionState" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('system', 'user', 'assistant');

-- AlterTable
ALTER TABLE "ConversionJob" DROP COLUMN "current_state",
ADD COLUMN     "currentState" "ConversionState" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "messageType",
ADD COLUMN     "role" "Role" NOT NULL;

-- DropEnum
DROP TYPE "MessageType";
