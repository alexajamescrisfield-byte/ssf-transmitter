-- AlterTable
ALTER TABLE "SigningKey" ADD COLUMN     "privateKeySecretId" TEXT,
ALTER COLUMN "privateKeyPem" DROP NOT NULL;
