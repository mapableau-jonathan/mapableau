-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('participant', 'provider');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "userType" "UserType";
