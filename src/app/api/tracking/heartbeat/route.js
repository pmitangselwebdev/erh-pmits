import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  AMBULANCE_REQUEST_STATUS,
  OFFICER_TYPES,
  USER_STATUS,
} from "@/lib/constants";

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validRange(latitude, longitude) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

async function resolveAmbulanceUnitId(profileId, preferredUnitId) {
  if (preferredUnitId) return preferredUnitId;

  const activeStatuses = [
    AMBULANCE_REQUEST_STATUS.MENUNGGU,
    AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN,
    AMBULANCE_REQUEST_STATUS.PASIEN_DIANGKUT,
  ];

  const activeRequest = await db.ambulanceRequest.findFirst({
    where: {
      status: { in: activeStatuses },
      unitId: { not: null },
      OR: [
        { assignedResponderId: profileId },
        { responders: { some: { userId: profileId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      unitId: true,
    },
  });

  return activeRequest?.unitId || null;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        status: true,
        isActive: true,
        officerType: true,
      },
    });

    if (!actor || actor.status !== USER_STATUS.ACTIVE || !actor.isActive) {
      return Response.json(
        { success: false, message: "Akun belum aktif untuk mengirim lokasi." },
        { status: 403 }
      );
    }

    const payload = await req.json();
    const latitude = parseCoordinate(payload?.latitude);
    const longitude = parseCoordinate(payload?.longitude);
    const requestedUnitId = String(payload?.unitId || "").trim() || null;

    if (latitude === null || longitude === null || !validRange(latitude, longitude)) {
      return Response.json(
        { success: false, message: "Koordinat latitude/longitude tidak valid." },
        { status: 400 }
      );
    }

    const now = new Date();
    const updatedUser = await db.user.update({
      where: { id: actor.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationAt: now,
      },
      select: {
        id: true,
        lastLocationAt: true,
      },
    });

    let updatedUnit = null;
    if (actor.officerType === OFFICER_TYPES.PETUGAS_AMBULANCE) {
      const targetUnitId = await resolveAmbulanceUnitId(actor.id, requestedUnitId);
      if (targetUnitId) {
        updatedUnit = await db.ambulanceUnit.update({
          where: { id: targetUnitId },
          data: {
            lastLatitude: latitude,
            lastLongitude: longitude,
            lastLocationAt: now,
          },
          select: {
            id: true,
            unitCode: true,
            lastLocationAt: true,
          },
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        userId: updatedUser.id,
        userLocationAt: updatedUser.lastLocationAt,
        unit: updatedUnit?.id
          ? {
              id: updatedUnit.id,
              unitCode: updatedUnit.unitCode,
              locationAt: updatedUnit.lastLocationAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("tracking heartbeat error", error);
    return Response.json(
      { success: false, message: "Terjadi kesalahan server saat update lokasi." },
      { status: 500 }
    );
  }
}
