-- CreateTable
CREATE TABLE "MorningReport" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "reportType" TEXT NOT NULL DEFAULT 'morning',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latestDataAt" TIMESTAMP(3) NOT NULL,
    "dataMode" TEXT NOT NULL,
    "completeness" INTEGER NOT NULL,
    "isTradingDay" BOOLEAN NOT NULL,
    "marketView" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MorningReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "reportDate" TEXT,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "missingData" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "biggestRisk" TEXT NOT NULL,
    "invalidation" TEXT NOT NULL,
    "fomo" BOOLEAN NOT NULL DEFAULT false,
    "singleDayMove" BOOLEAN NOT NULL DEFAULT false,
    "questionsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManualDataPoint" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "marketDate" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualDataPoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MorningReport_generatedAt_idx" ON "MorningReport"("generatedAt");
CREATE UNIQUE INDEX "MorningReport_reportDate_reportType_key" ON "MorningReport"("reportDate", "reportType");
CREATE INDEX "JobRun_jobName_startedAt_idx" ON "JobRun"("jobName", "startedAt");
CREATE UNIQUE INDEX "ManualDataPoint_symbol_field_marketDate_key" ON "ManualDataPoint"("symbol", "field", "marketDate");
