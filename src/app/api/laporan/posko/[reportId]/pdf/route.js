import { getCurrentSessionProfile } from "@/lib/auth";
import { OFFICER_TYPES, SYSTEM_ROLES, USER_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { generatePoskoReportPdf } from "@/lib/posko-report-export";

function canAccessReportExport(actor) {
  if (!actor || actor.status !== USER_STATUS.ACTIVE) return false;
  if (actor.role === SYSTEM_ROLES.ADMIN || actor.role === SYSTEM_ROLES.KOORDINATOR_POSKO) {
    return true;
  }
  return actor.officerType === OFFICER_TYPES.PETUGAS_POSKO;
}

function buildFilename(report) {
  const datePart = new Date(report.reportDate).toISOString().slice(0, 10);
  const typePart = report.reportType.toLowerCase();
  return `laporan-${typePart}-${datePart}-${report.reportCode}.pdf`;
}

export async function GET(_request, context) {
  try {
    const actor = await getCurrentSessionProfile();
    if (!canAccessReportExport(actor)) {
      return Response.json({ message: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const reportId = String(params?.reportId || "").trim();
    if (!reportId) {
      return Response.json({ message: "ID laporan tidak valid" }, { status: 400 });
    }

    const report = await db.poskoReport.findUnique({
      where: { id: reportId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!report) {
      return Response.json({ message: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const bytes = await generatePoskoReportPdf(report);

    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildFilename(report)}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF report:", error);
    return Response.json({ message: "Gagal generate PDF laporan" }, { status: 500 });
  }
}
