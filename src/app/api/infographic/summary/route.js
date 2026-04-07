import { db } from "@/lib/db";
import { USER_STATUS } from "@/lib/constants";

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function isAccidentType(text) {
  return /kecelakaan|laka|tabrak|kecelakaan lalu lintas/i.test(text || "");
}

function isDisasterType(text) {
  return /bencana|banjir|longsor|gempa|kebakaran|angin|puting/i.test(text || "");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function emptyRecap(startDate, endDate) {
  const rows = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    rows.push({
      date: buildDateKey(cursor),
      label: cursor.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      bencana: 0,
      kecelakaan: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
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

    const selectedDistrict = String(searchParams.get("kecamatan") || "all").trim();
    const selectedKelurahan = String(searchParams.get("kelurahan") || "all").trim();

    const districtFilter = selectedDistrict !== "all" ? selectedDistrict : null;
    const kelurahanFilter = selectedKelurahan !== "all" ? selectedKelurahan : null;

    const incidentWhere = {
      reportedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (districtFilter) {
      incidentWhere.district = districtFilter;
    }

    if (kelurahanFilter) {
      incidentWhere.locationAddress = {
        contains: kelurahanFilter,
        mode: "insensitive",
      };
    }

    const requestWhere = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (districtFilter) {
      requestWhere.pickupDistrict = districtFilter;
    }

    if (kelurahanFilter) {
      requestWhere.pickupAddress = {
        contains: kelurahanFilter,
        mode: "insensitive",
      };
    }

    const reportWhere = {
      reportType: "HARIAN",
      reportDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (districtFilter) {
      reportWhere.district = districtFilter;
    }

    if (kelurahanFilter) {
      reportWhere.locationAddress = {
        contains: kelurahanFilter,
        mode: "insensitive",
      };
    }

    const [
      incidents,
      requests,
      ambulanceCount,
      motorCount,
      relawanCount,
      relawanMaleCount,
      relawanFemaleCount,
      reports,
      bloodStockItems,
    ] =
      await Promise.all([
        db.incident.findMany({
          where: incidentWhere,
          select: {
            reportedAt: true,
            incidentType: true,
          },
        }),
        db.ambulanceRequest.findMany({
          where: requestWhere,
          select: {
            createdAt: true,
            patientCondition: true,
          },
        }),
        db.ambulanceUnit.count(),
        db.motorUnit.count(),
        db.user.count({
          where: {
            status: USER_STATUS.ACTIVE,
            isActive: true,
            NOT: [{ role: "ADMIN" }],
          },
        }),
        db.user.count({
          where: {
            status: USER_STATUS.ACTIVE,
            isActive: true,
            NOT: [{ role: "ADMIN" }],
            OR: [
              { gender: "L" },
              { gender: { equals: "LAKI-LAKI", mode: "insensitive" } },
            ],
          },
        }),
        db.user.count({
          where: {
            status: USER_STATUS.ACTIVE,
            isActive: true,
            NOT: [{ role: "ADMIN" }],
            OR: [
              { gender: "P" },
              { gender: { equals: "PEREMPUAN", mode: "insensitive" } },
            ],
          },
        }),
        db.poskoReport.findMany({
          where: reportWhere,
          orderBy: { reportDate: "desc" },
          select: {
            reportDate: true,
            payloadSnapshot: true,
          },
          take: 200,
        }),
        db.logisticItem.findMany({
          where: {
            isActive: true,
            OR: [
              { category: { contains: "darah", mode: "insensitive" } },
              { name: { contains: "darah", mode: "insensitive" } },
            ],
          },
          select: {
            name: true,
            currentStock: true,
          },
        }),
      ]);

    const recapMap = new Map(
      emptyRecap(dateFrom, dateTo).map((item) => [item.date, { ...item }])
    );

    let totalBencana = 0;
    let totalKecelakaan = 0;

    incidents.forEach((item) => {
      const key = buildDateKey(item.reportedAt);
      const entry = recapMap.get(key);
      if (!entry) return;

      if (isAccidentType(item.incidentType)) {
        entry.kecelakaan += 1;
        totalKecelakaan += 1;
      } else if (isDisasterType(item.incidentType)) {
        entry.bencana += 1;
        totalBencana += 1;
      } else {
        entry.bencana += 1;
        totalBencana += 1;
      }
    });

    requests.forEach((item) => {
      if (isAccidentType(item.patientCondition)) {
        totalKecelakaan += 1;
      }
    });

    let stokDarah = { A: 0, B: 0, AB: 0, O: 0 };
    let foundInReport = false;
    for (const report of reports) {
      const extra = report?.payloadSnapshot?.extra || {};
      if (extra.stokDarahA != null || extra.stokDarahB != null || extra.stokDarahAB != null || extra.stokDarahO != null) {
        stokDarah = {
          A: toNumber(extra.stokDarahA) ?? 0,
          B: toNumber(extra.stokDarahB) ?? 0,
          AB: toNumber(extra.stokDarahAB) ?? 0,
          O: toNumber(extra.stokDarahO) ?? 0,
        };
        foundInReport = true;
        break;
      }
      // Legacy fallback: old single-field stokDarahKantong
      const legacy = toNumber(extra.stokDarahKantong ?? extra.stokDarah);
      if (legacy !== null) {
        stokDarah = { A: 0, B: 0, AB: 0, O: legacy };
        foundInReport = true;
        break;
      }
    }

    if (!foundInReport) {
      // Fallback: aggregate from LogisticItem by blood type pattern in name
      for (const item of bloodStockItems) {
        const n = (item.name || "").toUpperCase();
        if (/GOL\.?\s*AB|GOLONGAN\s*AB|TIPE\s*AB/i.test(n)) {
          stokDarah.AB += item.currentStock;
        } else if (/GOL\.?\s*A|GOLONGAN\s*A|TIPE\s*A/i.test(n)) {
          stokDarah.A += item.currentStock;
        } else if (/GOL\.?\s*B|GOLONGAN\s*B|TIPE\s*B/i.test(n)) {
          stokDarah.B += item.currentStock;
        } else if (/GOL\.?\s*O|GOLONGAN\s*O|TIPE\s*O/i.test(n)) {
          stokDarah.O += item.currentStock;
        } else {
          // Unclassified blood stock → distribute to O as default
          stokDarah.O += item.currentStock;
        }
      }
    }

    const totalDays = Math.max(
      1,
      Math.floor((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1
    );

    return Response.json({
      success: true,
      data: {
        totalDays,
        armada: ambulanceCount + motorCount,
        armadaSiaga: ambulanceCount,
        relawan: relawanCount,
        relawanL: relawanMaleCount,
        relawanP: relawanFemaleCount,
        bencana: totalBencana,
        kecelakaan: totalKecelakaan,
        stokDarah,
        recap: Array.from(recapMap.values()),
      },
    });
  } catch (error) {
    console.error("infographic summary error", error);
    return Response.json(
      { success: false, message: "Gagal mengambil ringkasan infografis." },
      { status: 500 }
    );
  }
}
