-- CreateTable
CREATE TABLE "VendorScenario" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "triggerCode" TEXT NOT NULL,
    "caepType" TEXT NOT NULL,
    "claims" JSONB NOT NULL,
    "vendorEventType" TEXT,
    "recommendedAction" TEXT,
    "reasonAdmin" TEXT,
    "reasonUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorScenario_key_key" ON "VendorScenario"("key");
