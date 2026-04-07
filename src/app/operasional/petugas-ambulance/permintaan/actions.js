"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  AMBULANCE_CREW_ROLES,
  AMBULANCE_REQUEST_STATUS,
  AMBULANCE_UNIT_STATUS,
  INCIDENT_STATUS,
  OFFICER_TYPES,
  REPORT_APPROVAL_STATUS,
  USER_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { createBulkNotifications } from "@/lib/notification";
import { parseIntegerInput, parseNumberInput } from "@/lib/validations/incident";
import { createAmbulanceRequestSchema } from "@/lib/validations/ambulance-request";

const EDITABLE_STATUSES = new Set(Object.values(AMBULANCE_REQUEST_STATUS));

const ACTIVE_REQUEST_STATUSES = [
  AMBULANCE_REQUEST_STATUS.MENUNGGU,
  AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN,
  AMBULANCE_REQUEST_STATUS.PASIEN_DIANGKUT,
];

function mapZodError(error) {
  if (!error?.issues?.length) return "Validasi input gagal.";
  return error.issues[0]?.message || "Validasi input gagal.";
}

function buildRequestCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AMB-${datePart}-${randomPart}`;
}

function redirectWithAlert(message, type = "error") {
  const params = new URLSearchParams({
    alert: message,
    alertType: type,
  });
  redirect(`/operasional/petugas-ambulance/permintaan?tab=permintaan&${params.toString()}`);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

async function syncUnitAvailability(tx, unitId) {
  if (!unitId) return;

  const activeCount = await tx.ambulanceRequest.count({
    where: {
      unitId,
      status: { in: ACTIVE_REQUEST_STATUSES },
    },
  });

  await tx.ambulanceUnit.update({
    where: { id: unitId },
    data: {
      status:
        activeCount > 0
          ? AMBULANCE_UNIT_STATUS.BERTUGAS
          : AMBULANCE_UNIT_STATUS.STANDBY,
    },
  });
}

async function syncIncidentProgress(tx, incidentId) {
  if (!incidentId) return;

  const activeCount = await tx.ambulanceRequest.count({
    where: {
      incidentId,
      status: { in: ACTIVE_REQUEST_STATUSES },
    },
  });

  await tx.incident.updateMany({
    where: {
      id: incidentId,
      status: { not: INCIDENT_STATUS.CLOSED },
    },
    data: {
      status: activeCount > 0 ? INCIDENT_STATUS.ON_PROCESS : INCIDENT_STATUS.HANDLED,
    },
  });
}

export async function createAmbulanceRequest(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk membuat permintaan ambulance.");
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
    destinationType: String(formData.get("destinationType") || "").trim(),
    destinationName: String(formData.get("destinationName") || "").trim(),
    priority: String(formData.get("priority") || "").trim(),
    pickupLatitude: parseNumberInput(formData.get("pickupLatitude")),
    pickupLongitude: parseNumberInput(formData.get("pickupLongitude")),
    incidentId: String(formData.get("incidentId") || "").trim(),
    unitId: String(formData.get("unitId") || "").trim(),
  };

  const parsed = createAmbulanceRequestSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithAlert(mapZodError(parsed.error));
  }

  const incidentId = parsed.data.incidentId || null;
  const unitId = parsed.data.unitId || null;

  if (incidentId) {
    const exists = await db.incident.count({ where: { id: incidentId } });
    if (!exists) {
      redirectWithAlert("Kejadian terkait tidak ditemukan.");
    }
  }

  if (unitId) {
    const selectedUnit = await db.ambulanceUnit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!selectedUnit) {
      redirectWithAlert("Unit ambulance tidak ditemukan.");
    }
    if (selectedUnit.status === AMBULANCE_UNIT_STATUS.MAINTENANCE) {
      redirectWithAlert("Unit ambulance sedang maintenance dan tidak dapat ditugaskan.");
    }
  }

  let created = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      created = await db.$transaction(async (tx) => {
        const request = await tx.ambulanceRequest.create({
          data: {
            requestCode: buildRequestCode(),
            patientName: parsed.data.patientName,
            patientAge: parsed.data.patientAge,
            patientGender: parsed.data.patientGender || null,
            patientCondition: parsed.data.patientCondition || null,
            pickupAddress: parsed.data.pickupAddress,
            pickupDistrict: parsed.data.pickupDistrict,
            destinationType: parsed.data.destinationType,
            destinationName: parsed.data.destinationName,
            priority: parsed.data.priority,
            pickupLatitude: parsed.data.pickupLatitude,
            pickupLongitude: parsed.data.pickupLongitude,
            incidentId,
            unitId,
            isPublicRequest: false,
            approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
            approvedById: actor.id,
            approvedAt: new Date(),
            status: unitId
              ? AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN
              : AMBULANCE_REQUEST_STATUS.MENUNGGU,
          },
          select: {
            id: true,
            requestCode: true,
            status: true,
            incidentId: true,
            unitId: true,
          },
        });

        await syncUnitAvailability(tx, request.unitId);
        await syncIncidentProgress(tx, request.incidentId);
        return request;
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (!isUniqueViolation || attempt === 2) {
        redirectWithAlert("Gagal menyimpan permintaan ambulance. Coba lagi.");
      }
    }
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: created?.id,
      requestCode: created?.requestCode,
      status: created?.status,
      incidentId: created?.incidentId,
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    `Permintaan ambulance ${created?.requestCode || "baru"} berhasil dibuat.`,
    "success"
  );
}

export async function updateAmbulanceRequestStatus(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk mengubah status permintaan.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  if (!requestId || !EDITABLE_STATUSES.has(nextStatus)) {
    redirectWithAlert("Permintaan perubahan status tidak valid.");
  }

  const updated = await db.$transaction(async (tx) => {
    const request = await tx.ambulanceRequest.update({
      where: { id: requestId },
      data: { status: nextStatus },
      select: {
        id: true,
        requestCode: true,
        status: true,
        incidentId: true,
        unitId: true,
      },
    });

    await syncUnitAvailability(tx, request.unitId);
    await syncIncidentProgress(tx, request.incidentId);
    return request;
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      status: updated.status,
      incidentId: updated.incidentId,
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(`Status ${updated.requestCode} diubah ke ${updated.status}.`, "success");
}

export async function assignAmbulanceUnit(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif untuk assignment unit ambulance.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim();
  if (!requestId || !unitId) {
    redirectWithAlert("Data assignment unit tidak valid.");
  }

  const selectedUnit = await db.ambulanceUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      unitCode: true,
      status: true,
    },
  });
  if (!selectedUnit) {
    redirectWithAlert("Unit ambulance tidak ditemukan.");
  }
  if (selectedUnit.status === AMBULANCE_UNIT_STATUS.MAINTENANCE) {
    redirectWithAlert("Unit ambulance sedang maintenance dan tidak bisa ditugaskan.");
  }

  const updated = await db.$transaction(async (tx) => {
    const previous = await tx.ambulanceRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestCode: true,
        status: true,
        incidentId: true,
        unitId: true,
      },
    });

    if (!previous) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    const request = await tx.ambulanceRequest.update({
      where: { id: requestId },
      data: {
        unitId,
        status:
          previous.status === AMBULANCE_REQUEST_STATUS.MENUNGGU
            ? AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN
            : previous.status,
      },
      select: {
        id: true,
        requestCode: true,
        status: true,
        incidentId: true,
        unitId: true,
      },
    });

    await syncUnitAvailability(tx, unitId);
    if (previous.unitId && previous.unitId !== unitId) {
      await syncUnitAvailability(tx, previous.unitId);
    }
    await syncIncidentProgress(tx, request.incidentId);
    return request;
  }).catch((error) => {
    if (error instanceof Error && error.message === "REQUEST_NOT_FOUND") {
      redirectWithAlert("Permintaan ambulance tidak ditemukan.");
    }
    throw error;
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      assignedUnitId: updated.unitId,
      status: updated.status,
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(`Unit ambulance berhasil di-assign ke ${updated.requestCode}.`, "success");
}

export async function approvePublicAmbulanceRequest(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  if (!requestId) {
    redirectWithAlert("ID permintaan tidak valid.");
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
        isActive: true,
        status: USER_STATUS.ACTIVE,
        officerType: OFFICER_TYPES.PETUGAS_AMBULANCE,
      },
      select: { id: true },
    })
  ).map((u) => u.id);

  await createBulkNotifications({
    userIds: ambulanceOfficerIds,
    title: "Permintaan Ambulance Disetujui",
    message: `Permintaan ${updated.requestCode} telah disetujui posko dan menunggu tindak lanjut.`,
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

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(`Permintaan ${updated.requestCode} disetujui.`, "success");
}

export async function rejectPublicAmbulanceRequest(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const approvalNote = String(formData.get("approvalNote") || "").trim();
  if (!requestId) {
    redirectWithAlert("ID permintaan tidak valid.");
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

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(`Permintaan ${updated.requestCode} ditolak.`, "success");
}

export async function assignAmbulanceResponder(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const driverId = String(formData.get("driverId") || "").trim();
  const paramedicIds = uniqueValues(
    formData.getAll("paramedicIds").map((value) => String(value || "").trim())
  );
  if (!requestId || !driverId) {
    redirectWithAlert("Driver wajib dipilih untuk assignment tim ambulance.");
  }

  if (paramedicIds.length > 2) {
    redirectWithAlert("Maksimal 2 paramedik untuk satu permintaan ambulance.");
  }

  const crewIds = uniqueValues([driverId, ...paramedicIds]);
  if (crewIds.length !== 1 + paramedicIds.length) {
    redirectWithAlert("Driver dan paramedik harus berbeda orang.");
  }

  const request = await db.ambulanceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestCode: true,
    },
  });
  if (!request) {
    redirectWithAlert("Permintaan ambulance tidak ditemukan.");
  }

  const responders = await db.user.findMany({
    where: {
      id: { in: crewIds },
    },
    select: {
      id: true,
      fullName: true,
      officerType: true,
      status: true,
      isActive: true,
    },
  });

  if (responders.length !== crewIds.length) {
    redirectWithAlert("Sebagian petugas ambulance yang dipilih tidak ditemukan.");
  }

  for (const responder of responders) {
    if (!responder.isActive || responder.status !== USER_STATUS.ACTIVE) {
      redirectWithAlert(`Petugas ${responder.fullName} tidak aktif.`);
    }
    if (responder.officerType !== OFFICER_TYPES.PETUGAS_AMBULANCE) {
      redirectWithAlert(`User ${responder.fullName} bukan petugas ambulance.`);
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.ambulanceRequestResponder.deleteMany({
      where: { requestId },
    });

    const nextCrew = [
      {
        requestId,
        userId: driverId,
        role: AMBULANCE_CREW_ROLES.DRIVER,
      },
      ...paramedicIds.map((userId) => ({
        requestId,
        userId,
        role: AMBULANCE_CREW_ROLES.PARAMEDIK,
      })),
    ];

    if (nextCrew.length) {
      await tx.ambulanceRequestResponder.createMany({
        data: nextCrew,
      });
    }

    return tx.ambulanceRequest.update({
      where: { id: requestId },
      data: { assignedResponderId: driverId },
      select: {
        id: true,
        requestCode: true,
        assignedResponderId: true,
      },
    });
  });

  await createBulkNotifications({
    userIds: crewIds,
    title: "Penugasan Ambulance Baru",
    message: `Anda ditugaskan untuk follow-up permintaan ${updated.requestCode}.`,
    category: "AMBULANCE_ASSIGNMENT",
  });

  const driver = responders.find((item) => item.id === driverId);
  const paramedics = responders.filter((item) => paramedicIds.includes(item.id));

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      assignedResponderId: updated.assignedResponderId,
      assignedResponderName: driver?.fullName || null,
      crew: {
        driver: driver?.fullName || null,
        paramedics: paramedics.map((item) => item.fullName),
      },
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  redirectWithAlert(
    `Tim ambulance untuk ${updated.requestCode} berhasil disimpan.`,
    "success"
  );
}

export async function handleAmbulanceFollowUp(formData) {
  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun Anda belum aktif.");
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const driverId = String(formData.get("driverId") || "").trim();
  const paramedicIds = uniqueValues(
    formData.getAll("paramedicIds").map((value) => String(value || "").trim())
  );
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim();

  if (!requestId || !driverId) {
    redirectWithAlert("Driver wajib dipilih untuk follow-up ambulance.");
  }
  if (!EDITABLE_STATUSES.has(nextStatus)) {
    redirectWithAlert("Status layanan yang dipilih tidak valid.");
  }
  if (paramedicIds.length > 2) {
    redirectWithAlert("Maksimal 2 paramedik untuk satu permintaan ambulance.");
  }

  const crewIds = uniqueValues([driverId, ...paramedicIds]);
  if (crewIds.length !== 1 + paramedicIds.length) {
    redirectWithAlert("Driver dan paramedik harus berbeda orang.");
  }

  const responders = await db.user.findMany({
    where: {
      id: { in: crewIds },
    },
    select: {
      id: true,
      fullName: true,
      officerType: true,
      status: true,
      isActive: true,
    },
  });

  if (responders.length !== crewIds.length) {
    redirectWithAlert("Sebagian petugas ambulance yang dipilih tidak ditemukan.");
  }

  for (const responder of responders) {
    if (!responder.isActive || responder.status !== USER_STATUS.ACTIVE) {
      redirectWithAlert(`Petugas ${responder.fullName} tidak aktif.`);
    }
    if (responder.officerType !== OFFICER_TYPES.PETUGAS_AMBULANCE) {
      redirectWithAlert(`User ${responder.fullName} bukan petugas ambulance.`);
    }
  }

  const existingRequest = await db.ambulanceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestCode: true,
      incidentId: true,
      unitId: true,
    },
  });

  if (!existingRequest) {
    redirectWithAlert("Permintaan ambulance tidak ditemukan.");
  }

  let nextUnitId = unitId || existingRequest.unitId || null;
  if (nextUnitId) {
    const selectedUnit = await db.ambulanceUnit.findUnique({
      where: { id: nextUnitId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!selectedUnit) {
      redirectWithAlert("Unit ambulance tidak ditemukan.");
    }
    if (selectedUnit.status === AMBULANCE_UNIT_STATUS.MAINTENANCE) {
      redirectWithAlert("Unit ambulance sedang maintenance dan tidak bisa ditugaskan.");
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.ambulanceRequestResponder.deleteMany({
      where: { requestId },
    });

    const nextCrew = [
      {
        requestId,
        userId: driverId,
        role: AMBULANCE_CREW_ROLES.DRIVER,
      },
      ...paramedicIds.map((userId) => ({
        requestId,
        userId,
        role: AMBULANCE_CREW_ROLES.PARAMEDIK,
      })),
    ];

    if (nextCrew.length) {
      await tx.ambulanceRequestResponder.createMany({
        data: nextCrew,
      });
    }

    const request = await tx.ambulanceRequest.update({
      where: { id: requestId },
      data: {
        assignedResponderId: driverId,
        unitId: nextUnitId,
        status: nextStatus,
        scheduledAt: new Date(),
      },
      select: {
        id: true,
        requestCode: true,
        assignedResponderId: true,
        status: true,
        unitId: true,
        incidentId: true,
      },
    });

    await syncUnitAvailability(tx, request.unitId);
    if (existingRequest.unitId && existingRequest.unitId !== request.unitId) {
      await syncUnitAvailability(tx, existingRequest.unitId);
    }
    await syncIncidentProgress(tx, request.incidentId);

    return request;
  });

  await createBulkNotifications({
    userIds: crewIds,
    title: "Penugasan Ambulance Baru",
    message: `Anda ditugaskan untuk follow-up permintaan ${updated.requestCode}.`,
    category: "AMBULANCE_ASSIGNMENT",
  });

  const driver = responders.find((item) => item.id === driverId);
  const paramedics = responders.filter((item) => paramedicIds.includes(item.id));

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "ambulance_request",
    details: JSON.stringify({
      requestId: updated.id,
      requestCode: updated.requestCode,
      assignedResponderId: updated.assignedResponderId,
      assignedResponderName: driver?.fullName || null,
      unitId: updated.unitId,
      status: updated.status,
      crew: {
        driver: driver?.fullName || null,
        paramedics: paramedics.map((item) => item.fullName),
      },
    }),
  });

  revalidatePath("/operasional/petugas-ambulance/permintaan");
  revalidatePath("/operasional/petugas-posko/kejadian");
  redirectWithAlert(
    `Follow-up ${updated.requestCode} berhasil disimpan.`,
    "success"
  );
}
