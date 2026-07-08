-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('fixed_per_request', 'per_unit', 'per_1000_units');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'expired', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('accepted', 'charged', 'rejected', 'insufficient_balance');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('balance_funded', 'usage_charged', 'refund', 'adjustment');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeteredService" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'active',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "defaultAsset" TEXT NOT NULL DEFAULT 'CKB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeteredService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "pricingModel" "PricingModel" NOT NULL,
    "price" DECIMAL(36,12) NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'CKB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Balance" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "availableBalance" DECIMAL(36,12) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(36,12) NOT NULL DEFAULT 0,
    "totalFunded" DECIMAL(36,12) NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(36,12) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DECIMAL(36,12) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentUri" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "providerReference" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "quantity" DECIMAL(36,12) NOT NULL,
    "unitName" TEXT NOT NULL,
    "calculatedAmount" DECIMAL(36,12) NOT NULL,
    "asset" TEXT NOT NULL,
    "status" "UsageStatus" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "type" "LedgerType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(36,12) NOT NULL,
    "asset" TEXT NOT NULL,
    "balanceAfter" DECIMAL(36,12) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_email_key" ON "Developer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_developerId_idx" ON "ApiKey"("developerId");

-- CreateIndex
CREATE INDEX "MeteredService_developerId_idx" ON "MeteredService"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "MeteredService_developerId_slug_key" ON "MeteredService"("developerId", "slug");

-- CreateIndex
CREATE INDEX "PricingRule_serviceId_metricKey_active_idx" ON "PricingRule"("serviceId", "metricKey", "active");

-- CreateIndex
CREATE INDEX "Customer_developerId_idx" ON "Customer"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_developerId_externalId_key" ON "Customer"("developerId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_customerId_asset_key" ON "Balance"("customerId", "asset");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_providerReference_key" ON "PaymentRequest"("providerReference");

-- CreateIndex
CREATE INDEX "PaymentRequest_developerId_status_idx" ON "PaymentRequest"("developerId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_customerId_idx" ON "PaymentRequest"("customerId");

-- CreateIndex
CREATE INDEX "UsageEvent_developerId_status_idx" ON "UsageEvent"("developerId", "status");

-- CreateIndex
CREATE INDEX "UsageEvent_serviceId_metricKey_idx" ON "UsageEvent"("serviceId", "metricKey");

-- CreateIndex
CREATE INDEX "UsageEvent_customerId_idx" ON "UsageEvent"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_developerId_idempotencyKey_key" ON "UsageEvent"("developerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_developerId_createdAt_idx" ON "LedgerEntry"("developerId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_customerId_idx" ON "LedgerEntry"("customerId");

-- CreateIndex
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_developerId_status_idx" ON "WebhookDelivery"("developerId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_serviceId_idx" ON "WebhookDelivery"("serviceId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeteredService" ADD CONSTRAINT "MeteredService_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MeteredService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MeteredService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MeteredService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MeteredService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
