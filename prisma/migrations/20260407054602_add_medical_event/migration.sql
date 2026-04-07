-- CreateEnum
CREATE TYPE "MedicalEventStatus" AS ENUM ('INITIATED', 'PREPARATION', 'READY', 'ONGOING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MedicalEventPostType" AS ENUM ('WATER_STATION', 'MEDICAL_TENT', 'MOBILE_POINT');

-- CreateEnum
CREATE TYPE "MedicalStaffRole" AS ENUM ('DOKTER', 'PARAMEDIS', 'PERAWAT');

-- CreateEnum
CREATE TYPE "MedicalDutyMode" AS ENUM ('STATIS', 'DINAMIS');

-- CreateEnum
CREATE TYPE "MedicalFleetType" AS ENUM ('AMBULANCE', 'MOTOR');

-- CreateTable
CREATE TABLE "MedicalEvent" (
    "id" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTypeOther" TEXT,
    "runningCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "organizerName" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "district" TEXT NOT NULL,
    "locationAddress" TEXT NOT NULL,
    "participantTarget" INTEGER,
    "requiredDoctors" INTEGER NOT NULL DEFAULT 0,
    "requiredParamedics" INTEGER NOT NULL DEFAULT 0,
    "requiredNurses" INTEGER NOT NULL DEFAULT 0,
    "requiredOtherOfficers" INTEGER NOT NULL DEFAULT 0,
    "requiredAmbulances" INTEGER NOT NULL DEFAULT 0,
    "requiredMotors" INTEGER NOT NULL DEFAULT 0,
    "status" "MedicalEventStatus" NOT NULL DEFAULT 'INITIATED',
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEventPost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "postName" TEXT NOT NULL,
    "postType" "MedicalEventPostType" NOT NULL,
    "kmPoint" TEXT,
    "locationAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "requiredDoctors" INTEGER NOT NULL DEFAULT 0,
    "requiredParamedics" INTEGER NOT NULL DEFAULT 0,
    "requiredNurses" INTEGER NOT NULL DEFAULT 0,
    "requiredAmbulances" INTEGER NOT NULL DEFAULT 0,
    "requiredMotors" INTEGER NOT NULL DEFAULT 0,
    "requiredLogisticKinds" INTEGER NOT NULL DEFAULT 0,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "readinessNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEventPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEventPostTeamAssignment" (
    "id" TEXT NOT NULL,
    "eventPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffRole" "MedicalStaffRole" NOT NULL,
    "dutyMode" "MedicalDutyMode" NOT NULL DEFAULT 'STATIS',
    "isAmbulanceCrew" BOOLEAN NOT NULL DEFAULT false,
    "isMotorMobile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEventPostTeamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEventPostFleetAssignment" (
    "id" TEXT NOT NULL,
    "eventPostId" TEXT NOT NULL,
    "fleetType" "MedicalFleetType" NOT NULL,
    "ambulanceUnitId" TEXT,
    "motorUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEventPostFleetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEventPostLogisticPlan" (
    "id" TEXT NOT NULL,
    "eventPostId" TEXT NOT NULL,
    "logisticItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "requiredQty" INTEGER NOT NULL DEFAULT 0,
    "preparedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEventPostLogisticPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEventInjuryCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "postId" TEXT,
    "bibNumber" TEXT,
    "victimName" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "triageLevel" "TriageLevel" NOT NULL,
    "injuryType" TEXT,
    "consciousness" TEXT,
    "chiefComplaints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quickActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "otherFindings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kompakObat" TEXT,
    "kompakMakanMinum" TEXT,
    "kompakPenyakit" TEXT,
    "kompakAlergi" TEXT,
    "kompakKejadian" TEXT,
    "firstAidAction" TEXT,
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralHospital" TEXT,
    "locationAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "officerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEventInjuryCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalEvent_eventCode_key" ON "MedicalEvent"("eventCode");

-- CreateIndex
CREATE INDEX "MedicalEvent_status_startAt_idx" ON "MedicalEvent"("status", "startAt");

-- CreateIndex
CREATE INDEX "MedicalEvent_district_idx" ON "MedicalEvent"("district");

-- CreateIndex
CREATE INDEX "MedicalEventPost_eventId_postType_idx" ON "MedicalEventPost"("eventId", "postType");

-- CreateIndex
CREATE INDEX "MedicalEventPostTeamAssignment_userId_idx" ON "MedicalEventPostTeamAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalEventPostTeamAssignment_eventPostId_userId_staffRole_key" ON "MedicalEventPostTeamAssignment"("eventPostId", "userId", "staffRole");

-- CreateIndex
CREATE INDEX "MedicalEventPostFleetAssignment_eventPostId_fleetType_idx" ON "MedicalEventPostFleetAssignment"("eventPostId", "fleetType");

-- CreateIndex
CREATE INDEX "MedicalEventPostLogisticPlan_eventPostId_idx" ON "MedicalEventPostLogisticPlan"("eventPostId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalEventInjuryCard_cardNumber_key" ON "MedicalEventInjuryCard"("cardNumber");

-- CreateIndex
CREATE INDEX "MedicalEventInjuryCard_eventId_triageLevel_idx" ON "MedicalEventInjuryCard"("eventId", "triageLevel");

-- AddForeignKey
ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPost" ADD CONSTRAINT "MedicalEventPost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MedicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostTeamAssignment" ADD CONSTRAINT "MedicalEventPostTeamAssignment_eventPostId_fkey" FOREIGN KEY ("eventPostId") REFERENCES "MedicalEventPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostTeamAssignment" ADD CONSTRAINT "MedicalEventPostTeamAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostFleetAssignment" ADD CONSTRAINT "MedicalEventPostFleetAssignment_eventPostId_fkey" FOREIGN KEY ("eventPostId") REFERENCES "MedicalEventPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostFleetAssignment" ADD CONSTRAINT "MedicalEventPostFleetAssignment_ambulanceUnitId_fkey" FOREIGN KEY ("ambulanceUnitId") REFERENCES "AmbulanceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostFleetAssignment" ADD CONSTRAINT "MedicalEventPostFleetAssignment_motorUnitId_fkey" FOREIGN KEY ("motorUnitId") REFERENCES "MotorUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostLogisticPlan" ADD CONSTRAINT "MedicalEventPostLogisticPlan_eventPostId_fkey" FOREIGN KEY ("eventPostId") REFERENCES "MedicalEventPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventPostLogisticPlan" ADD CONSTRAINT "MedicalEventPostLogisticPlan_logisticItemId_fkey" FOREIGN KEY ("logisticItemId") REFERENCES "LogisticItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventInjuryCard" ADD CONSTRAINT "MedicalEventInjuryCard_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MedicalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventInjuryCard" ADD CONSTRAINT "MedicalEventInjuryCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MedicalEventPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEventInjuryCard" ADD CONSTRAINT "MedicalEventInjuryCard_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
