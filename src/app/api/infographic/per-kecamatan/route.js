import { db } from "@/lib/db";

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function isAccidentType(text) {
  return /kecelakaan|laka|tabrak|kecelakaan lalu lintas/i.test(text || "");
}

function isDisasterType(text) {
  return /bencana|banjir|longsor|gempa|kebakaran|angin|puting/i.test(text || "");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 6);

    const dateFrom = parseDate(searchParams.get("dateFrom"), defaultFrom);
    const dateToBase = parseDate(searchParams.get("dateTo"), now);
    const dateTo = new Date(dateToBase);
    dateTo.setHours(23, 59, 59, 999);

    const [incidents, requests] = await Promise.all([
      db.incident.findMany({
        where: {
          reportedAt: { gte: dateFrom, lte: dateTo },
        },
        select: {
          incidentType: true,
          district: true,
        },
      }),
      db.ambulanceRequest.findMany({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: {
          patientCondition: true,
          pickupDistrict: true,
        },
      }),
    ]);

    const kecMap = new Map();

    const ensure = (name) => {
      const key = name.trim();
      if (!kecMap.has(key)) {
        kecMap.set(key, { bencana: 0, kecelakaan: 0, rujukan: 0 });
      }
      return kecMap.get(key);
    };

    incidents.forEach((item) => {
      const entry = ensure(item.district);
      if (isAccidentType(item.incidentType)) {
        entry.kecelakaan += 1;
      } else if (isDisasterType(item.incidentType)) {
        entry.bencana += 1;
      } else {
        entry.bencana += 1;
      }
    });

    requests.forEach((item) => {
      const entry = ensure(item.pickupDistrict);
      entry.rujukan += 1;
      if (isAccidentType(item.patientCondition)) {
        entry.kecelakaan += 1;
      }
    });

    const result = {};
    for (const [name, counts] of kecMap) {
      result[name] = counts;
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("per-kecamatan summary error", error);
    return Response.json(
      { success: false, message: "Gagal mengambil data per kecamatan." },
      { status: 500 }
    );
  }
}
