"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  AMBULANCE_REQUEST_STATUS,
  INCIDENT_STATUS,
  OFFICER_TYPES,
  POSKO_REPORT_STATUSES,
  POSKO_REPORT_TYPES,
  REPORT_APPROVAL_STATUS,
  SYSTEM_ROLES,
  USER_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { createNotification, createBulkNotifications } from "@/lib/notification";
import { createAmbulanceRequestSchema } from "@/lib/validations/ambulance-request";
import {
  createIncidentSchema,
  parseIntegerInput,
  parseNumberInput,
} from "@/lib/validations/incident";
import {
  createPoskoReportSchema,
  parseMultiValueFormData,
} from "@/lib/validations/posko-report";

const EDITABLE_STATUSES = new Set(Object.values(INCIDENT_STATUS));

const ELEVATED_ROLES = new Set([
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.KOORDINATOR_POSKO,
]);

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

function buildIncidentCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `KJD-${datePart}-${randomPart}`;
}

function buildRequestCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AMB-${datePart}-${randomPart}`;
}

function redirectWithAlert(pathname, message, type = "error") {
  const params = new URLSearchParams({
    alert: message,
    alertType: type,
  });
  redirect(`${pathname}?${params.toString()}`);
}

function redirectWithAlertPermintaan(message, type = "error") {
  const params = new URLSearchParams({
    tab: "permintaan",
    alert: message,
    alertType: type,
  });
  redirect(`/operasional/petugas-posko/kejadian?${params.toString()}`);
}

function redirectWithAlertTab(tab, message, type = "error") {
  const params = new URLSearchParams({
    tab,
    alert: message,
    alertType: type,
  });
  redirect(`/operasional/petugas-posko/kejadian?${params.toString()}`);
}

async function getIncidentForPermission(incidentId) {
  return db.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      incidentCode: true,
      incidentType: true,
      district: true,
      status: true,
      assignedOfficerId: true,
    },
  });
}

function canModifyIncident(actor, incident) {
  if (!actor || !incident) return false;
  if (ELEVATED_ROLES.has(actor.role)) return true;
  return incident.assignedOfficerId === actor.id;
}

function canManagePoskoReport(actor) {
  if (!actor || actor.status !== USER_STATUS.ACTIVE) return false;
  if (ELEVATED_ROLES.has(actor.role)) return true;
  return actor.officerType === OFFICER_TYPES.PETUGAS_POSKO;
}

function buildPoskoReportCode(reportType) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  const prefix = reportType === POSKO_REPORT_TYPES.SITUASI ? "SIT" : "HAR";
  return `LAP-${prefix}-${datePart}-${randomPart}`;
}

function getReportTab(reportType) {
  return reportType === POSKO_REPORT_TYPES.SITUASI ? "situasi" : "laporan-harian";
}

function buildAddressWithKelurahan(address, kelurahan) {
  if (!kelurahan) return address;
  const normalizedKelurahan = String(kelurahan).trim();
  const normalizedAddress = String(address || "").trim();
  if (!normalizedAddress) return `Kel. ${normalizedKelurahan}`;

  const addressLower = normalizedAddress.toLowerCase();
  const kelurahanLower = normalizedKelurahan.toLowerCase();
  if (addressLower.includes(kelurahanLower) || addressLower.includes("kel.")) {
    return normalizedAddress;
  }

  return `Kel. ${normalizedKelurahan}, ${normalizedAddress}`;
}

export async function createIncident(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Akun Anda belum aktif untuk membuat kejadian."
    );
  }

  const payload = {
    sourceReport: String(formData.get("sourceReport") || "").trim(),
    reporterName: String(formData.get("reporterName") || "").trim(),
    reporterPhone: String(formData.get("reporterPhone") || "").trim(),
    incidentType: String(formData.get("incidentType") || "").trim(),
    locationAddress: String(formData.get("locationAddress") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    kelurahan: String(formData.get("kelurahan") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    initialVictims: parseIntegerInput(formData.get("initialVictims"), 0),
    latitude: parseNumberInput(formData.get("latitude")),
    longitude: parseNumberInput(formData.get("longitude")),
  };

  const parsed = createIncidentSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      mapZodError(parsed.error)
    );
  }

  let created = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const incidentCode = buildIncidentCode();

    try {
      created = await db.incident.create({
        data: {
          incidentCode,
          reportedAt: new Date(),
          sourceReport: parsed.data.sourceReport,
          reporterName: parsed.data.reporterName || null,
          reporterPhone: parsed.data.reporterPhone || null,
          incidentType: parsed.data.incidentType,
          locationAddress: buildAddressWithKelurahan(
            parsed.data.locationAddress,
            parsed.data.kelurahan
          ),
          district: parsed.data.district,
          description: parsed.data.description || null,
          initialVictims: parsed.data.initialVictims,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          isPublicReport: false,
          approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
          approvedById: actor.id,
          approvedAt: new Date(),
          assignedOfficerId: actor.id,
        },
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          district: true,
          status: true,
        },
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (!isUniqueViolation || attempt === 2) {
        redirectWithAlert(
          "/operasional/petugas-posko/kejadian",
          "Gagal menyimpan kejadian. Coba lagi."
        );
      }
    }
  }

  if (!created) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Gagal menyimpan kejadian. Coba lagi."
    );
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "incident",
    details: JSON.stringify({
      incidentId: created.id,
      incidentCode: created.incidentCode,
      incidentType: created.incidentType,
      district: created.district,
      status: created.status,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Kejadian ${created.incidentCode} berhasil dibuat.`,
    "success"
  );
}

export async function approvePublicIncident(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Akun Anda belum aktif.");
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  if (!incidentId) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "ID laporan tidak valid.");
  }

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      incidentCode: true,
      approvalStatus: true,
      isPublicReport: true,
    },
  });

  if (!incident || !incident.isPublicReport) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Laporan publik tidak ditemukan.");
  }

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: {
      approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      approvedById: actor.id,
      approvedAt: new Date(),
      approvalNote: null,
    },
    select: {
      id: true,
      incidentCode: true,
    },
  });

  const assessmentOfficerIds = (
    await db.user.findMany({
      where: {
        status: USER_STATUS.ACTIVE,
        isActive: true,
        officerType: "PETUGAS_ASSESSMENT",
      },
      select: { id: true },
    })
  ).map((u) => u.id);

  await createBulkNotifications({
    userIds: assessmentOfficerIds,
    title: "Laporan Kejadian Disetujui",
    message: `Laporan ${updated.incidentCode} telah disetujui posko dan siap ditindaklanjuti.`,
    category: "INCIDENT_APPROVED",
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "APPROVE",
    module: "incident",
    details: JSON.stringify({
      incidentId: updated.id,
      incidentCode: updated.incidentCode,
      approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      source: "PUBLIC_REPORT",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Laporan ${updated.incidentCode} disetujui.`,
    "success"
  );
}

export async function rejectPublicIncident(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Akun Anda belum aktif.");
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  const approvalNote = String(formData.get("approvalNote") || "").trim();
  if (!incidentId) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "ID laporan tidak valid.");
  }

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, incidentCode: true, isPublicReport: true },
  });
  if (!incident || !incident.isPublicReport) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Laporan publik tidak ditemukan.");
  }

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: {
      approvalStatus: REPORT_APPROVAL_STATUS.REJECTED,
      approvedById: actor.id,
      approvedAt: new Date(),
      approvalNote: approvalNote || "Laporan tidak valid",
      status: INCIDENT_STATUS.CLOSED,
    },
    select: { id: true, incidentCode: true },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "REJECT",
    module: "incident",
    details: JSON.stringify({
      incidentId: updated.id,
      incidentCode: updated.incidentCode,
      approvalStatus: REPORT_APPROVAL_STATUS.REJECTED,
      approvalNote: approvalNote || "Laporan tidak valid",
      source: "PUBLIC_REPORT",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Laporan ${updated.incidentCode} ditolak.`,
    "success"
  );
}

export async function assignAssessmentOfficer(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Akun Anda belum aktif.");
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  const officerId = String(formData.get("officerId") || "").trim();
  if (!incidentId || !officerId) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Data assignment tidak valid.");
  }

  const officer = await db.user.findUnique({
    where: { id: officerId },
    select: { id: true, fullName: true, officerType: true, isActive: true, status: true },
  });
  if (!officer || !officer.isActive || officer.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Petugas assessment tidak valid.");
  }
  if (officer.officerType !== "PETUGAS_ASSESSMENT") {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Petugas bukan role assessment.");
  }

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: {
      assignedOfficerId: officerId,
      status: INCIDENT_STATUS.ON_PROCESS,
    },
    select: {
      id: true,
      incidentCode: true,
      assignedOfficerId: true,
    },
  });

  await createNotification({
    userId: officerId,
    title: "Penugasan Assessment Baru",
    message: `Anda ditugaskan untuk assessment kejadian ${updated.incidentCode}.`,
    category: "INCIDENT_ASSIGNMENT",
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "incident",
    details: JSON.stringify({
      incidentId: updated.id,
      incidentCode: updated.incidentCode,
      assignedOfficerId: updated.assignedOfficerId,
      assignedOfficerName: officer.fullName,
      assignmentType: "ASSESSMENT",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Petugas ${officer.fullName} ditugaskan ke ${updated.incidentCode}.`,
    "success"
  );
}

export async function updateIncidentStatus(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Akun Anda belum aktif untuk mengubah status kejadian."
    );
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  if (!incidentId || !EDITABLE_STATUSES.has(nextStatus)) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Permintaan perubahan status tidak valid."
    );
  }

  const currentIncident = await getIncidentForPermission(incidentId);
  if (!currentIncident) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Data kejadian tidak ditemukan.");
  }
  if (!canModifyIncident(actor, currentIncident)) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Anda tidak memiliki izin untuk mengubah kejadian ini."
    );
  }

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: { status: nextStatus },
    select: {
      id: true,
      incidentCode: true,
      status: true,
      incidentType: true,
      district: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "incident",
    details: JSON.stringify({
      incidentId: updated.id,
      incidentCode: updated.incidentCode,
      incidentType: updated.incidentType,
      district: updated.district,
      status: updated.status,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Status ${updated.incidentCode} diubah ke ${updated.status}.`,
    "success"
  );
}

export async function updateIncident(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Akun Anda belum aktif untuk mengubah kejadian."
    );
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  if (!incidentId) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "ID kejadian tidak valid.");
  }

  const currentIncident = await getIncidentForPermission(incidentId);
  if (!currentIncident) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Data kejadian tidak ditemukan.");
  }
  if (!canModifyIncident(actor, currentIncident)) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Anda tidak memiliki izin untuk mengubah kejadian ini."
    );
  }

  const payload = {
    sourceReport: String(formData.get("sourceReport") || "").trim(),
    reporterName: String(formData.get("reporterName") || "").trim(),
    reporterPhone: String(formData.get("reporterPhone") || "").trim(),
    incidentType: String(formData.get("incidentType") || "").trim(),
    locationAddress: String(formData.get("locationAddress") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    kelurahan: String(formData.get("kelurahan") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    initialVictims: parseIntegerInput(formData.get("initialVictims"), 0),
    latitude: parseNumberInput(formData.get("latitude")),
    longitude: parseNumberInput(formData.get("longitude")),
  };

  const parsed = createIncidentSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(
      `/operasional/petugas-posko/kejadian/${incidentId}/edit`,
      mapZodError(parsed.error)
    );
  }

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: {
      sourceReport: parsed.data.sourceReport,
      reporterName: parsed.data.reporterName || null,
      reporterPhone: parsed.data.reporterPhone || null,
      incidentType: parsed.data.incidentType,
      locationAddress: buildAddressWithKelurahan(
        parsed.data.locationAddress,
        parsed.data.kelurahan
      ),
      district: parsed.data.district,
      description: parsed.data.description || null,
      initialVictims: parsed.data.initialVictims,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
    select: {
      id: true,
      incidentCode: true,
      incidentType: true,
      district: true,
      status: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "incident",
    details: JSON.stringify({
      incidentId: updated.id,
      incidentCode: updated.incidentCode,
      incidentType: updated.incidentType,
      district: updated.district,
      status: updated.status,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  revalidatePath(`/operasional/petugas-posko/kejadian/${incidentId}`);
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Kejadian ${updated.incidentCode} berhasil diperbarui.`,
    "success"
  );
}

export async function deleteIncident(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Akun Anda belum aktif untuk menghapus kejadian."
    );
  }

  const incidentId = String(formData.get("incidentId") || "").trim();
  if (!incidentId) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "ID kejadian tidak valid.");
  }

  const currentIncident = await getIncidentForPermission(incidentId);
  if (!currentIncident) {
    redirectWithAlert("/operasional/petugas-posko/kejadian", "Data kejadian tidak ditemukan.");
  }
  if (!canModifyIncident(actor, currentIncident)) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Anda tidak memiliki izin untuk menghapus kejadian ini."
    );
  }

  const linkedAmbulanceCount = await db.ambulanceRequest.count({
    where: { incidentId },
  });
  if (linkedAmbulanceCount > 0) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Kejadian tidak dapat dihapus karena sudah terhubung dengan permintaan ambulance."
    );
  }

  const deleted = await db.incident.delete({
    where: { id: incidentId },
    select: {
      id: true,
      incidentCode: true,
      incidentType: true,
      district: true,
      status: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "DELETE",
    module: "incident",
    details: JSON.stringify({
      incidentId: deleted.id,
      incidentCode: deleted.incidentCode,
      incidentType: deleted.incidentType,
      district: deleted.district,
      status: deleted.status,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    "/operasional/petugas-posko/kejadian",
    `Kejadian ${deleted.incidentCode} berhasil dihapus.`,
    "success"
  );
}

export async function createAmbulanceRequestByPosko(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlertPermintaan("Akun Anda belum aktif untuk membuat permintaan ambulance.");
  }

  const payload = {
    patientName: String(formData.get("patientName") || "").trim(),
    patientAge: (() => {
      const parsed = parseIntegerInput(formData.get("patientAge"), Number.NaN);
      if (Number.isNaN(parsed)) return null;
      return parsed;
    })(),
    patientGender: String(formData.get("patientGender") || "").trim(),
    patientCondition: String(formData.get("patientCondition") || "").trim(),
    pickupAddress: String(formData.get("pickupAddress") || "").trim(),
    pickupDistrict: String(formData.get("pickupDistrict") || "").trim(),
    pickupKelurahan: String(formData.get("pickupKelurahan") || "").trim(),
    destinationType: String(formData.get("destinationType") || "").trim(),
    destinationName: String(formData.get("destinationName") || "").trim(),
    priority: String(formData.get("priority") || "").trim(),
    pickupLatitude: parseNumberInput(formData.get("pickupLatitude")),
    pickupLongitude: parseNumberInput(formData.get("pickupLongitude")),
    incidentId: String(formData.get("incidentId") || "").trim(),
    unitId: "",
  };

  const parsed = createAmbulanceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlertPermintaan(parsed.error.issues?.[0]?.message || "Validasi input gagal.");
  }

  const incidentId = parsed.data.incidentId || null;
  if (incidentId) {
    const exists = await db.incident.count({ where: { id: incidentId } });
    if (!exists) {
      redirectWithAlertPermintaan("Kejadian terkait tidak ditemukan.");
    }
  }

  const request = await db.ambulanceRequest.create({
    data: {
      requestCode: buildRequestCode(),
      patientName: parsed.data.patientName,
      patientAge: parsed.data.patientAge,
      patientGender: parsed.data.patientGender || null,
      patientCondition: parsed.data.patientCondition || null,
      pickupAddress: buildAddressWithKelurahan(
        parsed.data.pickupAddress,
        parsed.data.pickupKelurahan
      ),
      pickupDistrict: parsed.data.pickupDistrict,
      destinationType: parsed.data.destinationType,
      destinationName: parsed.data.destinationName,
      priority: parsed.data.priority,
      pickupLatitude: parsed.data.pickupLatitude,
      pickupLongitude: parsed.data.pickupLongitude,
      incidentId,
      isPublicRequest: false,
      approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      approvedById: actor.id,
      approvedAt: new Date(),
      status: AMBULANCE_REQUEST_STATUS.MENUNGGU,
    },
    select: {
      id: true,
      requestCode: true,
      incidentId: true,
      status: true,
    },
  });

  const ambulanceOfficerIds = (
    await db.user.findMany({
      where: {
        status: USER_STATUS.ACTIVE,
        isActive: true,
        officerType: OFFICER_TYPES.PETUGAS_AMBULANCE,
      },
      select: { id: true },
    })
  ).map((u) => u.id);

  await createBulkNotifications({
    userIds: ambulanceOfficerIds,
    title: "Permintaan Ambulance Baru dari Posko",
    message: `Permintaan ${request.requestCode} siap untuk ditindaklanjuti tim ambulance.`,
    category: "AMBULANCE_APPROVED",
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: request.id,
      requestCode: request.requestCode,
      status: request.status,
      incidentId: request.incidentId,
      source: "POSKO_INTERNAL",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlertPermintaan(`Permintaan ${request.requestCode} berhasil dibuat.`, "success");
}

export async function approvePublicAmbulanceRequestByPosko(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlertPermintaan("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  if (!requestId) {
    redirectWithAlertPermintaan("ID permintaan tidak valid.");
  }

  const updated = await db.ambulanceRequest.update({
    where: { id: requestId },
    data: {
      approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      approvedById: actor.id,
      approvedAt: new Date(),
      approvalNote: null,
    },
    select: { id: true, requestCode: true },
  });

  const ambulanceOfficerIds = (
    await db.user.findMany({
      where: {
        status: USER_STATUS.ACTIVE,
        isActive: true,
        officerType: OFFICER_TYPES.PETUGAS_AMBULANCE,
      },
      select: { id: true },
    })
  ).map((u) => u.id);

  await createBulkNotifications({
    userIds: ambulanceOfficerIds,
    title: "Permintaan Ambulance Disetujui Posko",
    message: `Permintaan ${updated.requestCode} telah disetujui posko.`,
    category: "AMBULANCE_APPROVED",
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "APPROVE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      source: "PUBLIC_REQUEST",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlertPermintaan(`Permintaan ${updated.requestCode} disetujui.`, "success");
}

export async function rejectPublicAmbulanceRequestByPosko(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlertPermintaan("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const approvalNote = String(formData.get("approvalNote") || "").trim();
  if (!requestId) {
    redirectWithAlertPermintaan("ID permintaan tidak valid.");
  }

  const updated = await db.ambulanceRequest.update({
    where: { id: requestId },
    data: {
      approvalStatus: REPORT_APPROVAL_STATUS.REJECTED,
      approvedById: actor.id,
      approvedAt: new Date(),
      approvalNote: approvalNote || "Permintaan tidak valid",
      status: AMBULANCE_REQUEST_STATUS.SELESAI,
    },
    select: { id: true, requestCode: true },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "REJECT",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      approvalStatus: REPORT_APPROVAL_STATUS.REJECTED,
      approvalNote: approvalNote || "Permintaan tidak valid",
      source: "PUBLIC_REQUEST",
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlertPermintaan(`Permintaan ${updated.requestCode} ditolak.`, "success");
}

export async function deleteAmbulanceRequestByPosko(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlertPermintaan("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  if (!requestId) {
    redirectWithAlertPermintaan("ID permintaan tidak valid.");
  }

  const deleted = await db.ambulanceRequest.delete({
    where: { id: requestId },
    select: {
      id: true,
      requestCode: true,
      status: true,
      unitId: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "DELETE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: deleted.id,
      requestCode: deleted.requestCode,
      status: deleted.status,
      unitId: deleted.unitId,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlertPermintaan(`Permintaan ${deleted.requestCode} berhasil dihapus.`, "success");
}

export async function createPoskoReport(formData) {
  const actor = await getCurrentSessionProfile();
  if (!canManagePoskoReport(actor)) {
    redirectWithAlert(
      "/operasional/petugas-posko/kejadian",
      "Anda tidak memiliki izin membuat laporan posko."
    );
  }

  const reportType = String(formData.get("reportType") || "").trim();
  const status =
    String(formData.get("submitMode") || "draft").trim() === "submit"
      ? POSKO_REPORT_STATUSES.SUBMITTED
      : POSKO_REPORT_STATUSES.DRAFT;

  const getString = (key) => String(formData.get(key) || "").trim();

  const payload = {
    reportType,
    title: getString("title"),
    reportDate: getString("reportDate"),
    district: getString("district"),
    kelurahan: getString("kelurahan"),
    locationAddress: getString("locationAddress"),
    weatherCondition: getString("weatherCondition"),
    operationalSummary: getString("operationalSummary"),
    situationOverview: getString("situationOverview"),
    resourceNeeds: getString("resourceNeeds"),
    recommendation: getString("recommendation"),
    status,
    selectedIncidentIds: parseMultiValueFormData(formData, "selectedIncidentIds"),
    selectedRequestIds: parseMultiValueFormData(formData, "selectedRequestIds"),
    // Laporan Harian extras
    anggaranPersekot: getString("anggaranPersekot"),
    anggaranRealisasi: getString("anggaranRealisasi"),
    jumlahPeserta: getString("jumlahPeserta"),
    stokDarahA: getString("stokDarahA"),
    stokDarahB: getString("stokDarahB"),
    stokDarahAB: getString("stokDarahAB"),
    stokDarahO: getString("stokDarahO"),
    saran: getString("saran"),
    tindakLanjut: getString("tindakLanjut"),
    // Laporan Situasi extras
    korbanKK: getString("korbanKK"),
    korbanJiwa: getString("korbanJiwa"),
    lukaBerat: getString("lukaBerat"),
    lukaRingan: getString("lukaRingan"),
    meninggal: getString("meninggal"),
    hilang: getString("hilang"),
    mengungsi: getString("mengungsi"),
    rusakBerat: getString("rusakBerat"),
    rusakSedang: getString("rusakSedang"),
    rusakRingan: getString("rusakRingan"),
    rumahTerendam: getString("rumahTerendam"),
    fasSekolah: getString("fasSekolah"),
    fasIbadah: getString("fasIbadah"),
    fasKesehatan: getString("fasKesehatan"),
    fasLainnya: getString("fasLainnya"),
    totalPersonilPMI: getString("totalPersonilPMI"),
    armadaDigunakan: getString("armadaDigunakan"),
    kontakNama: getString("kontakNama"),
    kontakHp: getString("kontakHp"),
  };

  const parsed = createPoskoReportSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlertTab(
      getReportTab(reportType),
      parsed.error.issues?.[0]?.message || "Validasi laporan gagal."
    );
  }

  const selectedIncidents = parsed.data.selectedIncidentIds.length
    ? await db.incident.findMany({
        where: {
          id: { in: parsed.data.selectedIncidentIds },
        },
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          district: true,
          locationAddress: true,
          status: true,
          reportedAt: true,
          initialVictims: true,
        },
      })
    : [];

  const selectedRequests = parsed.data.selectedRequestIds.length
    ? await db.ambulanceRequest.findMany({
        where: {
          id: { in: parsed.data.selectedRequestIds },
        },
        select: {
          id: true,
          requestCode: true,
          patientName: true,
          pickupDistrict: true,
          destinationName: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      })
    : [];

  let createdReport = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reportCode = buildPoskoReportCode(parsed.data.reportType);
    try {
      createdReport = await db.poskoReport.create({
        data: {
          reportCode,
          reportType: parsed.data.reportType,
          status: parsed.data.status,
          reportDate: new Date(parsed.data.reportDate),
          title: parsed.data.title,
          district: parsed.data.district,
          locationAddress: buildAddressWithKelurahan(
            parsed.data.locationAddress,
            parsed.data.kelurahan
          ) || null,
          weatherCondition: parsed.data.weatherCondition || null,
          operationalSummary: parsed.data.operationalSummary || null,
          situationOverview: parsed.data.situationOverview || null,
          resourceNeeds: parsed.data.resourceNeeds || null,
          recommendation: parsed.data.recommendation || null,
          incidentIds: selectedIncidents.map((item) => item.id),
          requestIds: selectedRequests.map((item) => item.id),
          payloadSnapshot: {
            generatedBy: actor.fullName,
            generatedById: actor.id,
            generatedAt: new Date().toISOString(),
            incidents: selectedIncidents,
            ambulanceRequests: selectedRequests,
            metrics: {
              totalSelectedIncidents: selectedIncidents.length,
              totalSelectedRequests: selectedRequests.length,
            },
            extra: {
              // Laporan Harian
              anggaranPersekot: parsed.data.anggaranPersekot || null,
              anggaranRealisasi: parsed.data.anggaranRealisasi || null,
              jumlahPeserta: parsed.data.jumlahPeserta || null,
              stokDarahA: parsed.data.stokDarahA || null,
              stokDarahB: parsed.data.stokDarahB || null,
              stokDarahAB: parsed.data.stokDarahAB || null,
              stokDarahO: parsed.data.stokDarahO || null,
              saran: parsed.data.saran || null,
              tindakLanjut: parsed.data.tindakLanjut || null,
              // Laporan Situasi
              korbanKK: parsed.data.korbanKK || null,
              korbanJiwa: parsed.data.korbanJiwa || null,
              lukaBerat: parsed.data.lukaBerat || null,
              lukaRingan: parsed.data.lukaRingan || null,
              meninggal: parsed.data.meninggal || null,
              hilang: parsed.data.hilang || null,
              mengungsi: parsed.data.mengungsi || null,
              rusakBerat: parsed.data.rusakBerat || null,
              rusakSedang: parsed.data.rusakSedang || null,
              rusakRingan: parsed.data.rusakRingan || null,
              rumahTerendam: parsed.data.rumahTerendam || null,
              fasSekolah: parsed.data.fasSekolah || null,
              fasIbadah: parsed.data.fasIbadah || null,
              fasKesehatan: parsed.data.fasKesehatan || null,
              fasLainnya: parsed.data.fasLainnya || null,
              totalPersonilPMI: parsed.data.totalPersonilPMI || null,
              armadaDigunakan: parsed.data.armadaDigunakan || null,
              kontakNama: parsed.data.kontakNama || null,
              kontakHp: parsed.data.kontakHp || null,
              kelurahan: parsed.data.kelurahan || null,
            },
          },
          submittedAt:
            parsed.data.status === POSKO_REPORT_STATUSES.SUBMITTED ? new Date() : null,
          createdById: actor.id,
        },
        select: {
          id: true,
          reportCode: true,
          reportType: true,
          status: true,
        },
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (!isUniqueViolation || attempt === 2) {
        redirectWithAlertTab(getReportTab(reportType), "Gagal menyimpan laporan. Coba lagi.");
      }
    }
  }

  if (!createdReport) {
    redirectWithAlertTab(getReportTab(reportType), "Gagal menyimpan laporan. Coba lagi.");
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "posko_report",
    details: JSON.stringify({
      reportId: createdReport.id,
      reportCode: createdReport.reportCode,
      reportType: createdReport.reportType,
      status: createdReport.status,
    }),
  });

  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlertTab(
    getReportTab(createdReport.reportType),
    `Laporan ${createdReport.reportCode} berhasil disimpan.`,
    "success"
  );
}
