import Link from "next/link";
import { db } from "@/lib/db";

function buildQueryString(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return params.toString();
}

export default async function LaporanPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const startDate = String(resolvedSearchParams?.startDate || "").trim();
  const endDate = String(resolvedSearchParams?.endDate || "").trim();

  const where = {};
  if (startDate || endDate) {
    where.reportedAt = {};
    if (startDate) where.reportedAt.gte = new Date(startDate);
    if (endDate) {
      const inclusiveEnd = new Date(endDate);
      inclusiveEnd.setHours(23, 59, 59, 999);
      where.reportedAt.lte = inclusiveEnd;
    }
  }

  const [incidentCount, requestCount, latestIncidents] = await Promise.all([
    db.incident.count({ where }),
    db.ambulanceRequest.count({
      where:
        where.reportedAt
          ? {
              createdAt: where.reportedAt,
            }
          : undefined,
    }),
    db.incident.findMany({
      where,
      orderBy: { reportedAt: "desc" },
      take: 10,
      select: {
        id: true,
        incidentCode: true,
        reportedAt: true,
        incidentType: true,
        district: true,
        status: true,
      },
    }),
  ]);

  const queryString = buildQueryString(startDate, endDate);
  const csvUrl = `/api/laporan/operasional/csv${queryString ? `?${queryString}` : ""}`;
  const pdfUrl = `/api/laporan/operasional/pdf${queryString ? `?${queryString}` : ""}`;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Laporan</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Laporan Operasional</h1>
        <p className="mt-2 text-sm text-slate-600">
          Export laporan kejadian dan permintaan ambulance dalam format CSV atau PDF.
        </p>

        <form className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Tanggal Mulai
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Tanggal Selesai
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Terapkan Filter
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Kejadian</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{incidentCount}</p>
          </article>

          <article className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Permintaan Ambulance
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{requestCount}</p>
          </article>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={csvUrl}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Export CSV
          </Link>
          <Link
            href={pdfUrl}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            Export PDF
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 font-semibold">Kode</th>
                <th className="px-3 py-3 font-semibold">Waktu</th>
                <th className="px-3 py-3 font-semibold">Jenis</th>
                <th className="px-3 py-3 font-semibold">Kecamatan</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {latestIncidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Tidak ada data pada rentang tanggal ini.
                  </td>
                </tr>
              ) : null}

              {latestIncidents.map((incident) => (
                <tr key={incident.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-semibold text-slate-900">{incident.incidentCode}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {new Date(incident.reportedAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{incident.incidentType}</td>
                  <td className="px-3 py-3 text-slate-700">{incident.district}</td>
                  <td className="px-3 py-3 text-slate-700">{incident.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
