-- CreateEnum
CREATE TYPE "PoskoReportType" AS ENUM ('HARIAN', 'SITUASI');

-- CreateEnum
CREATE TYPE "PoskoReportStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "PoskoReport" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "reportType" "PoskoReportType" NOT NULL,
    "status" "PoskoReportStatus" NOT NULL DEFAULT 'DRAFT',
    "reportDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "locationAddress" TEXT,
    "weatherCondition" TEXT,
    "operationalSummary" TEXT,
    "situationOverview" TEXT,
    "resourceNeeds" TEXT,
    "recommendation" TEXT,
    "incidentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requestIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payloadSnapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoskoReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoskoReport_reportCode_key" ON "PoskoReport"("reportCode");

-- CreateIndex
CREATE INDEX "PoskoReport_reportType_reportDate_idx" ON "PoskoReport"("reportType", "reportDate");

-- CreateIndex
CREATE INDEX "PoskoReport_status_idx" ON "PoskoReport"("status");

-- CreateIndex
CREATE INDEX "PoskoReport_createdById_createdAt_idx" ON "PoskoReport"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "PoskoReport" ADD CONSTRAINT "PoskoReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
