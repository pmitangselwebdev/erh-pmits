import { db } from "@/lib/db";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
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

  const incidents = await db.incident.findMany({
    where,
    orderBy: { reportedAt: "desc" },
    select: {
      incidentCode: true,
      reportedAt: true,
      incidentType: true,
      district: true,
      locationAddress: true,
      initialVictims: true,
      status: true,
      ambulanceRequests: {
        select: {
          requestCode: true,
          patientName: true,
          priority: true,
          status: true,
          unit: {
            select: {
              unitCode: true,
            },
          },
        },
      },
    },
  });

  const header = [
    "incident_code",
    "reported_at",
    "incident_type",
    "district",
    "location",
    "initial_victims",
    "incident_status",
    "request_code",
    "patient_name",
    "priority",
    "request_status",
    "unit_code",
  ];

  const rows = [header.join(",")];

  for (const incident of incidents) {
    if (!incident.ambulanceRequests.length) {
      rows.push(
        [
          incident.incidentCode,
          incident.reportedAt.toISOString(),
          incident.incidentType,
          incident.district,
          incident.locationAddress,
          incident.initialVictims,
          incident.status,
          "",
          "",
          "",
          "",
          "",
        ]
          .map(csvEscape)
          .join(",")
      );
      continue;
    }

    for (const requestItem of incident.ambulanceRequests) {
      rows.push(
        [
          incident.incidentCode,
          incident.reportedAt.toISOString(),
          incident.incidentType,
          incident.district,
          incident.locationAddress,
          incident.initialVictims,
          incident.status,
          requestItem.requestCode,
          requestItem.patientName,
          requestItem.priority,
          requestItem.status,
          requestItem.unit?.unitCode || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-operasional-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
