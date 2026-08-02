-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "assetClasses" TEXT[],
    "authType" TEXT NOT NULL DEFAULT 'none',
    "baseUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "delayLabel" TEXT NOT NULL DEFAULT 'Live',
    "refreshIntervalMs" INTEGER,
    "dailyQuota" INTEGER,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT false,
    "attributionText" TEXT,
    "fallbackProviderCode" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "isDerived" BOOLEAN NOT NULL DEFAULT false,
    "derivedFrom" JSONB,
    "descriptionFa" TEXT,
    "descriptionEn" TEXT,
    "externalIds" JSONB,
    "firstCollectedAt" TIMESTAMP(3),
    "historyNoteFa" TEXT,
    "historyNoteEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAlias" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "AssetAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAsset" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalSymbol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "ProviderAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatestQuote" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "price" DECIMAL(24,8) NOT NULL,
    "bid" DECIMAL(24,8),
    "ask" DECIMAL(24,8),
    "open" DECIMAL(24,8),
    "high" DECIMAL(24,8),
    "low" DECIMAL(24,8),
    "previousClose" DECIMAL(24,8),
    "changeAbsolute" DECIMAL(24,8),
    "changePercent" DECIMAL(12,6),
    "volume" DECIMAL(30,8),
    "marketCap" DECIMAL(30,8),
    "circulatingSupply" DECIMAL(30,8),
    "marketTimestamp" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshness" TEXT NOT NULL DEFAULT 'live',
    "rawChecksum" TEXT,
    "rawMetadata" JSONB,

    CONSTRAINT "LatestQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteSnapshot" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "price" DECIMAL(24,8) NOT NULL,
    "bid" DECIMAL(24,8),
    "ask" DECIMAL(24,8),
    "open" DECIMAL(24,8),
    "high" DECIMAL(24,8),
    "low" DECIMAL(24,8),
    "previousClose" DECIMAL(24,8),
    "changeAbsolute" DECIMAL(24,8),
    "changePercent" DECIMAL(12,6),
    "volume" DECIMAL(30,8),
    "marketTimestamp" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshness" TEXT NOT NULL DEFAULT 'live',
    "rawChecksum" TEXT,
    "rawMetadata" JSONB,

    CONSTRAINT "QuoteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OhlcCandle" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "providerId" TEXT,
    "interval" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(24,8) NOT NULL,
    "high" DECIMAL(24,8) NOT NULL,
    "low" DECIMAL(24,8) NOT NULL,
    "close" DECIMAL(24,8) NOT NULL,
    "volume" DECIMAL(30,8),
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OhlcCandle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealthCheck" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProviderHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderUsage" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),

    CONSTRAINT "ProviderUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "assetsProcessed" INTEGER NOT NULL DEFAULT 0,
    "quotesStored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSession" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noteFa" TEXT,
    "noteEn" TEXT,

    CONSTRAINT "MarketSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_code_key" ON "Provider"("code");

-- CreateIndex
CREATE INDEX "Provider_enabled_idx" ON "Provider"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_symbol_key" ON "Asset"("symbol");

-- CreateIndex
CREATE INDEX "Asset_assetClass_enabled_idx" ON "Asset"("assetClass", "enabled");

-- CreateIndex
CREATE INDEX "Asset_market_idx" ON "Asset"("market");

-- CreateIndex
CREATE INDEX "AssetAlias_alias_idx" ON "AssetAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "AssetAlias_assetId_alias_key" ON "AssetAlias"("assetId", "alias");

-- CreateIndex
CREATE INDEX "ProviderAsset_providerId_externalSymbol_idx" ON "ProviderAsset"("providerId", "externalSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAsset_assetId_providerId_key" ON "ProviderAsset"("assetId", "providerId");

-- CreateIndex
CREATE INDEX "LatestQuote_assetId_freshness_idx" ON "LatestQuote"("assetId", "freshness");

-- CreateIndex
CREATE INDEX "LatestQuote_receivedAt_idx" ON "LatestQuote"("receivedAt");

-- CreateIndex
CREATE INDEX "LatestQuote_providerId_idx" ON "LatestQuote"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "LatestQuote_assetId_providerId_key" ON "LatestQuote"("assetId", "providerId");

-- CreateIndex
CREATE INDEX "QuoteSnapshot_assetId_receivedAt_idx" ON "QuoteSnapshot"("assetId", "receivedAt");

-- CreateIndex
CREATE INDEX "QuoteSnapshot_assetId_marketTimestamp_idx" ON "QuoteSnapshot"("assetId", "marketTimestamp");

-- CreateIndex
CREATE INDEX "QuoteSnapshot_providerId_idx" ON "QuoteSnapshot"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSnapshot_assetId_providerId_marketTimestamp_key" ON "QuoteSnapshot"("assetId", "providerId", "marketTimestamp");

-- CreateIndex
CREATE INDEX "OhlcCandle_assetId_interval_startTime_endTime_idx" ON "OhlcCandle"("assetId", "interval", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "OhlcCandle_assetId_interval_isFinal_idx" ON "OhlcCandle"("assetId", "interval", "isFinal");

-- CreateIndex
CREATE UNIQUE INDEX "OhlcCandle_assetId_interval_startTime_key" ON "OhlcCandle"("assetId", "interval", "startTime");

-- CreateIndex
CREATE INDEX "ProviderHealthCheck_providerId_checkedAt_idx" ON "ProviderHealthCheck"("providerId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUsage_providerId_date_key" ON "ProviderUsage"("providerId", "date");

-- CreateIndex
CREATE INDEX "IngestionRun_providerId_startedAt_idx" ON "IngestionRun"("providerId", "startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_jobType_startedAt_idx" ON "IngestionRun"("jobType", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSession_market_key" ON "MarketSession"("market");

-- AddForeignKey
ALTER TABLE "AssetAlias" ADD CONSTRAINT "AssetAlias_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAsset" ADD CONSTRAINT "ProviderAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAsset" ADD CONSTRAINT "ProviderAsset_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatestQuote" ADD CONSTRAINT "LatestQuote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatestQuote" ADD CONSTRAINT "LatestQuote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSnapshot" ADD CONSTRAINT "QuoteSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteSnapshot" ADD CONSTRAINT "QuoteSnapshot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OhlcCandle" ADD CONSTRAINT "OhlcCandle_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OhlcCandle" ADD CONSTRAINT "OhlcCandle_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderHealthCheck" ADD CONSTRAINT "ProviderHealthCheck_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUsage" ADD CONSTRAINT "ProviderUsage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
