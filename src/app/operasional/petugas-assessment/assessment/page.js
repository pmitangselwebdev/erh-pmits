import Link from "next/link";
import { getCurrentSessionProfile } from "@/lib/auth";
import { INCIDENT_STATUS, REPORT_APPROVAL_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { submitFieldAssessment } from "./actions";

function statusBadgeClass(status) {
  if (status === INCIDENT_STATUS.REPORTED) return "bg-amber-100 text-amber-700";
  if (status === INCIDENT_STATUS.ON_PROCESS) return "bg-sky-100 text-sky-700";
  if (status === INCIDENT_STATUS.HANDLED) return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

const STATUS_LABELS = {
  [INCIDENT_STATUS.REPORTED]: "Dilaporkan",
  [INCIDENT_STATUS.ON_PROCESS]: "Dalam Proses",
  [INCIDENT_STATUS.HANDLED]: "Ditangani",
  [INCIDENT_STATUS.CLOSED]: "Ditutup",
};

export default async function AssessmentLapanganPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const tab = String(resolvedSearchParams?.tab || "assessment").trim();
  const activeTab = ["assessment", "kejadian-approved"].includes(tab)
    ? tab
    : "assessment";
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const [assignedIncidents, approvedIncidents] = await Promise.all([
    db.incident.findMany({
      where: {
        status: { in: [INCIDENT_STATUS.REPORTED, INCIDENT_STATUS.ON_PROCESS] },
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
        assignedOfficerId: profile.id,
      },
      orderBy: { reportedAt: "desc" },
      take: 80,
      select: {
        id: true,
        incidentCode: true,
        incidentType: true,
        locationAddress: true,
        district: true,
        initialVictims: true,
        status: true,
        description: true,
        reportedAt: true,
        assignedOfficer: {
          select: { fullName: true },
        },
      },
    }),
    db.incident.findMany({
      where: {
        status: { not: INCIDENT_STATUS.CLOSED },
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      },
      orderBy: { reportedAt: "desc" },
      take: 100,
      select: {
        id: true,
        incidentCode: true,
        reportedAt: true,
        incidentType: true,
        district: true,
        locationAddress: true,
        status: true,
        assignedOfficer: {
          select: {
            fullName: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Operasional Petugas Assesment
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Assessment Lapangan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Perbarui data situasional kejadian dari lapangan — jumlah korban, kondisi terkini,
            dan status penanganan.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href="/operasional/petugas-assessment/assessment?tab=assessment"
              className={`app-tab-btn ${activeTab === "assessment" ? "app-tab-btn-active" : ""}`}
            >
              Assessment Lapangan
            </Link>
            <Link
              href="/operasional/petugas-assessment/assessment?tab=kejadian-approved"
              className={`app-tab-btn ${activeTab === "kejadian-approved" ? "app-tab-btn-active" : ""}`}
            >
              Kejadian Approved Posko
            </Link>
          </div>
        </section>

        {alert ? (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              alertType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {alert}
          </section>
        ) : null}

        {activeTab === "kejadian-approved" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Kejadian Approved Posko</h2>
            <p className="mt-1 text-xs text-slate-500">
              Daftar kejadian yang sudah disetujui Posko untuk referensi tim assessment.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                    <th className="px-3 py-3 font-semibold">Jenis</th>
                    <th className="px-3 py-3 font-semibold">Lokasi</th>
                    <th className="px-3 py-3 font-semibold">PIC Assessment</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Tidak ada kejadian approved saat ini.
                      </td>
                    </tr>
                  ) : null}

                  {approvedIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900 font-semibold">{incident.incidentCode}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(incident.reportedAt || Date.now()).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{incident.incidentType}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {incident.district} - {incident.locationAddress}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {incident.assignedOfficer?.fullName || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(incident.status)}`}>
                          {STATUS_LABELS[incident.status] ?? incident.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/operasional/petugas-posko/kejadian/${incident.id}`}
                          className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Login sebagai {profile.fullName} ({profile.role})
            </p>
          </section>
        ) : (
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          {/* Quick field update form */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Laporan Situasi Lapangan</h2>
            <p className="mt-1 text-xs text-slate-500">
              Perbarui data kejadian aktif berdasarkan kondisi nyata di lapangan.
            </p>

            <form action={submitFieldAssessment} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kejadian <span className="text-red-600">*</span>
                <select
                  name="incidentId"
                  required
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" disabled>— Pilih Kejadian Aktif —</option>
                  {assignedIncidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.incidentCode} · {inc.incidentType} ({inc.district})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Jumlah Korban (estimasi lapangan)
                <input
                  name="initialVictims"
                  type="number"
                  min="0"
                  max="9999"
                  defaultValue="0"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Update Status Kejadian
                <select
                  name="status"
                  defaultValue={INCIDENT_STATUS.ON_PROCESS}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Deskripsi / Catatan Lapangan
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Kondisi lokasi, temuan lapangan, kendala, dll."
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Kirim Laporan Assessment
              </button>
            </form>
          </article>

          {/* Active incidents list */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Kejadian Aktif</h2>
            <p className="mt-1 text-xs text-slate-500">
              Kejadian dengan status Dilaporkan atau Dalam Proses.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Jenis / Lokasi</th>
                    <th className="px-3 py-3 font-semibold">Korban</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Petugas</th>
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        Tidak ada kejadian aktif saat ini.
                      </td>
                    </tr>
                  ) : null}

                  {assignedIncidents.map((inc) => (
                    <tr key={inc.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <Link
                          href={`/operasional/petugas-posko/kejadian/${inc.id}`}
                          className="font-semibold hover:text-red-700"
                        >
                          {inc.incidentCode}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>{inc.incidentType}</p>
                        <p className="text-xs text-slate-500">{inc.district} — {inc.locationAddress}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{inc.initialVictims} orang</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(inc.status)}`}>
                          {STATUS_LABELS[inc.status] ?? inc.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {inc.assignedOfficer?.fullName || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {new Date(inc.reportedAt).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Login sebagai {profile.fullName} ({profile.role})
            </p>
          </article>
        </section>
        )}
      </div>
    </main>
  );
}
