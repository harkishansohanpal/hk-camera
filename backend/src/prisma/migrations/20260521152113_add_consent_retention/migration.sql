-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "retentionDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentGivenAt" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "doNotSell" BOOLEAN NOT NULL DEFAULT false;
