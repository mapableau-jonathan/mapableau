/*
  Warnings:

  - Made the column `addressId` on table `Provider` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Provider" ALTER COLUMN "addressId" SET NOT NULL;
