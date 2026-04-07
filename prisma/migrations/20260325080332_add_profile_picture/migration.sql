-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'KOORDINATOR_POSKO', 'PETUGAS');

-- CreateEnum
CREATE TYPE "OfficerType" AS ENUM ('PETUGAS_POSKO', 'PETUGAS_ASSESSMENT', 'PETUGAS_AMBULANCE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('SIANG', 'MALAM');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'ON_PROCESS', 'HANDLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('HIJAU', 'KUNING', 'MERAH', 'HITAM');

-- CreateEnum
CREATE TYPE "AmbulanceUnitStatus" AS ENUM ('STANDBY', 'BERTUGAS', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "MotorUnitStatus" AS ENUM ('STANDBY', 'BERTUGAS', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AmbulanceRequestStatus" AS ENUM ('MENUNGGU', 'DALAM_PERJALANAN', 'PASIEN_DIANGKUT', 'SELESAI');

-- CreateEnum
CREATE TYPE "AmbulanceCrewRole" AS ENUM ('DRIVER', 'PARAMEDIK');

-- CreateEnum
CREATE TYPE "ReportApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "bloodType" TEXT,
    "profilePicture" TEXT,
    "role" "SystemRole" NOT NULL DEFAULT 'PETUGAS',
    "officerType" "OfficerType",
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "userId" TEXT NOT NULL,
    "officerType" "OfficerType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "incidentCode" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "sourceReport" TEXT NOT NULL,
    "reporterName" TEXT,
    "reporterPhone" TEXT,
    "incidentType" TEXT NOT NULL,
    "locationAddress" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "initialVictims" INTEGER NOT NULL DEFAULT 0,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "isPublicReport" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ReportApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "assignedOfficerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceUnit" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "status" "AmbulanceUnitStatus" NOT NULL DEFAULT 'STANDBY',
    "conditionNote" TEXT,
    "lastServiceAt" TIMESTAMP(3),
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotorUnit" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "status" "MotorUnitStatus" NOT NULL DEFAULT 'STANDBY',
    "conditionNote" TEXT,
    "lastServiceAt" TIMESTAMP(3),
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "patientCondition" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "pickupDistrict" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "destinationType" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" "AmbulanceRequestStatus" NOT NULL DEFAULT 'MENUNGGU',
    "isPublicRequest" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "ReportApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "assignedResponderId" TEXT,
    "unitId" TEXT,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceRequestResponder" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AmbulanceCrewRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceRequestResponder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "victimName" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "address" TEXT,
    "phoneNumber" TEXT,
    "nationalIdNumber" TEXT,
    "consciousness" TEXT,
    "injuryType" TEXT,
    "injuryLocation" TEXT,
    "triageLevel" "TriageLevel" NOT NULL,
    "firstAidAction" TEXT,
    "medicineGiven" TEXT,
    "toolsUsed" TEXT,
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralHospital" TEXT,
    "ambulanceUsed" BOOLEAN NOT NULL DEFAULT false,
    "referralAt" TIMESTAMP(3),
    "notes" TEXT,
    "incidentId" TEXT,
    "officerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjuryCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverShift" (
    "id" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "previousShift" "ShiftType" NOT NULL,
    "nextShift" "ShiftType" NOT NULL,
    "previousOfficerIds" TEXT[],
    "nextOfficerIds" TEXT[],
    "activeIncidentIds" TEXT[],
    "notes" TEXT,
    "constraints" TEXT,
    "requiredNeeds" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoverShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralHospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "emergencyPhone" TEXT,
    "hasEmergencyUnit" BOOLEAN NOT NULL DEFAULT true,
    "hasTraumaCenter" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralHospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "backupPhone" TEXT,
    "district" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticItem" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "storageLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" "LogAction" NOT NULL,
    "module" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ShiftAssignment_date_shiftType_idx" ON "ShiftAssignment"("date", "shiftType");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_incidentCode_key" ON "Incident"("incidentCode");

-- CreateIndex
CREATE INDEX "Incident_reportedAt_idx" ON "Incident"("reportedAt");

-- CreateIndex
CREATE INDEX "Incident_district_idx" ON "Incident"("district");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_approvalStatus_idx" ON "Incident"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceUnit_unitCode_key" ON "AmbulanceUnit"("unitCode");

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceUnit_plateNumber_key" ON "AmbulanceUnit"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MotorUnit_unitCode_key" ON "MotorUnit"("unitCode");

-- CreateIndex
CREATE UNIQUE INDEX "MotorUnit_plateNumber_key" ON "MotorUnit"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceRequest_requestCode_key" ON "AmbulanceRequest"("requestCode");

-- CreateIndex
CREATE INDEX "AmbulanceRequest_status_idx" ON "AmbulanceRequest"("status");

-- CreateIndex
CREATE INDEX "AmbulanceRequest_createdAt_idx" ON "AmbulanceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AmbulanceRequest_approvalStatus_idx" ON "AmbulanceRequest"("approvalStatus");

-- CreateIndex
CREATE INDEX "AmbulanceRequestResponder_requestId_role_idx" ON "AmbulanceRequestResponder"("requestId", "role");

-- CreateIndex
CREATE INDEX "AmbulanceRequestResponder_userId_idx" ON "AmbulanceRequestResponder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceRequestResponder_requestId_userId_key" ON "AmbulanceRequestResponder"("requestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InjuryCard_cardNumber_key" ON "InjuryCard"("cardNumber");

-- CreateIndex
CREATE INDEX "InjuryCard_triageLevel_idx" ON "InjuryCard"("triageLevel");

-- CreateIndex
CREATE INDEX "InjuryCard_createdAt_idx" ON "InjuryCard"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "ReferralHospital_district_idx" ON "ReferralHospital"("district");

-- CreateIndex
CREATE INDEX "ReferralHospital_isActive_idx" ON "ReferralHospital"("isActive");

-- CreateIndex
CREATE INDEX "EmergencyContact_agency_idx" ON "EmergencyContact"("agency");

-- CreateIndex
CREATE INDEX "EmergencyContact_isActive_idx" ON "EmergencyContact"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticItem_itemCode_key" ON "LogisticItem"("itemCode");

-- CreateIndex
CREATE INDEX "LogisticItem_category_idx" ON "LogisticItem"("category");

-- CreateIndex
CREATE INDEX "LogisticItem_isActive_idx" ON "LogisticItem"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequest" ADD CONSTRAINT "AmbulanceRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "AmbulanceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequest" ADD CONSTRAINT "AmbulanceRequest_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequest" ADD CONSTRAINT "AmbulanceRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequest" ADD CONSTRAINT "AmbulanceRequest_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequestResponder" ADD CONSTRAINT "AmbulanceRequestResponder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AmbulanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceRequestResponder" ADD CONSTRAINT "AmbulanceRequestResponder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryCard" ADD CONSTRAINT "InjuryCard_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjuryCard" ADD CONSTRAINT "InjuryCard_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
