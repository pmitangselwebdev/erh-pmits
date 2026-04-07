-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('DOKTER', 'PERAWAT', 'PARAMEDIK', 'LOGISTIK', 'DRIVER_AMBULANCE', 'PUSDATIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "specialization" "Specialization";
