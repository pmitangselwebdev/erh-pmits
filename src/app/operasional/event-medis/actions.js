"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit-log";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  MEDICAL_EVENT_TYPES,
  MEDICAL_EVENT_STATUS,
  MEDICAL_FLEET_TYPES,
  MEDICAL_STAFF_ROLES,
  TRIAGE_LEVELS,
  USER_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  createMedicalEventSchema,
  createMedicalEventPostSchema,
  parseInteger,
  parseNullableInteger,
  parseNullableNumber,
} from "@/lib/validations/medical-event";

function redirectWithAlert(message, type = "error", extras = {}) {
  const params = new URLSearchParams({ alert: message, alertType: type });
  const tab = String(extras.tab || "").trim();
  if (tab) {
    params.set("tab", tab);
  }
  redirect(`/operasional/event-medis?${params.toString()}`);
}

function getReturnTab(formData) {
  const tab = String(formData.get("returnTab") || "").trim();
  return tab || undefined;
}

function eventCode() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MED-${datePart}-${randomPart}`;
}

function eventInjuryCardNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MEIC-${datePart}-${randomPart}`;
}

function parseStringList(formData, key) {
  return formData
    .getAll(key)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function parseSingleOrMulti(formData, key) {
  const many = parseStringList(formData, key);
  if (many.length > 0) return many;

  const raw = String(formData.get(key) || "").trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureMedicalEventDelegates() {
  const available =
    typeof db.medicalEvent?.findMany === "function" &&
    typeof db.medicalEventPost?.findMany === "function";

  if (!available) {
    redirectWithAlert(
      "Model Event Medis belum tersedia di runtime Prisma. Jalankan prisma generate, prisma db push, lalu restart dev server."
    );
  }
}

export async function createMedicalEvent(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk membuat event medis.");
  }

  const parsed = createMedicalEventSchema.safeParse({
    eventName: String(formData.get("eventName") || "").trim(),
    eventType: String(formData.get("eventType") || "").trim(),
    eventTypeOther: String(formData.get("eventTypeOther") || "").trim(),
    runningCategories: parseStringList(formData, "runningCategories"),
    organizerName: String(formData.get("organizerName") || "").trim(),
    startAt: String(formData.get("startAt") || "").trim(),
    endAt: String(formData.get("endAt") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    locationAddress: String(formData.get("locationAddress") || "").trim(),
    participantTarget: parseNullableInteger(formData.get("participantTarget")),
    requiredDoctors: parseInteger(formData.get("requiredDoctors"), 0),
    requiredParamedics: parseInteger(formData.get("requiredParamedics"), 0),
    requiredNurses: parseInteger(formData.get("requiredNurses"), 0),
    requiredOtherOfficers: parseInteger(formData.get("requiredOtherOfficers"), 0),
    requiredAmbulances: parseInteger(formData.get("requiredAmbulances"), 0),
    requiredMotors: parseInteger(formData.get("requiredMotors"), 0),
  });

  if (!parsed.success) {
    redirectWithAlert(parsed.error.issues?.[0]?.message || "Validasi gagal.");
  }

  const created = await db.medicalEvent.create({
    data: {
      eventCode: eventCode(),
      eventName: parsed.data.eventName,
      eventType:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LAINNYA
          ? parsed.data.eventTypeOther.trim()
          : parsed.data.eventType,
      eventTypeOther:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LAINNYA ? parsed.data.eventTypeOther.trim() : null,
      runningCategories:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LARI ? parsed.data.runningCategories : [],
      organizerName: parsed.data.organizerName || null,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      district: parsed.data.district?.trim() || "Tidak diisi",
      locationAddress: parsed.data.locationAddress,
      participantTarget: parsed.data.participantTarget,
      requiredDoctors: parsed.data.requiredDoctors,
      requiredParamedics: parsed.data.requiredParamedics,
      requiredNurses: parsed.data.requiredNurses,
      requiredOtherOfficers: parsed.data.requiredOtherOfficers,
      requiredAmbulances: parsed.data.requiredAmbulances,
      requiredMotors: parsed.data.requiredMotors,
      status: MEDICAL_EVENT_STATUS.INITIATED,
      createdById: actor.id,
    },
    select: { id: true, eventCode: true, eventName: true },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "medical_event",
    details: JSON.stringify({ eventId: created.id, eventCode: created.eventCode, eventName: created.eventName }),
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(`Event ${created.eventCode} berhasil dibuat.`, "success");
}

export async function createMedicalEventPost(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk menambah pos event.");
  }

  const parsed = createMedicalEventPostSchema.safeParse({
    eventId: String(formData.get("eventId") || "").trim(),
    postName: String(formData.get("postName") || "").trim(),
    postType: String(formData.get("postType") || "").trim(),
    kmPoint: String(formData.get("kmPoint") || "").trim(),
    locationAddress: String(formData.get("locationAddress") || "").trim(),
    latitude: parseNullableNumber(formData.get("latitude")),
    longitude: parseNullableNumber(formData.get("longitude")),
    requiredDoctors: parseInteger(formData.get("requiredDoctors"), 0),
    requiredParamedics: parseInteger(formData.get("requiredParamedics"), 0),
    requiredNurses: parseInteger(formData.get("requiredNurses"), 0),
    requiredAmbulances: parseInteger(formData.get("requiredAmbulances"), 0),
    requiredMotors: parseInteger(formData.get("requiredMotors"), 0),
    requiredLogisticKinds: parseInteger(formData.get("requiredLogisticKinds"), 0),
  });

  if (!parsed.success) {
    redirectWithAlert(parsed.error.issues?.[0]?.message || "Validasi pos event gagal.");
  }

  await db.medicalEventPost.create({
    data: {
      eventId: parsed.data.eventId,
      postName: parsed.data.postName,
      postType: parsed.data.postType,
      kmPoint: parsed.data.kmPoint || null,
      locationAddress: parsed.data.locationAddress,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      requiredDoctors: parsed.data.requiredDoctors,
      requiredParamedics: parsed.data.requiredParamedics,
      requiredNurses: parsed.data.requiredNurses,
      requiredAmbulances: parsed.data.requiredAmbulances,
      requiredMotors: parsed.data.requiredMotors,
      requiredLogisticKinds: parsed.data.requiredLogisticKinds,
    },
  });

  await db.medicalEvent.update({
    where: { id: parsed.data.eventId },
    data: { status: MEDICAL_EVENT_STATUS.PREPARATION },
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert("Pos event berhasil ditambahkan.", "success", { tab: getReturnTab(formData) });
}

export async function assignMedicalTeam(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk assign tim.");
  }

  const eventPostId = String(formData.get("eventPostId") || "").trim();
  const userId = String(formData.get("userId") || "").trim();
  const staffRole = String(formData.get("staffRole") || "").trim();
  const dutyModeRaw = String(formData.get("dutyMode") || "").trim();
  const isAmbulanceCrew = dutyModeRaw === "AMBULANCE" || String(formData.get("isAmbulanceCrew") || "") === "on";
  const isMotorMobile = dutyModeRaw === "MOTOR" || String(formData.get("isMotorMobile") || "") === "on";
  const dutyMode = dutyModeRaw === "DINAMIS" ? "DINAMIS" : "STATIS";

  if (!eventPostId || !userId || !Object.values(MEDICAL_STAFF_ROLES).includes(staffRole)) {
    redirectWithAlert("Data assignment tim tidak valid.");
  }

  await db.medicalEventPostTeamAssignment.create({
    data: {
      eventPostId,
      userId,
      staffRole,
      dutyMode,
      isAmbulanceCrew,
      isMotorMobile,
    },
  }).catch(() => {
    redirectWithAlert("Petugas dengan role yang sama sudah diassign pada pos ini.");
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert("Tim berhasil diassign.", "success", { tab: getReturnTab(formData) });
}

export async function deleteMedicalTeamAssignment(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk menghapus assignment.");
  }

  const assignmentId = String(formData.get("assignmentId") || "").trim();
  if (!assignmentId) {
    redirectWithAlert("Assignment tidak valid.");
  }

  await db.medicalEventPostTeamAssignment.delete({
    where: { id: assignmentId },
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert("Assignment berhasil dihapus.", "success", { tab: getReturnTab(formData) });
}

export async function assignMedicalTeamAndFleet(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk assign tim dan armada.");
  }

  const eventPostId = String(formData.get("eventPostId") || "").trim();
  const userId = String(formData.get("userId") || "").trim();
  const staffRole = String(formData.get("staffRole") || "").trim();
  const dutyModeRaw = String(formData.get("dutyMode") || "").trim();
  const isAmbulanceCrew = dutyModeRaw === "AMBULANCE" || String(formData.get("isAmbulanceCrew") || "") === "on";
  const isMotorMobile = dutyModeRaw === "MOTOR" || String(formData.get("isMotorMobile") || "") === "on";
  const dutyMode = dutyModeRaw === "DINAMIS" ? "DINAMIS" : "STATIS";
  const fleetType = String(formData.get("fleetType") || "").trim();
  const ambulanceUnitId = String(formData.get("ambulanceUnitId") || "").trim() || null;
  const motorUnitId = String(formData.get("motorUnitId") || "").trim() || null;

  if (!eventPostId || !userId || !Object.values(MEDICAL_STAFF_ROLES).includes(staffRole)) {
    redirectWithAlert("Data tim tidak valid.");
  }
  const hasFleetSelection = Boolean(fleetType);
  const hasUnitSelection = Boolean(ambulanceUnitId || motorUnitId);

  if (hasFleetSelection && !Object.values(MEDICAL_FLEET_TYPES).includes(fleetType)) {
    redirectWithAlert("Data armada tidak valid.");
  }

  if (!hasFleetSelection && hasUnitSelection) {
    redirectWithAlert("Pilih tipe armada terlebih dahulu.");
  }

  if (fleetType === MEDICAL_FLEET_TYPES.AMBULANCE && !ambulanceUnitId) {
    redirectWithAlert("Pilih unit ambulance.");
  }
  if (fleetType === MEDICAL_FLEET_TYPES.MOTOR && !motorUnitId) {
    redirectWithAlert("Pilih unit motor.");
  }

  let teamAssigned = false;
  try {
    await db.medicalEventPostTeamAssignment.create({
      data: {
        eventPostId,
        userId,
        staffRole,
        dutyMode,
        isAmbulanceCrew,
        isMotorMobile,
      },
    });
    teamAssigned = true;
  } catch (error) {
    const isUniqueViolation =
      error instanceof Error &&
      typeof error.message === "string" &&
      error.message.includes("Unique constraint failed");

    if (!isUniqueViolation) {
      redirectWithAlert("Gagal assign tim.");
    }
  }

  if (hasFleetSelection) {
    await db.medicalEventPostFleetAssignment.create({
      data: {
        eventPostId,
        fleetType,
        ambulanceUnitId: fleetType === MEDICAL_FLEET_TYPES.AMBULANCE ? ambulanceUnitId : null,
        motorUnitId: fleetType === MEDICAL_FLEET_TYPES.MOTOR ? motorUnitId : null,
      },
    });
  }

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(teamAssigned ? "Tim berhasil diassign." : "Armada berhasil diassign.", "success", {
    tab: getReturnTab(formData),
  });
}

export async function assignMedicalFleet(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk assign armada.");
  }

  const eventPostId = String(formData.get("eventPostId") || "").trim();
  const fleetType = String(formData.get("fleetType") || "").trim();
  const ambulanceUnitId = String(formData.get("ambulanceUnitId") || "").trim() || null;
  const motorUnitId = String(formData.get("motorUnitId") || "").trim() || null;

  if (!eventPostId || !Object.values(MEDICAL_FLEET_TYPES).includes(fleetType)) {
    redirectWithAlert("Data assignment armada tidak valid.");
  }

  if (fleetType === MEDICAL_FLEET_TYPES.AMBULANCE && !ambulanceUnitId) {
    redirectWithAlert("Pilih unit ambulance.");
  }
  if (fleetType === MEDICAL_FLEET_TYPES.MOTOR && !motorUnitId) {
    redirectWithAlert("Pilih unit motor.");
  }

  await db.medicalEventPostFleetAssignment.create({
    data: {
      eventPostId,
      fleetType,
      ambulanceUnitId: fleetType === MEDICAL_FLEET_TYPES.AMBULANCE ? ambulanceUnitId : null,
      motorUnitId: fleetType === MEDICAL_FLEET_TYPES.MOTOR ? motorUnitId : null,
    },
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert("Armada berhasil diassign.", "success", { tab: getReturnTab(formData) });
}

export async function addMedicalLogisticPlan(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk menambah logistik.");
  }

  const eventPostId = String(formData.get("eventPostId") || "").trim();
  const logisticItemId = String(formData.get("logisticItemId") || "").trim() || null;
  const itemName = String(formData.get("itemName") || "").trim();
  const requiredQty = parseInteger(formData.get("requiredQty"), 0);
  const preparedQty = requiredQty;

  if (!eventPostId || !itemName) {
    redirectWithAlert("Data logistik tidak valid.");
  }

  await db.medicalEventPostLogisticPlan.create({
    data: {
      eventPostId,
      logisticItemId,
      itemName,
      requiredQty,
      preparedQty,
    },
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert("Kebutuhan logistik ditambahkan.", "success", { tab: getReturnTab(formData) });
}

export async function updateMedicalPostReadiness(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk update readiness.");
  }

  const postId = String(formData.get("postId") || "").trim();
  if (!postId) {
    redirectWithAlert("Pos tidak valid.");
  }

  const post = await db.medicalEventPost.findUnique({
    where: { id: postId },
    include: {
      teamAssignments: true,
      fleetAssignments: true,
      logisticPlans: true,
      event: true,
    },
  });

  if (!post) {
    redirectWithAlert("Pos event tidak ditemukan.");
  }

  const doctorCount = post.teamAssignments.filter((t) => t.staffRole === "DOKTER").length;
  const paramedicCount = post.teamAssignments.filter((t) => t.staffRole === "PARAMEDIS").length;
  const nurseCount = post.teamAssignments.filter((t) => t.staffRole === "PERAWAT").length;

  const ambulanceCount = post.fleetAssignments.filter((f) => f.fleetType === "AMBULANCE").length;
  const motorCount = post.fleetAssignments.filter((f) => f.fleetType === "MOTOR").length;

  const readyLogisticKinds = post.logisticPlans.filter((l) => l.preparedQty >= l.requiredQty && l.requiredQty > 0).length;

  const teamReady =
    doctorCount >= post.requiredDoctors &&
    paramedicCount >= post.requiredParamedics &&
    nurseCount >= post.requiredNurses;

  const fleetReady =
    ambulanceCount >= post.requiredAmbulances && motorCount >= post.requiredMotors;

  const logisticReady = readyLogisticKinds >= post.requiredLogisticKinds;

  const isReady = teamReady && fleetReady && logisticReady;

  await db.medicalEventPost.update({
    where: { id: postId },
    data: {
      isReady,
      readinessNote: isReady
        ? "Semua kebutuhan pos terpenuhi."
        : `Belum lengkap. Tim:${teamReady ? "OK" : "NO"}, Armada:${fleetReady ? "OK" : "NO"}, Logistik:${logisticReady ? "OK" : "NO"}`,
    },
  });

  const remaining = await db.medicalEventPost.count({
    where: {
      eventId: post.eventId,
      isReady: false,
    },
  });

  await db.medicalEvent.update({
    where: { id: post.eventId },
    data: {
      status: remaining === 0 ? MEDICAL_EVENT_STATUS.READY : MEDICAL_EVENT_STATUS.PREPARATION,
    },
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(isReady ? "Pos dinyatakan READY." : "Pos belum READY. Cek kebutuhan.", "success", {
    tab: getReturnTab(formData),
  });
}

export async function updateMedicalEventStatus(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk update status event.");
  }

  const eventId = String(formData.get("eventId") || "").trim();
  const nextStatus = String(formData.get("nextStatus") || "").trim();
  if (!eventId || !Object.values(MEDICAL_EVENT_STATUS).includes(nextStatus)) {
    redirectWithAlert("Perubahan status event tidak valid.");
  }

  const event = await db.medicalEvent.findUnique({
    where: { id: eventId },
    include: {
      posts: {
        select: { id: true, isReady: true },
      },
    },
  });
  if (!event) {
    redirectWithAlert("Event medis tidak ditemukan.");
  }

  const allPostsReady = event.posts.length > 0 && event.posts.every((item) => item.isReady);
  if (nextStatus === MEDICAL_EVENT_STATUS.ONGOING && !allPostsReady) {
    redirectWithAlert("Event tidak bisa ONGOING. Semua pos harus READY terlebih dahulu.");
  }

  if (
    nextStatus === MEDICAL_EVENT_STATUS.COMPLETED &&
    event.status !== MEDICAL_EVENT_STATUS.ONGOING
  ) {
    redirectWithAlert("Event hanya bisa COMPLETED dari status ONGOING.");
  }

  if (
    nextStatus === MEDICAL_EVENT_STATUS.CLOSED &&
    event.status !== MEDICAL_EVENT_STATUS.COMPLETED
  ) {
    redirectWithAlert("Event hanya bisa CLOSED dari status COMPLETED.");
  }

  const updated = await db.medicalEvent.update({
    where: { id: eventId },
    data: {
      status: nextStatus,
      approvedAt:
        nextStatus === MEDICAL_EVENT_STATUS.ONGOING ? event.approvedAt || new Date() : event.approvedAt,
      closedAt: nextStatus === MEDICAL_EVENT_STATUS.CLOSED ? new Date() : event.closedAt,
    },
    select: {
      id: true,
      eventCode: true,
      eventName: true,
      status: true,
    },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "STATUS_CHANGE",
    module: "medical_event",
    details: JSON.stringify({
      eventId: updated.id,
      eventCode: updated.eventCode,
      eventName: updated.eventName,
      status: updated.status,
    }),
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(`Status event ${updated.eventCode} berubah menjadi ${updated.status}.`, "success");
}

export async function updateMedicalEvent(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk update event medis.");
  }

  const eventId = String(formData.get("eventId") || "").trim();
  if (!eventId) {
    redirectWithAlert("Event medis tidak valid.");
  }

  const parsed = createMedicalEventSchema.safeParse({
    eventName: String(formData.get("eventName") || "").trim(),
    eventType: String(formData.get("eventType") || "").trim(),
    eventTypeOther: String(formData.get("eventTypeOther") || "").trim(),
    runningCategories: parseStringList(formData, "runningCategories"),
    organizerName: String(formData.get("organizerName") || "").trim(),
    startAt: String(formData.get("startAt") || "").trim(),
    endAt: String(formData.get("endAt") || "").trim(),
    district: String(formData.get("district") || "").trim(),
    locationAddress: String(formData.get("locationAddress") || "").trim(),
    participantTarget: parseNullableInteger(formData.get("participantTarget")),
    requiredDoctors: parseInteger(formData.get("requiredDoctors"), 0),
    requiredParamedics: parseInteger(formData.get("requiredParamedics"), 0),
    requiredNurses: parseInteger(formData.get("requiredNurses"), 0),
    requiredOtherOfficers: parseInteger(formData.get("requiredOtherOfficers"), 0),
    requiredAmbulances: parseInteger(formData.get("requiredAmbulances"), 0),
    requiredMotors: parseInteger(formData.get("requiredMotors"), 0),
  });

  if (!parsed.success) {
    redirectWithAlert(parsed.error.issues?.[0]?.message || "Validasi event gagal.");
  }

  const updated = await db.medicalEvent.update({
    where: { id: eventId },
    data: {
      eventName: parsed.data.eventName,
      eventType:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LAINNYA
          ? parsed.data.eventTypeOther.trim()
          : parsed.data.eventType,
      eventTypeOther:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LAINNYA ? parsed.data.eventTypeOther.trim() : null,
      runningCategories:
        parsed.data.eventType === MEDICAL_EVENT_TYPES.LARI ? parsed.data.runningCategories : [],
      organizerName: parsed.data.organizerName || null,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      district: parsed.data.district?.trim() || "Tidak diisi",
      locationAddress: parsed.data.locationAddress,
      participantTarget: parsed.data.participantTarget,
      requiredDoctors: parsed.data.requiredDoctors,
      requiredParamedics: parsed.data.requiredParamedics,
      requiredNurses: parsed.data.requiredNurses,
      requiredOtherOfficers: parsed.data.requiredOtherOfficers,
      requiredAmbulances: parsed.data.requiredAmbulances,
      requiredMotors: parsed.data.requiredMotors,
    },
    select: { id: true, eventCode: true, eventName: true },
  });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "UPDATE",
    module: "medical_event",
    details: JSON.stringify({ eventId: updated.id, eventCode: updated.eventCode, eventName: updated.eventName }),
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(`Event ${updated.eventCode} berhasil diperbarui.`, "success");
}

export async function deleteMedicalEvent(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk menghapus event medis.");
  }

  const eventId = String(formData.get("eventId") || "").trim();
  if (!eventId) {
    redirectWithAlert("Event medis tidak valid.");
  }

  const event = await db.medicalEvent.findUnique({
    where: { id: eventId },
    select: { id: true, eventCode: true, eventName: true },
  });

  if (!event) {
    redirectWithAlert("Event medis tidak ditemukan.");
  }

  await db.medicalEvent.delete({ where: { id: eventId } });

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "DELETE",
    module: "medical_event",
    details: JSON.stringify({ eventId: event.id, eventCode: event.eventCode, eventName: event.eventName }),
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(`Event ${event.eventCode} berhasil dihapus.`, "success");
}

export async function createMedicalEventInjuryCard(formData) {
  ensureMedicalEventDelegates();

  const actor = await getCurrentSessionProfile();
  if (!actor || actor.status !== USER_STATUS.ACTIVE) {
    redirectWithAlert("Akun belum aktif untuk membuat kartu luka event.");
  }

  const eventId = String(formData.get("eventId") || "").trim();
  const postId = String(formData.get("postId") || "").trim() || null;
  const bibNumber = String(formData.get("bibNumber") || "").trim() || null;
  const victimName = String(formData.get("victimName") || "").trim();
  const gender = String(formData.get("gender") || "").trim() || null;
  const ageText = String(formData.get("age") || "").trim();
  const triageLevel = String(formData.get("triageLevel") || "").trim();
  const consciousness = String(formData.get("consciousness") || "").trim() || null;
  const chiefComplaints = parseSingleOrMulti(formData, "chiefComplaints");
  const quickActions = parseSingleOrMulti(formData, "quickActions");
  const otherFindings = parseSingleOrMulti(formData, "otherFindings");
  const kompakObat = String(formData.get("kompakObat") || "").trim() || null;
  const kompakMakanMinum = String(formData.get("kompakMakanMinum") || "").trim() || null;
  const kompakPenyakit = String(formData.get("kompakPenyakit") || "").trim() || null;
  const kompakAlergi = String(formData.get("kompakAlergi") || "").trim() || null;
  const kompakKejadian = String(formData.get("kompakKejadian") || "").trim() || null;
  const injuryType = String(formData.get("injuryType") || "").trim() || null;
  const firstAidAction = String(formData.get("firstAidAction") || "").trim() || null;
  const referralRequired = String(formData.get("referralRequired") || "") === "on";
  const referralHospital = String(formData.get("referralHospital") || "").trim() || null;
  const locationAddress = String(formData.get("locationAddress") || "").trim() || null;
  const latitude = parseNullableNumber(formData.get("latitude"));
  const longitude = parseNullableNumber(formData.get("longitude"));
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!eventId || !victimName || !Object.values(TRIAGE_LEVELS).includes(triageLevel)) {
    redirectWithAlert("Data kartu luka event tidak valid.");
  }

  const age = ageText ? Number.parseInt(ageText, 10) : null;
  if (ageText && (Number.isNaN(age) || age < 0 || age > 130)) {
    redirectWithAlert("Usia korban tidak valid.");
  }

  const event = await db.medicalEvent.findUnique({
    where: { id: eventId },
    select: { id: true, eventCode: true },
  });
  if (!event) {
    redirectWithAlert("Event medis tidak ditemukan.");
  }

  if (postId) {
    const post = await db.medicalEventPost.findFirst({
      where: { id: postId, eventId },
      select: { id: true },
    });
    if (!post) {
      redirectWithAlert("Pos event tidak valid untuk kartu luka ini.");
    }
  }

  let created = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      created = await db.medicalEventInjuryCard.create({
        data: {
          cardNumber: eventInjuryCardNumber(),
          eventId,
          postId,
          bibNumber,
          victimName,
          gender,
          age,
          triageLevel,
          consciousness,
          chiefComplaints,
          quickActions,
          otherFindings,
          kompakObat,
          kompakMakanMinum,
          kompakPenyakit,
          kompakAlergi,
          kompakKejadian,
          injuryType,
          firstAidAction,
          referralRequired,
          referralHospital,
          locationAddress,
          latitude,
          longitude,
          notes,
          officerId: actor.id,
        },
        select: {
          id: true,
          cardNumber: true,
          victimName: true,
          triageLevel: true,
        },
      });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.includes("Unique constraint failed");

      if (!isUniqueViolation || attempt === 2) {
        redirectWithAlert("Gagal menyimpan kartu luka event. Coba lagi.");
      }
    }
  }

  await createAuditLog({
    userId: actor.id,
    userName: actor.fullName,
    action: "CREATE",
    module: "medical_event_injury_card",
    details: JSON.stringify({
      eventId,
      eventCode: event.eventCode,
      cardId: created?.id,
      cardNumber: created?.cardNumber,
      victimName: created?.victimName,
      triageLevel: created?.triageLevel,
    }),
  });

  revalidatePath("/operasional/event-medis");
  redirectWithAlert(`Kartu luka ${created?.cardNumber || "event"} berhasil ditambahkan.`, "success");
}
