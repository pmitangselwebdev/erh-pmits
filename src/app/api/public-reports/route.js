import { createBulkNotifications } from "@/lib/notification";
import { db } from "@/lib/db";
import {
  AMBULANCE_REQUEST_STATUS,
  OFFICER_TYPES,
  REPORT_APPROVAL_STATUS,
  USER_STATUS,
} from "@/lib/constants";
import { createIncidentSchema } from "@/lib/validations/incident";
import { createAmbulanceRequestSchema } from "@/lib/validations/ambulance-request";

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

async function getPoskoNotifierIds() {
  const rows = await db.user.findMany({
    where: {
      status: USER_STATUS.ACTIVE,
      isActive: true,
      OR: [
        { role: "ADMIN" },
        { role: "KOORDINATOR_POSKO" },
        { officerType: OFFICER_TYPES.PETUGAS_POSKO },
      ],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const type = String(payload?.type || "").trim();

    if (type === "INCIDENT") {
      const parsed = createIncidentSchema.safeParse({
        sourceReport: "Masyarakat (Web Lapor)",
        reporterName: String(payload?.reporterName || "").trim(),
        reporterPhone: String(payload?.reporterPhone || "").trim(),
        incidentType: String(payload?.incidentType || "").trim(),
        locationAddress: String(payload?.locationAddress || "").trim(),
        district: String(payload?.district || "").trim(),
        description: String(payload?.description || "").trim(),
        initialVictims: Number(payload?.initialVictims || 0),
        latitude:
          payload?.latitude === null || payload?.latitude === undefined || payload?.latitude === ""
            ? null
            : Number(payload.latitude),
        longitude:
          payload?.longitude === null || payload?.longitude === undefined || payload?.longitude === ""
            ? null
            : Number(payload.longitude),
      });

      if (!parsed.success) {
        return Response.json(
          { success: false, message: parsed.error.issues?.[0]?.message || "Validasi gagal." },
          { status: 400 }
        );
      }

      const incident = await db.incident.create({
        data: {
          incidentCode: buildIncidentCode(),
          reportedAt: new Date(),
          sourceReport: parsed.data.sourceReport,
          reporterName: parsed.data.reporterName || null,
          reporterPhone: parsed.data.reporterPhone || null,
          incidentType: parsed.data.incidentType,
          locationAddress: parsed.data.locationAddress,
          district: parsed.data.district,
          description: parsed.data.description || null,
          initialVictims: parsed.data.initialVictims,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          isPublicReport: true,
          approvalStatus: REPORT_APPROVAL_STATUS.PENDING,
        },
        select: { incidentCode: true },
      });

      const notifierIds = await getPoskoNotifierIds();
      await createBulkNotifications({
        userIds: notifierIds,
        title: "Laporan Masyarakat Masuk",
        message: `Laporan kejadian ${incident.incidentCode} menunggu validasi/approval posko.`,
        category: "PUBLIC_INCIDENT",
      });

      return Response.json({
        success: true,
        message: `Laporan kejadian berhasil dikirim. Kode: ${incident.incidentCode}`,
      });
    }

    if (type === "AMBULANCE") {
      const callerName = String(payload?.callerName || "").trim();
      const callerPhone = String(payload?.callerPhone || "").trim();
      const condition = String(payload?.patientCondition || "").trim();

      const parsed = createAmbulanceRequestSchema.safeParse({
        patientName: String(payload?.patientName || "").trim(),
        patientAge:
          payload?.patientAge === null || payload?.patientAge === undefined || payload?.patientAge === ""
            ? null
            : Number(payload.patientAge),
        patientGender: String(payload?.patientGender || "").trim(),
        patientCondition:
          [condition, callerName ? `Pelapor: ${callerName}` : null, callerPhone ? `Kontak: ${callerPhone}` : null]
            .filter(Boolean)
            .join(" | "),
        pickupAddress: String(payload?.pickupAddress || "").trim(),
        pickupDistrict: String(payload?.pickupDistrict || "").trim(),
        destinationType: String(payload?.destinationType || "").trim(),
        destinationName: String(payload?.destinationName || "").trim(),
        priority: String(payload?.priority || "HIGH").trim(),
        pickupLatitude:
          payload?.pickupLatitude === null || payload?.pickupLatitude === undefined || payload?.pickupLatitude === ""
            ? null
            : Number(payload.pickupLatitude),
        pickupLongitude:
          payload?.pickupLongitude === null || payload?.pickupLongitude === undefined || payload?.pickupLongitude === ""
            ? null
            : Number(payload.pickupLongitude),
        incidentId: "",
        unitId: "",
      });

      if (!parsed.success) {
        return Response.json(
          { success: false, message: parsed.error.issues?.[0]?.message || "Validasi gagal." },
          { status: 400 }
        );
      }

      const request = await db.ambulanceRequest.create({
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
          status: AMBULANCE_REQUEST_STATUS.MENUNGGU,
          isPublicRequest: true,
          approvalStatus: REPORT_APPROVAL_STATUS.PENDING,
        },
        select: { requestCode: true },
      });

      const notifierIds = await getPoskoNotifierIds();
      await createBulkNotifications({
        userIds: notifierIds,
        title: "Permintaan Ambulance Masuk",
        message: `Permintaan ${request.requestCode} menunggu validasi/approval posko.`,
        category: "PUBLIC_AMBULANCE_REQUEST",
      });

      return Response.json({
        success: true,
        message: `Permintaan ambulance berhasil dikirim. Kode: ${request.requestCode}`,
      });
    }

    return Response.json({ success: false, message: "Tipe laporan tidak valid." }, { status: 400 });
  } catch (error) {
    console.error("public report error", error);
    return Response.json({ success: false, message: "Terjadi kesalahan server." }, { status: 500 });
  }
}
