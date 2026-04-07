import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = parseDate(searchParams.get("startDate"));
  const endDate = parseDate(searchParams.get("endDate"));

  const where = {};
  if (startDate || endDate) {
    where.reportedAt = {};
    if (startDate) where.reportedAt.gte = startDate;
    if (endDate) {
      const inclusiveEnd = new Date(endDate);
      inclusiveEnd.setHours(23, 59, 59, 999);
      where.reportedAt.lte = inclusiveEnd;
    }
  }

  const [incidentCount, activeIncidentCount, requestCount, completedRequestCount] =
    await Promise.all([
      db.incident.count({ where }),
      db.incident.count({
        where: {
          ...where,
          status: { in: ["REPORTED", "ON_PROCESS"] },
        },
      }),
      db.ambulanceRequest.count({
        where:
          where.reportedAt
            ? {
                createdAt: where.reportedAt,
              }
            : undefined,
      }),
      db.ambulanceRequest.count({
        where: {
          ...(where.reportedAt
            ? {
                createdAt: where.reportedAt,
              }
            : {}),
          status: "SELESAI",
        },
      }),
    ]);

  const incidents = await db.incident.findMany({
    where,
    orderBy: { reportedAt: "desc" },
    take: 20,
    select: {
      incidentCode: true,
      reportedAt: true,
      incidentType: true,
      district: true,
      status: true,
      ambulanceRequests: {
        select: {
          requestCode: true,
          status: true,
        },
      },
    },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 40;

  page.drawText("Laporan Operasional SIM Posko PMI", {
    x: left,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 24;

  const rangeLabel = `${startDate ? formatDate(startDate) : "Awal"} - ${
    endDate ? formatDate(endDate) : "Sekarang"
  }`;

  page.drawText(`Periode: ${rangeLabel}`, {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 18;

  const summary = [
    `Total Kejadian: ${incidentCount}`,
    `Kejadian Aktif: ${activeIncidentCount}`,
    `Total Permintaan Ambulance: ${requestCount}`,
    `Permintaan Selesai: ${completedRequestCount}`,
  ];

  for (const line of summary) {
    page.drawText(line, {
      x: left,
      y,
      size: 11,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 16;
  }

  y -= 8;
  page.drawText("20 Kejadian Terbaru", {
    x: left,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 16;

  for (const incident of incidents) {
    if (y < 70) break;

    const line = `${incident.incidentCode} | ${formatDate(incident.reportedAt)} | ${incident.incidentType} | ${incident.district} | ${incident.status}`;
    page.drawText(line.slice(0, 105), {
      x: left,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 13;

    if (incident.ambulanceRequests.length) {
      const requestLabels = incident.ambulanceRequests
        .slice(0, 3)
        .map((item) => `${item.requestCode} (${item.status})`)
        .join(", ");

      page.drawText(`  Ambulance: ${requestLabels}`.slice(0, 110), {
        x: left,
        y,
        size: 8,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= 12;
    }
  }

  const bytes = await pdf.save();

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-operasional-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf"`,
    },
  });
}
