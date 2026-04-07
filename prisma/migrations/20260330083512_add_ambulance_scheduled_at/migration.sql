-- AlterTable
ALTER TABLE "AmbulanceRequest" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PoskoReport" ALTER COLUMN "incidentIds" DROP DEFAULT,
ALTER COLUMN "requestIds" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AmbulanceRequest_scheduledAt_idx" ON "AmbulanceRequest"("scheduledAt");
