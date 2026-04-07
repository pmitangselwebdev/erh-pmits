const fs = require("node:fs");
const path = require("node:path");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const DUMMY_TAG = "[DUMMY-SEED]";
const DUMMY_DOMAIN = "@dummy.sim-posko.local";
const NOTIFICATION_CATEGORY = "DUMMY_REVIEW";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(ENV_PATH);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum terkonfigurasi untuk proses seed.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const pgSchema = databaseUrl.searchParams.get("schema") || "public";
databaseUrl.searchParams.delete("schema");

const adapter = new PrismaPg(
  { connectionString: databaseUrl.toString() },
  { schema: pgSchema }
);

const prisma = new PrismaClient({ adapter, log: ["error"] });

const districts = [
  "Pondok Aren",
  "Serpong",
  "Ciputat",
  "Ciputat Timur",
  "Pamulang",
  "Setu",
  "Serpong Utara",
];

const incidentTypes = [
  "Kecelakaan Lalu Lintas",
  "Banjir Lokal",
  "Evakuasi Medis",
  "Kebakaran Permukiman",
  "Jatuh di Rumah",
  "Pingsan di Fasilitas Umum",
  "Cedera Kerja",
  "Korban Keracunan",
];

const destinationNames = [
  "RSUD Kota Tangerang Selatan",
  "RS Sari Asih Ciputat",
  "RS Hermina Serpong",
  "RS Mitra Keluarga Bintaro",
  "RS Premier Bintaro",
];

const emergencyAgencies = ["PMI", "BPBD", "Damkar", "Polri", "TNI", "Dinkes"];
const bloodTypes = ["A", "B", "AB", "O"];
const genders = ["L", "P"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const triageLevels = ["HIJAU", "KUNING", "MERAH", "HITAM"];
const injuryTypes = ["Luka Lecet", "Patah Tulang", "Trauma Kepala", "Sesak Napas", "Luka Bakar"];
const userStatuses = { PENDING: "PENDING", ACTIVE: "ACTIVE", REJECTED: "REJECTED" };
const systemRoles = { ADMIN: "ADMIN", KOORDINATOR_POSKO: "KOORDINATOR_POSKO", PETUGAS: "PETUGAS" };
const officerTypes = {
  PETUGAS_POSKO: "PETUGAS_POSKO",
  PETUGAS_ASSESSMENT: "PETUGAS_ASSESSMENT",
  PETUGAS_AMBULANCE: "PETUGAS_AMBULANCE",
};
const reportApprovalStatus = { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" };
const incidentStatuses = {
  REPORTED: "REPORTED",
  ON_PROCESS: "ON_PROCESS",
  HANDLED: "HANDLED",
  CLOSED: "CLOSED",
};
const requestStatuses = {
  MENUNGGU: "MENUNGGU",
  DALAM_PERJALANAN: "DALAM_PERJALANAN",
  PASIEN_DIANGKUT: "PASIEN_DIANGKUT",
  SELESAI: "SELESAI",
};
const unitStatuses = {
  STANDBY: "STANDBY",
  BERTUGAS: "BERTUGAS",
  MAINTENANCE: "MAINTENANCE",
};
const shiftTypes = { SIANG: "SIANG", MALAM: "MALAM" };
const handoverStatuses = { DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", CONFIRMED: "CONFIRMED" };
const logActions = ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "APPROVE", "REJECT"];
const crewRoles = { DRIVER: "DRIVER", PARAMEDIK: "PARAMEDIK" };

function pick(values, index) {
  return values[index % values.length];
}

function code(prefix, index, width = 3) {
  return `${prefix}${String(index).padStart(width, "0")}`;
}

function phone(index) {
  return `08${String(8110000000 + index).slice(0, 10)}`;
}

function dateDaysAgo(index, hourOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - index);
  date.setHours((8 + hourOffset) % 24, (index * 7) % 60, 0, 0);
  return date;
}

function tangselCoordinate(index, latBase = -6.3, lngBase = 106.7) {
  return {
    lat: latBase + (index % 20) * 0.004 - 0.04,
    lng: lngBase + (index % 20) * 0.004 - 0.04,
  };
}

function cleanupNotificationFilter() {
  return {
    OR: [
      { category: NOTIFICATION_CATEGORY },
      { title: { contains: DUMMY_TAG } },
      { message: { contains: DUMMY_TAG } },
    ],
  };
}

async function deleteExistingDummyData() {
  const dummyUsers = await prisma.user.findMany({
    where: { email: { endsWith: DUMMY_DOMAIN } },
    select: { id: true },
  });
  const dummyUserIds = dummyUsers.map((item) => item.id);

  const dummyRequests = await prisma.ambulanceRequest.findMany({
    where: { requestCode: { startsWith: "DREQ-" } },
    select: { id: true },
  });
  const dummyRequestIds = dummyRequests.map((item) => item.id);

  await prisma.notification.deleteMany({
    where: cleanupNotificationFilter(),
  });

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { module: "dummy_seed" },
        { details: { contains: DUMMY_TAG } },
        ...(dummyUserIds.length ? [{ userId: { in: dummyUserIds } }] : []),
      ],
    },
  });

  if (dummyUserIds.length) {
    await prisma.shiftAssignment.deleteMany({
      where: { userId: { in: dummyUserIds } },
    });
  }

  await prisma.handoverShift.deleteMany({
    where: {
      OR: [
        { notes: { contains: DUMMY_TAG } },
        { constraints: { contains: DUMMY_TAG } },
        { requiredNeeds: { contains: DUMMY_TAG } },
      ],
    },
  });

  if (dummyRequestIds.length) {
    await prisma.ambulanceRequestResponder.deleteMany({
      where: { requestId: { in: dummyRequestIds } },
    });
  }

  await prisma.injuryCard.deleteMany({
    where: {
      OR: [
        { cardNumber: { startsWith: "DIC-" } },
        { notes: { contains: DUMMY_TAG } },
      ],
    },
  });

  await prisma.ambulanceRequest.deleteMany({
    where: { requestCode: { startsWith: "DREQ-" } },
  });

  await prisma.incident.deleteMany({
    where: { incidentCode: { startsWith: "DINC-" } },
  });

  await prisma.ambulanceUnit.deleteMany({
    where: { unitCode: { startsWith: "DU-" } },
  });

  await prisma.motorUnit.deleteMany({
    where: { unitCode: { startsWith: "DM-" } },
  });

  await prisma.referralHospital.deleteMany({
    where: { notes: { contains: DUMMY_TAG } },
  });

  await prisma.emergencyContact.deleteMany({
    where: { notes: { contains: DUMMY_TAG } },
  });

  await prisma.logisticItem.deleteMany({
    where: { notes: { contains: DUMMY_TAG } },
  });

  if (dummyUserIds.length) {
    await prisma.user.deleteMany({
      where: { id: { in: dummyUserIds } },
    });
  }
}

function buildDummyUsers() {
  const users = [];

  for (let index = 1; index <= 10; index += 1) {
    const coord = tangselCoordinate(index, -6.31, 106.71);
    users.push({
      clerkUserId: `dummy-posko-${index}`,
      email: `dummy.posko.${index}${DUMMY_DOMAIN}`,
      fullName: `${DUMMY_TAG} Petugas Posko ${index}`,
      phoneNumber: phone(index),
      address: `Posko PMI wilayah ${pick(districts, index)}`,
      bloodType: pick(bloodTypes, index),
      gender: pick(genders, index),
      role:
        index === 1
          ? systemRoles.ADMIN
          : index === 2
            ? systemRoles.KOORDINATOR_POSKO
            : systemRoles.PETUGAS,
      officerType: officerTypes.PETUGAS_POSKO,
      status: userStatuses.ACTIVE,
      joinedAt: dateDaysAgo(index + 20),
      isActive: true,
      lastLatitude: coord.lat,
      lastLongitude: coord.lng,
      lastLocationAt: dateDaysAgo(index % 2),
      createdAt: dateDaysAgo(index + 25),
      updatedAt: new Date(),
    });
  }

  for (let index = 1; index <= 15; index += 1) {
    const coord = tangselCoordinate(index + 30, -6.29, 106.72);
    users.push({
      clerkUserId: `dummy-assessment-${index}`,
      email: `dummy.assessment.${index}${DUMMY_DOMAIN}`,
      fullName: `${DUMMY_TAG} Petugas Assessment ${index}`,
      phoneNumber: phone(100 + index),
      address: `Base assessment ${pick(districts, index)}`,
      bloodType: pick(bloodTypes, index + 2),
      gender: pick(genders, index + 1),
      role: systemRoles.PETUGAS,
      officerType: officerTypes.PETUGAS_ASSESSMENT,
      status: userStatuses.ACTIVE,
      joinedAt: dateDaysAgo(index + 10),
      isActive: true,
      lastLatitude: coord.lat,
      lastLongitude: coord.lng,
      lastLocationAt: dateDaysAgo(index % 2),
      createdAt: dateDaysAgo(index + 15),
      updatedAt: new Date(),
    });
  }

  for (let index = 1; index <= 25; index += 1) {
    const coord = tangselCoordinate(index + 60, -6.28, 106.69);
    users.push({
      clerkUserId: `dummy-ambulance-${index}`,
      email: `dummy.ambulance.${index}${DUMMY_DOMAIN}`,
      fullName: `${DUMMY_TAG} Petugas Ambulance ${index}`,
      phoneNumber: phone(200 + index),
      address: `Base ambulance ${pick(districts, index)}`,
      bloodType: pick(bloodTypes, index + 1),
      gender: pick(genders, index + 2),
      role: systemRoles.PETUGAS,
      officerType: officerTypes.PETUGAS_AMBULANCE,
      status: userStatuses.ACTIVE,
      joinedAt: dateDaysAgo(index + 5),
      isActive: true,
      lastLatitude: coord.lat,
      lastLongitude: coord.lng,
      lastLocationAt: dateDaysAgo(index % 2),
      createdAt: dateDaysAgo(index + 7),
      updatedAt: new Date(),
    });
  }

  for (let index = 1; index <= 50; index += 1) {
    const officerType = pick(Object.values(officerTypes), index);
    users.push({
      clerkUserId: `dummy-pending-${index}`,
      email: `dummy.pending.${index}${DUMMY_DOMAIN}`,
      fullName: `${DUMMY_TAG} User Pending ${index}`,
      phoneNumber: phone(300 + index),
      address: `Alamat registrasi ${pick(districts, index)}`,
      bloodType: pick(bloodTypes, index + 3),
      gender: pick(genders, index + 3),
      role: systemRoles.PETUGAS,
      officerType,
      status: userStatuses.PENDING,
      joinedAt: null,
      isActive: false,
      createdAt: dateDaysAgo(index % 14),
      updatedAt: new Date(),
    });
  }

  return users;
}

async function main() {
  const realUsers = await prisma.user.findMany({
    where: { email: { not: { endsWith: DUMMY_DOMAIN } } },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      officerType: true,
      status: true,
      isActive: true,
    },
  });

  const realReviewUsers = realUsers.filter((item) => item.isActive).slice(0, 5);
  await deleteExistingDummyData();

  const dummyUsers = buildDummyUsers();
  await prisma.user.createMany({ data: dummyUsers });

  const allUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: DUMMY_DOMAIN } },
        { id: { in: realUsers.map((item) => item.id) } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      officerType: true,
      status: true,
      isActive: true,
    },
  });

  const activeUsers = allUsers.filter((item) => item.isActive && item.status === userStatuses.ACTIVE);
  const poskoPool = activeUsers.filter(
    (item) =>
      item.role === systemRoles.ADMIN ||
      item.role === systemRoles.KOORDINATOR_POSKO ||
      item.officerType === officerTypes.PETUGAS_POSKO
  );
  const assessmentPool = activeUsers.filter(
    (item) => item.officerType === officerTypes.PETUGAS_ASSESSMENT
  );
  const ambulancePool = activeUsers.filter(
    (item) => item.officerType === officerTypes.PETUGAS_AMBULANCE
  );

  const activeUserIds = activeUsers.map((item) => item.id);
  const assessmentIds = assessmentPool.map((item) => item.id);
  const ambulanceIds = ambulancePool.map((item) => item.id);
  const poskoIds = poskoPool.map((item) => item.id);

  const units = Array.from({ length: 50 }, (_, index) => ({
    ...(function () {
      const coord = tangselCoordinate(index + 100, -6.3, 106.705);
      return {
        lastLatitude: coord.lat,
        lastLongitude: coord.lng,
        lastLocationAt: dateDaysAgo(index % 2),
      };
    })(),
    unitCode: `DU-${String(index + 1).padStart(3, "0")}`,
    plateNumber: `B ${4300 + index} PMI`,
    vehicleName: `${DUMMY_TAG} Ambulance ${index + 1}`,
    status:
      index < 20
        ? unitStatuses.BERTUGAS
        : index < 25
          ? unitStatuses.MAINTENANCE
          : unitStatuses.STANDBY,
    conditionNote: `${DUMMY_TAG} Unit untuk review halaman data master dan operasional.`,
    lastServiceAt: dateDaysAgo((index % 12) + 1),
  }));
  await prisma.ambulanceUnit.createMany({ data: units });

  const motorUnits = Array.from({ length: 50 }, (_, index) => ({
    ...(function () {
      const coord = tangselCoordinate(index + 180, -6.285, 106.715);
      return {
        lastLatitude: coord.lat,
        lastLongitude: coord.lng,
        lastLocationAt: dateDaysAgo(index % 2),
      };
    })(),
    unitCode: `DM-${String(index + 1).padStart(3, "0")}`,
    plateNumber: `B ${5300 + index} PMI`,
    vehicleName: `${DUMMY_TAG} Motor Operasional ${index + 1}`,
    status:
      index < 18
        ? unitStatuses.BERTUGAS
        : index < 23
          ? unitStatuses.MAINTENANCE
          : unitStatuses.STANDBY,
    conditionNote: `${DUMMY_TAG} Armada motor untuk review peta operasional.`,
    lastServiceAt: dateDaysAgo((index % 10) + 1),
  }));
  await prisma.motorUnit.createMany({ data: motorUnits });

  const createdUnits = await prisma.ambulanceUnit.findMany({
    where: { unitCode: { startsWith: "DU-" } },
    orderBy: { unitCode: "asc" },
    select: { id: true, unitCode: true, status: true },
  });

  const incidentRows = Array.from({ length: 50 }, (_, index) => {
    const approvalStatus =
      index < 35
        ? reportApprovalStatus.APPROVED
        : index < 45
          ? reportApprovalStatus.PENDING
          : reportApprovalStatus.REJECTED;
    const status =
      approvalStatus !== reportApprovalStatus.APPROVED
        ? incidentStatuses.REPORTED
        : pick(
            [
              incidentStatuses.REPORTED,
              incidentStatuses.ON_PROCESS,
              incidentStatuses.HANDLED,
              incidentStatuses.CLOSED,
            ],
            index
          );

    return {
      incidentCode: `DINC-${String(index + 1).padStart(3, "0")}`,
      reportedAt: dateDaysAgo(index % 20, index),
      sourceReport: index % 2 === 0 ? "Call Center 119" : "WhatsApp Posko",
      reporterName: `${DUMMY_TAG} Pelapor ${index + 1}`,
      reporterPhone: phone(500 + index),
      incidentType: pick(incidentTypes, index),
      locationAddress: `${DUMMY_TAG} Jl. Lokasi Kejadian ${index + 1}, ${pick(districts, index)}`,
      district: pick(districts, index),
      latitude: -6.28 - index * 0.001,
      longitude: 106.69 + index * 0.001,
      description: `${DUMMY_TAG} Ringkasan situasi lapangan untuk evaluasi tampilan kejadian.`,
      initialVictims: (index % 8) + 1,
      status,
      isPublicReport: index % 3 !== 0,
      approvalStatus,
      approvedById: approvalStatus === reportApprovalStatus.PENDING ? null : pick(poskoIds, index),
      approvedAt: approvalStatus === reportApprovalStatus.PENDING ? null : dateDaysAgo(index % 15),
      approvalNote:
        approvalStatus === reportApprovalStatus.REJECTED
          ? `${DUMMY_TAG} Data duplikat / tidak valid.`
          : approvalStatus === reportApprovalStatus.PENDING
            ? `${DUMMY_TAG} Menunggu verifikasi posko.`
            : null,
      assignedOfficerId:
        approvalStatus === reportApprovalStatus.APPROVED && assessmentIds.length
          ? pick(assessmentIds, index)
          : null,
    };
  });
  await prisma.incident.createMany({ data: incidentRows });

  const createdIncidents = await prisma.incident.findMany({
    where: { incidentCode: { startsWith: "DINC-" } },
    orderBy: { incidentCode: "asc" },
    select: {
      id: true,
      incidentCode: true,
      approvalStatus: true,
      status: true,
    },
  });

  const approvedIncidentIds = createdIncidents
    .filter((item) => item.approvalStatus === reportApprovalStatus.APPROVED)
    .map((item) => item.id);

  const requestRows = Array.from({ length: 50 }, (_, index) => {
    const approvalStatus =
      index < 35
        ? reportApprovalStatus.APPROVED
        : index < 45
          ? reportApprovalStatus.PENDING
          : reportApprovalStatus.REJECTED;
    const status =
      approvalStatus !== reportApprovalStatus.APPROVED
        ? requestStatuses.MENUNGGU
        : pick(
            [
              requestStatuses.MENUNGGU,
              requestStatuses.DALAM_PERJALANAN,
              requestStatuses.PASIEN_DIANGKUT,
              requestStatuses.SELESAI,
            ],
            index
          );
    const driverId = ambulanceIds.length ? pick(ambulanceIds, index) : null;
    const unit = createdUnits[index % createdUnits.length] || null;

    return {
      requestCode: `DREQ-${String(index + 1).padStart(3, "0")}`,
      patientName: `${DUMMY_TAG} Pasien ${index + 1}`,
      patientAge: 18 + (index % 55),
      patientGender: pick(genders, index),
      patientCondition: `${DUMMY_TAG} Kondisi pasien prioritas ${pick(priorities, index)}.`,
      pickupAddress: `${DUMMY_TAG} Titik Jemput ${index + 1}, ${pick(districts, index)}`,
      pickupDistrict: pick(districts, index),
      pickupLatitude: -6.25 - index * 0.001,
      pickupLongitude: 106.70 + index * 0.001,
      destinationType: "Rumah Sakit",
      destinationName: pick(destinationNames, index),
      priority: pick(priorities, index),
      status,
      isPublicRequest: index % 2 === 0,
      approvalStatus,
      approvedById: approvalStatus === reportApprovalStatus.PENDING ? null : pick(poskoIds, index),
      approvedAt: approvalStatus === reportApprovalStatus.PENDING ? null : dateDaysAgo(index % 10),
      approvalNote:
        approvalStatus === reportApprovalStatus.REJECTED
          ? `${DUMMY_TAG} Permintaan di luar cakupan layanan.`
          : approvalStatus === reportApprovalStatus.PENDING
            ? `${DUMMY_TAG} Menunggu validasi dispatcher.`
            : null,
      assignedResponderId: approvalStatus === reportApprovalStatus.APPROVED ? driverId : null,
      unitId: approvalStatus === reportApprovalStatus.APPROVED ? unit?.id || null : null,
      incidentId: approvedIncidentIds.length ? pick(approvedIncidentIds, index) : null,
      createdAt: dateDaysAgo(index % 18, index + 1),
    };
  });
  await prisma.ambulanceRequest.createMany({ data: requestRows });

  const createdRequests = await prisma.ambulanceRequest.findMany({
    where: { requestCode: { startsWith: "DREQ-" } },
    orderBy: { requestCode: "asc" },
    select: {
      id: true,
      requestCode: true,
      approvalStatus: true,
    },
  });

  const crewAssignments = [];
  createdRequests.forEach((request, index) => {
    if (request.approvalStatus !== reportApprovalStatus.APPROVED || ambulanceIds.length < 3) {
      return;
    }

    const driverId = pick(ambulanceIds, index);
    const paramedicOneId = pick(ambulanceIds, index + 1);
    const paramedicTwoId = pick(ambulanceIds, index + 2);

    crewAssignments.push(
      {
        requestId: request.id,
        userId: driverId,
        role: crewRoles.DRIVER,
      },
      {
        requestId: request.id,
        userId: paramedicOneId,
        role: crewRoles.PARAMEDIK,
      },
      {
        requestId: request.id,
        userId: paramedicTwoId,
        role: crewRoles.PARAMEDIK,
      }
    );
  });

  if (crewAssignments.length) {
    await prisma.ambulanceRequestResponder.createMany({ data: crewAssignments });
  }

  const injuryCards = Array.from({ length: 50 }, (_, index) => ({
    cardNumber: `DIC-${String(index + 1).padStart(3, "0")}`,
    victimName: `${DUMMY_TAG} Korban ${index + 1}`,
    gender: pick(genders, index),
    age: 10 + (index % 60),
    address: `${DUMMY_TAG} Alamat Korban ${index + 1}`,
    phoneNumber: phone(700 + index),
    nationalIdNumber: `3174${String(100000000000 + index).slice(0, 12)}`,
    consciousness: index % 4 === 0 ? "Menurun" : "Baik",
    injuryType: pick(injuryTypes, index),
    injuryLocation: pick(["Kepala", "Tangan", "Kaki", "Dada"], index),
    triageLevel: pick(triageLevels, index),
    firstAidAction: `${DUMMY_TAG} Stabilization dan observasi awal.`,
    medicineGiven: index % 3 === 0 ? "Oksigen" : "-",
    toolsUsed: index % 2 === 0 ? "Spine board" : "Tandu lipat",
    referralRequired: index % 2 === 0,
    referralHospital: pick(destinationNames, index),
    ambulanceUsed: true,
    referralAt: dateDaysAgo(index % 16, index + 2),
    notes: `${DUMMY_TAG} Catatan kartu luka untuk pengujian review UI.`,
    incidentId: approvedIncidentIds.length ? pick(approvedIncidentIds, index) : null,
    officerId: ambulanceIds.length ? pick(ambulanceIds, index) : null,
  }));
  await prisma.injuryCard.createMany({ data: injuryCards });

  const hospitals = Array.from({ length: 50 }, (_, index) => ({
    name: `${DUMMY_TAG} RS Rujukan ${index + 1}`,
    address: `${DUMMY_TAG} Jl. Rumah Sakit ${index + 1}`,
    district: pick(districts, index),
    phoneNumber: phone(800 + index),
    emergencyPhone: phone(850 + index),
    hasEmergencyUnit: true,
    hasTraumaCenter: index % 3 === 0,
    isActive: true,
    notes: `${DUMMY_TAG} Data rumah sakit untuk review halaman master data.`,
  }));
  await prisma.referralHospital.createMany({ data: hospitals });

  const contacts = Array.from({ length: 50 }, (_, index) => ({
    name: `${DUMMY_TAG} Kontak ${index + 1}`,
    agency: pick(emergencyAgencies, index),
    phoneNumber: phone(900 + index),
    backupPhone: phone(950 + index),
    district: pick(districts, index),
    isActive: true,
    notes: `${DUMMY_TAG} Data kontak darurat untuk review halaman master data.`,
  }));
  await prisma.emergencyContact.createMany({ data: contacts });

  const logistics = Array.from({ length: 50 }, (_, index) => ({
    itemCode: `DLOG-${String(index + 1).padStart(3, "0")}`,
    name: `${DUMMY_TAG} Item Logistik ${index + 1}`,
    category: pick(["Medis", "Evakuasi", "Konsumsi", "APD", "Komunikasi"], index),
    unit: pick(["pcs", "box", "pak", "set"], index),
    currentStock: 20 + (index % 70),
    minimumStock: 10 + (index % 15),
    storageLocation: `Gudang ${1 + (index % 4)}`,
    isActive: true,
    notes: `${DUMMY_TAG} Persediaan untuk pengujian halaman logistik.`,
  }));
  await prisma.logisticItem.createMany({ data: logistics });

  const shifts = Array.from({ length: 50 }, (_, index) => ({
    date: dateDaysAgo(index % 15),
    shiftType: pick(Object.values(shiftTypes), index),
    userId: pick(activeUserIds, index),
    officerType: pick(Object.values(officerTypes), index),
  }));
  await prisma.shiftAssignment.createMany({ data: shifts });

  for (let index = 0; index < 50; index += 1) {
    await prisma.handoverShift.create({
      data: {
        handoverDate: dateDaysAgo(index % 25),
        previousShift: index % 2 === 0 ? shiftTypes.SIANG : shiftTypes.MALAM,
        nextShift: index % 2 === 0 ? shiftTypes.MALAM : shiftTypes.SIANG,
        previousOfficerIds: [pick(activeUserIds, index), pick(activeUserIds, index + 1), pick(activeUserIds, index + 2)],
        nextOfficerIds: [pick(activeUserIds, index + 3), pick(activeUserIds, index + 4), pick(activeUserIds, index + 5)],
        activeIncidentIds: [pick(approvedIncidentIds, index), pick(approvedIncidentIds, index + 1)],
        notes: `${DUMMY_TAG} Catatan handover shift ${index + 1}.`,
        constraints: `${DUMMY_TAG} Kendala operasional pada shift ${index + 1}.`,
        requiredNeeds: `${DUMMY_TAG} Kebutuhan lanjutan shift ${index + 1}.`,
        status: pick(Object.values(handoverStatuses), index),
        confirmedAt: index % 3 === 0 ? dateDaysAgo(index % 10) : null,
        createdById: pick(poskoIds, index),
      },
    });
  }

  const auditLogs = Array.from({ length: 50 }, (_, index) => ({
    userId: pick(poskoIds, index),
    userName: pick(poskoPool, index).fullName,
    action: pick(logActions, index),
    module: "dummy_seed",
    details: JSON.stringify({
      tag: DUMMY_TAG,
      sequence: index + 1,
      summary: `Audit dummy ${index + 1} untuk review halaman pengaturan.`,
    }),
    ipAddress: `10.10.0.${(index % 50) + 1}`,
    createdAt: dateDaysAgo(index % 12, index),
  }));
  await prisma.auditLog.createMany({ data: auditLogs });

  const notificationTargets = realReviewUsers.length ? realReviewUsers : activeUsers.slice(0, 3);
  const notifications = [];
  notificationTargets.forEach((user) => {
    for (let index = 0; index < 50; index += 1) {
      notifications.push({
        userId: user.id,
        title: `${DUMMY_TAG} Notifikasi ${index + 1}`,
        message: `${DUMMY_TAG} Notifikasi review fitur untuk ${user.fullName}.`,
        category: NOTIFICATION_CATEGORY,
        isRead: index % 3 === 0,
        readAt: index % 3 === 0 ? dateDaysAgo(index % 8, index) : null,
        createdAt: dateDaysAgo(index % 14, index + 2),
      });
    }
  });
  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications });
  }

  console.log("Dummy seed selesai.");
  console.log(`- Users dummy dibuat: ${dummyUsers.length}`);
  console.log(`- Incident dummy dibuat: 50`);
  console.log(`- Request ambulance dummy dibuat: 50`);
  console.log(`- Injury card dummy dibuat: 50`);
  console.log(`- Shift dummy dibuat: 50`);
  console.log(`- Handover dummy dibuat: 50`);
  console.log(`- Hospital, contact, logistic, unit ambulance, unit motor masing-masing dibuat: 50`);
  console.log(`- Notifikasi review dibuat: ${notifications.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });