-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentIp" TEXT,
ADD COLUMN     "termsConsentAt" TIMESTAMP(3),
ADD COLUMN     "termsConsentVersion" TEXT;
