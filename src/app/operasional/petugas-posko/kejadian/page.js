import Link from "next/link";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  AMBULANCE_REQUEST_STATUS,
  INCIDENT_STATUS,
  POSKO_REPORT_TYPES,
  REPORT_APPROVAL_STATUS,
  TANGSEL_KECAMATAN_OPTIONS,
  TANGSEL_WILAYAH,
} from "@/lib/constants";
import { db } from "@/lib/db";
import GpsLocationButton from "@/components/gps-location-button";
import {
  approvePublicIncident,
  approvePublicAmbulanceRequestByPosko,
  assignAssessmentOfficer,
  createIncident,
  createAmbulanceRequestByPosko,
  createPoskoReport,
  deleteAmbulanceRequestByPosko,
  deleteIncident,
  rejectPublicAmbulanceRequestByPosko,
  rejectPublicIncident,
  updateIncidentStatus,
} from "./actions";

function buildIncidentWhere(searchParams) {
  const query = String(searchParams?.q || "").trim();
  const status = String(searchParams?.status || "").trim();

  const where = {};

  if (query) {
    where.OR = [
      { incidentCode: { contains: query, mode: "insensitive" } },
      { incidentType: { contains: query, mode: "insensitive" } },
      { locationAddress: { contains: query, mode: "insensitive" } },
      { district: { contains: query, mode: "insensitive" } },
    ];
  }

  if (Object.values(INCIDENT_STATUS).includes(status)) {
    where.status = status;
  }

  return where;
}

function getStatusBadgeClass(status) {
  if (status === INCIDENT_STATUS.REPORTED) {
    return "bg-sky-100 text-sky-700";
  }
  if (status === INCIDENT_STATUS.ON_PROCESS) {
    return "bg-amber-100 text-amber-700";
  }
  if (status === INCIDENT_STATUS.HANDLED) {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-slate-100 text-slate-700";
}

function getApprovalBadgeClass(status) {
  if (status === REPORT_APPROVAL_STATUS.APPROVED) return "bg-emerald-100 text-emerald-700";
  if (status === REPORT_APPROVAL_STATUS.REJECTED) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default async function KejadianListPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const tab = String(resolvedSearchParams?.tab || "kejadian").trim();
  const activeTab = ["kejadian", "permintaan", "laporan-harian", "situasi"].includes(tab)
    ? tab
    : "kejadian";
  const selectedIncidentId = String(resolvedSearchParams?.incidentId || "").trim();
  const where = buildIncidentWhere(resolvedSearchParams);

  const incidents = await db.incident.findMany({
    where,
    orderBy: { reportedAt: "desc" },
    take: 50,
    select: {
      id: true,
      incidentCode: true,
      reportedAt: true,
      incidentType: true,
      district: true,
      locationAddress: true,
      initialVictims: true,
      status: true,
      isPublicReport: true,
      approvalStatus: true,
      approvalNote: true,
      assignedOfficer: {
        select: {
          fullName: true,
        },
      },
    },
  });

  const [assessmentOfficers, requests, poskoReports] = await Promise.all([
    db.user.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
        officerType: "PETUGAS_ASSESSMENT",
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
      },
    }),
    db.ambulanceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        requestCode: true,
        patientName: true,
        pickupDistrict: true,
        destinationName: true,
        priority: true,
        status: true,
        isPublicRequest: true,
        approvalStatus: true,
        approvalNote: true,
        createdAt: true,
        incident: {
          select: {
            id: true,
            incidentCode: true,
          },
        },
      },
    }),
    db.poskoReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        reportCode: true,
        reportType: true,
        status: true,
        title: true,
        reportDate: true,
        district: true,
        createdAt: true,
        createdBy: {
          select: {
            fullName: true,
          },
        },
      },
    }),
  ]);

  const today = new Date();
  const todayKey = today.toDateString();
  const todayIncidents = incidents.filter(
    (item) => new Date(item.reportedAt).toDateString() === todayKey
  );
  const todayRequests = requests.filter(
    (item) => new Date(item.createdAt).toDateString() === todayKey
  );
  const activeIncidents = incidents.filter(
    (item) =>
      item.approvalStatus === REPORT_APPROVAL_STATUS.APPROVED &&
      item.status !== INCIDENT_STATUS.CLOSED
  );
  const waitingRequests = requests.filter(
    (item) => item.status === AMBULANCE_REQUEST_STATUS.MENUNGGU
  );
  const inProgressRequests = requests.filter(
    (item) => item.status === AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN
  );

  const todayDateInput = new Date().toISOString().slice(0, 10);
  const laporanHarianHistory = poskoReports.filter(
    (item) => item.reportType === POSKO_REPORT_TYPES.HARIAN
  );
  const laporanSituasiHistory = poskoReports.filter(
    (item) => item.reportType === POSKO_REPORT_TYPES.SITUASI
  );

  const selectedIncident = selectedIncidentId
    ? incidents.find((inc) => inc.id === selectedIncidentId) ?? null
    : null;

  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();
  const kelurahanOptions = Object.entries(TANGSEL_WILAYAH);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Operasional Posko
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Daftar Kejadian</h1>
          <p className="mt-2 text-sm text-slate-600">
            Catat kejadian lapangan, monitor progres penanganan, dan sinkronkan status
            dengan tim operasional.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/operasional/petugas-posko/kejadian?tab=kejadian"
              className={`app-tab-btn ${activeTab === "kejadian" ? "app-tab-btn-active" : ""}`}
            >
              Kejadian
            </Link>
            <Link
              href="/operasional/petugas-posko/kejadian?tab=permintaan"
              className={`app-tab-btn ${activeTab === "permintaan" ? "app-tab-btn-active" : ""}`}
            >
              Permintaan Ambulance
            </Link>
            <Link
              href="/operasional/petugas-posko/kejadian?tab=laporan-harian"
              className={`app-tab-btn ${activeTab === "laporan-harian" ? "app-tab-btn-active" : ""}`}
            >
              Laporan Harian
            </Link>
            <Link
              href="/operasional/petugas-posko/kejadian?tab=situasi"
              className={`app-tab-btn ${activeTab === "situasi" ? "app-tab-btn-active" : ""}`}
            >
              Situasi
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

        {activeTab === "kejadian" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          {selectedIncident ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Detail Kejadian</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">{selectedIncident.incidentCode}</h2>
              </div>
              <Link
                href="?tab=kejadian"
                className="flex-shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                ← Input Baru
              </Link>
            </div>

            <dl className="mt-4 space-y-0 divide-y divide-slate-100 text-sm">
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">Jenis</dt>
                <dd className="text-slate-900">{selectedIncident.incidentType}</dd>
              </div>
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">Lokasi</dt>
                <dd className="text-slate-900">{selectedIncident.district} · {selectedIncident.locationAddress}</dd>
              </div>
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">Korban</dt>
                <dd className="text-slate-900">{selectedIncident.initialVictims} orang</dd>
              </div>
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">Approval</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getApprovalBadgeClass(selectedIncident.approvalStatus)}`}>
                    {selectedIncident.approvalStatus}
                  </span>
                  {selectedIncident.approvalNote ? (
                    <p className="mt-0.5 text-xs text-slate-500">{selectedIncident.approvalNote}</p>
                  ) : null}
                </dd>
              </div>
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">Status</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </dd>
              </div>
              <div className="flex gap-2 py-2">
                <dt className="w-28 flex-shrink-0 font-medium text-slate-500">PIC Assessment</dt>
                <dd className="text-slate-900">{selectedIncident.assignedOfficer?.fullName || "—"}</dd>
              </div>
            </dl>

            {selectedIncident.isPublicReport && selectedIncident.approvalStatus === REPORT_APPROVAL_STATUS.PENDING ? (
              <div className="mt-5 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800">Laporan Publik — Menunggu Persetujuan</p>
                <form action={approvePublicIncident}>
                  <input type="hidden" name="incidentId" value={selectedIncident.id} />
                  <button type="submit" className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                    ✓ Approve Laporan
                  </button>
                </form>
                <form action={rejectPublicIncident} className="flex gap-2">
                  <input type="hidden" name="incidentId" value={selectedIncident.id} />
                  <input name="approvalNote" placeholder="Alasan penolakan..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  <button type="submit" className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800">
                    Tolak
                  </button>
                </form>
              </div>
            ) : null}

            {selectedIncident.approvalStatus === REPORT_APPROVAL_STATUS.APPROVED ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Tugaskan Petugas Assessment</p>
                <form action={assignAssessmentOfficer} className="flex gap-2">
                  <input type="hidden" name="incidentId" value={selectedIncident.id} />
                  <select name="officerId" defaultValue="" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
                    <option value="">— Pilih Petugas —</option>
                    {assessmentOfficers.map((officer) => (
                      <option key={officer.id} value={officer.id}>{officer.fullName}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                    Tugaskan
                  </button>
                </form>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Update Status</p>
              <form action={updateIncidentStatus} className="flex gap-2">
                <input type="hidden" name="incidentId" value={selectedIncident.id} />
                <select name="nextStatus" defaultValue={selectedIncident.status} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
                  {Object.values(INCIDENT_STATUS).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Simpan
                </button>
              </form>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/operasional/petugas-posko/kejadian/${selectedIncident.id}/edit`}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Edit Kejadian
              </Link>
              <Link
                href={`?tab=permintaan&incidentId=${selectedIncident.id}`}
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Buat Permintaan Ambulance
              </Link>
              <Link
                href={`/operasional/petugas-posko/kejadian/${selectedIncident.id}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Halaman Detail
              </Link>
            </div>
          </article>
          ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Input Kejadian Baru</h2>
            <p className="mt-1 text-xs text-slate-500">
              Petugas aktif dapat langsung menambahkan laporan kejadian.
            </p>

            <form action={createIncident} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Sumber Laporan
                <input
                  required
                  name="sourceReport"
                  placeholder="Telepon / WA / Datang Langsung"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Pelapor
                <input
                  name="reporterName"
                  placeholder="Opsional"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nomor Pelapor
                <input
                  name="reporterPhone"
                  placeholder="08xxxxxxxxxx"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Jenis Kejadian
                <input
                  required
                  name="incidentType"
                  placeholder="Kecelakaan Lalu Lintas"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kecamatan
                <select
                  required
                  name="district"
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" disabled>
                    Pilih Kecamatan
                  </option>
                  {TANGSEL_KECAMATAN_OPTIONS.map((kecamatan) => (
                    <option key={`incident-${kecamatan}`} value={kecamatan}>
                      {kecamatan}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kelurahan
                <select
                  required
                  name="kelurahan"
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" disabled>
                    Pilih Kelurahan
                  </option>
                  {kelurahanOptions.map(([kecamatan, kelurahanList]) => (
                    <optgroup key={`incident-kel-${kecamatan}`} label={kecamatan}>
                      {kelurahanList.map((kelurahan) => (
                        <option key={`incident-${kecamatan}-${kelurahan}`} value={kelurahan}>
                          {kelurahan}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Alamat Lokasi
                <textarea
                  required
                  name="locationAddress"
                  rows={2}
                  placeholder="Alamat detail titik kejadian"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Jumlah Korban
                  <input
                    name="initialVictims"
                    type="number"
                    min="0"
                    defaultValue="0"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Latitude
                  <input
                    id="incident-latitude"
                    name="latitude"
                    placeholder="-6.307"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Longitude
                  <input
                    id="incident-longitude"
                    name="longitude"
                    placeholder="106.719"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <GpsLocationButton
                latitudeId="incident-latitude"
                longitudeId="incident-longitude"
                buttonClassName="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              />

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Keterangan
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Ringkasan kondisi awal kejadian"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Simpan Kejadian
              </button>
            </form>
          </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Daftar Laporan</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Menampilkan maksimal 50 data kejadian terbaru.
                </p>
              </div>

              <form className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={String(resolvedSearchParams?.q || "")}
                  placeholder="Cari kode, jenis, alamat..."
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <select
                  name="status"
                  defaultValue={String(resolvedSearchParams?.status || "")}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Semua Status</option>
                  {Object.values(INCIDENT_STATUS).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Filter
                </button>
              </form>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                    <th className="px-3 py-3 font-semibold">Jenis</th>
                    <th className="px-3 py-3 font-semibold">Lokasi</th>
                    <th className="px-3 py-3 font-semibold">Approval</th>
                    <th className="px-3 py-3 font-semibold">PIC</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        Belum ada data kejadian.
                      </td>
                    </tr>
                  ) : null}

                  {incidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <Link
                          href={`/operasional/petugas-posko/kejadian/${incident.id}`}
                          className="font-semibold text-slate-900 hover:text-red-700"
                        >
                          {incident.incidentCode}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(incident.reportedAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{incident.incidentType}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {incident.district} · {incident.locationAddress}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getApprovalBadgeClass(
                            incident.approvalStatus
                          )}`}
                        >
                          {incident.approvalStatus}
                        </span>
                        {incident.approvalNote ? (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                            {incident.approvalNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {incident.assignedOfficer?.fullName || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`?tab=kejadian&incidentId=${incident.id}`}
                            className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Detail
                          </Link>

                          {incident.isPublicReport &&
                          incident.approvalStatus === REPORT_APPROVAL_STATUS.PENDING ? (
                            <form action={approvePublicIncident}>
                              <input type="hidden" name="incidentId" value={incident.id} />
                              <button
                                type="submit"
                                className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Approve
                              </button>
                            </form>
                          ) : null}

                          <Link
                            href={`/operasional/petugas-posko/kejadian/${incident.id}/edit`}
                            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Edit
                          </Link>

                          <form action={deleteIncident}>
                            <input type="hidden" name="incidentId" value={incident.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Hapus
                            </button>
                          </form>
                        </div>
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
        ) : activeTab === "permintaan" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Input Permintaan Ambulance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Semua permintaan ambulance dipusatkan melalui Posko.
            </p>

            <form action={createAmbulanceRequestByPosko} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kejadian Terkait (Opsional)
                <select
                  name="incidentId"
                  defaultValue={selectedIncidentId}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Tanpa Kejadian</option>
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.incidentCode} · {incident.incidentType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Pasien
                <input
                  required
                  name="patientName"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Usia
                  <input
                    name="patientAge"
                    type="number"
                    min="0"
                    max="120"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Jenis Kelamin
                  <input
                    name="patientGender"
                    placeholder="L / P"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kondisi Pasien
                <textarea
                  name="patientCondition"
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Alamat Pickup
                <textarea
                  required
                  name="pickupAddress"
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kecamatan Pickup
                <select
                  required
                  name="pickupDistrict"
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" disabled>
                    Pilih Kecamatan Pickup
                  </option>
                  {TANGSEL_KECAMATAN_OPTIONS.map((kecamatan) => (
                    <option key={`pickup-${kecamatan}`} value={kecamatan}>
                      {kecamatan}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kelurahan Pickup
                <select
                  required
                  name="pickupKelurahan"
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="" disabled>
                    Pilih Kelurahan Pickup
                  </option>
                  {kelurahanOptions.map(([kecamatan, kelurahanList]) => (
                    <optgroup key={`pickup-kel-${kecamatan}`} label={kecamatan}>
                      {kelurahanList.map((kelurahan) => (
                        <option key={`pickup-${kecamatan}-${kelurahan}`} value={kelurahan}>
                          {kelurahan}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Jenis Tujuan
                  <input
                    required
                    name="destinationType"
                    placeholder="Rumah Sakit"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Nama Tujuan
                  <input
                    required
                    name="destinationName"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Prioritas
                <select
                  name="priority"
                  defaultValue="HIGH"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Latitude Pickup
                  <input
                    name="pickupLatitude"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Longitude Pickup
                  <input
                    name="pickupLongitude"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Simpan Permintaan
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Permintaan Ambulance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Semua permintaan dari masyarakat dan input internal Posko.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                    <th className="px-3 py-3 font-semibold">Pasien</th>
                    <th className="px-3 py-3 font-semibold">Pickup</th>
                    <th className="px-3 py-3 font-semibold">Tujuan</th>
                    <th className="px-3 py-3 font-semibold">Approval</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                        Belum ada permintaan ambulance.
                      </td>
                    </tr>
                  ) : null}

                  {requests.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <p className="font-semibold">{item.requestCode}</p>
                        {item.incident ? (
                          <Link
                            href={`/operasional/petugas-posko/kejadian/${item.incident.id}`}
                            className="text-xs text-slate-600 hover:text-red-700"
                          >
                            {item.incident.incidentCode}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(item.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.patientName}
                        <p className="text-xs text-slate-500">Prioritas: {item.priority}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.pickupDistrict}</td>
                      <td className="px-3 py-3 text-slate-700">{item.destinationName}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getApprovalBadgeClass(
                            item.approvalStatus
                          )}`}
                        >
                          {item.approvalStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2">
                          {item.isPublicRequest && item.approvalStatus === REPORT_APPROVAL_STATUS.PENDING ? (
                            <>
                              <form action={approvePublicAmbulanceRequestByPosko}>
                                <input type="hidden" name="requestId" value={item.id} />
                                <button
                                  type="submit"
                                  className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Approve
                                </button>
                              </form>

                              <form action={rejectPublicAmbulanceRequestByPosko} className="flex gap-2">
                                <input type="hidden" name="requestId" value={item.id} />
                                <input
                                  name="approvalNote"
                                  placeholder="Alasan tolak"
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                />
                                <button
                                  type="submit"
                                  className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Reject
                                </button>
                              </form>
                            </>
                          ) : null}

                          <form action={deleteAmbulanceRequestByPosko}>
                            <input type="hidden" name="requestId" value={item.id} />
                            <button
                              type="submit"
                              className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Hapus
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
        ) : activeTab === "laporan-harian" ? (
        <section className="grid gap-6">
          <article className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kejadian Hari Ini</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{todayIncidents.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permintaan Hari Ini</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{todayRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Antrian Menunggu</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{waitingRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dalam Perjalanan</p>
              <p className="mt-2 text-2xl font-bold text-sky-700">{inProgressRequests.length}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Buat Laporan Kegiatan Harian</h2>
            <p className="mt-1 text-xs text-slate-500">
              Isi sesuai dengan poin-poin laporan kegiatan. Data kejadian/permintaan dapat disertakan sebagai lampiran.
            </p>

            <form action={createPoskoReport} className="mt-4 grid gap-5">
              <input type="hidden" name="reportType" value={POSKO_REPORT_TYPES.HARIAN} />

              {/* 1. Nama Kegiatan */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                1. Nama Kegiatan
                <input
                  name="title"
                  placeholder="Nama kegiatan yang dilaporkan"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  required
                />
              </label>

              {/* 2. Tempat dan Tanggal */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">2. Tempat dan Tanggal Pelaksanaan</legend>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kecamatan
                    <select
                      name="district"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    >
                      <option value="" disabled>
                        Pilih Kecamatan
                      </option>
                      {TANGSEL_KECAMATAN_OPTIONS.map((kecamatan) => (
                        <option key={`harian-${kecamatan}`} value={kecamatan}>
                          {kecamatan}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kelurahan
                    <select
                      name="kelurahan"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    >
                      <option value="" disabled>
                        Pilih Kelurahan
                      </option>
                      {kelurahanOptions.map(([kecamatan, kelurahanList]) => (
                        <optgroup key={`harian-kel-${kecamatan}`} label={kecamatan}>
                          {kelurahanList.map((kelurahan) => (
                            <option key={`harian-${kecamatan}-${kelurahan}`} value={kelurahan}>
                              {kelurahan}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Tanggal Pelaksanaan
                    <input
                      type="date"
                      name="reportDate"
                      defaultValue={todayDateInput}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    />
                  </label>
                </div>
              </fieldset>

              {/* 3. Anggaran */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">3. Anggaran (Rp)</legend>
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Persekot
                    <input
                      type="number"
                      name="anggaranPersekot"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Realisasi
                    <input
                      type="number"
                      name="anggaranRealisasi"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Stok Darah Gol. A (Kantong)
                    <input
                      type="number"
                      name="stokDarahA"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Stok Darah Gol. B (Kantong)
                    <input
                      type="number"
                      name="stokDarahB"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Stok Darah Gol. AB (Kantong)
                    <input
                      type="number"
                      name="stokDarahAB"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Stok Darah Gol. O (Kantong)
                    <input
                      type="number"
                      name="stokDarahO"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-400">Saldo = Persekot − Realisasi (dihitung otomatis di dokumen)</p>
              </fieldset>

              {/* 4. Jumlah Peserta */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                4. Jumlah Peserta
                <input
                  type="number"
                  name="jumlahPeserta"
                  min="0"
                  placeholder="0"
                  className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* 5. Hasil-hasil Kegiatan */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                5. Hasil-hasil Kegiatan
                <textarea
                  name="operationalSummary"
                  rows={4}
                  placeholder="Uraikan hasil-hasil yang dicapai"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* 6. Kendala */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                6. Kendala / Masalah yang Dihadapi
                <textarea
                  name="resourceNeeds"
                  rows={3}
                  placeholder="Kendala dan masalah yang ditemui"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* 7. Solusi */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                7. Solusi yang Dilakukan / Diambil
                <textarea
                  name="recommendation"
                  rows={3}
                  placeholder="Solusi yang sudah diambil atas kendala"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* 8. Saran */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                8. Saran-saran Perbaikan
                <textarea
                  name="saran"
                  rows={3}
                  placeholder="Saran perbaikan untuk kegiatan berikutnya"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* 9. Tindak Lanjut */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                9. Tindak Lanjut yang Diperlukan
                <textarea
                  name="tindakLanjut"
                  rows={3}
                  placeholder="Tindak lanjut yang perlu dilakukan"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* Pilih Kejadian & Permintaan */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lampirkan Kejadian (Hari Ini)
                  </p>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto text-sm">
                    {todayIncidents.length === 0 ? (
                      <p className="text-slate-500">Belum ada kejadian hari ini.</p>
                    ) : (
                      todayIncidents.map((incident) => (
                        <label key={incident.id} className="flex items-start gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            name="selectedIncidentIds"
                            value={incident.id}
                            className="mt-0.5"
                          />
                          <span>
                            {incident.incidentCode} · {incident.incidentType} · {incident.district}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lampirkan Permintaan Ambulance (Hari Ini)
                  </p>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto text-sm">
                    {todayRequests.length === 0 ? (
                      <p className="text-slate-500">Belum ada permintaan hari ini.</p>
                    ) : (
                      todayRequests.map((item) => (
                        <label key={item.id} className="flex items-start gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            name="selectedRequestIds"
                            value={item.id}
                            className="mt-0.5"
                          />
                          <span>
                            {item.requestCode} · {item.patientName} · {item.priority}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="submitMode"
                  value="draft"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Simpan Draft
                </button>
                <button
                  type="submit"
                  name="submitMode"
                  value="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Submit Laporan
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Riwayat Laporan Harian</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Judul</th>
                    <th className="px-3 py-3 font-semibold">Kecamatan</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Pembuat</th>
                    <th className="px-3 py-3 font-semibold">Generate</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanHarianHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Belum ada laporan harian.
                      </td>
                    </tr>
                  ) : null}
                  {laporanHarianHistory.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-slate-900">{report.reportCode}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(report.reportDate).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{report.title}</td>
                      <td className="px-3 py-3 text-slate-700">{report.district}</td>
                      <td className="px-3 py-3 text-slate-700">{report.status}</td>
                      <td className="px-3 py-3 text-slate-700">{report.createdBy?.fullName || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/api/laporan/posko/${report.id}/docx`}
                            className="rounded-md bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            DOCX
                          </Link>
                          <Link
                            href={`/api/laporan/posko/${report.id}/pdf`}
                            className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            PDF
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
        ) : (
        <section className="grid gap-6">
          <article className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kejadian Aktif</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeIncidents.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permintaan Menunggu</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{waitingRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permintaan Dalam Proses</p>
              <p className="mt-2 text-2xl font-bold text-sky-700">{inProgressRequests.length}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Buat Laporan Situasi Awal Bencana</h2>
            <p className="mt-1 text-xs text-slate-500">
              Laporan situasi bencana yang mencakup dampak, mobilisasi SDM PMI, dan kebutuhan.
            </p>

            <form action={createPoskoReport} className="mt-4 grid gap-5">
              <input type="hidden" name="reportType" value={POSKO_REPORT_TYPES.SITUASI} />

              {/* Header Info */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Informasi Kejadian</legend>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Jenis Bencana
                    <input
                      name="title"
                      placeholder="Banjir / Longsor / Kebakaran..."
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kecamatan
                    <select
                      name="district"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    >
                      <option value="" disabled>
                        Pilih Kecamatan
                      </option>
                      {TANGSEL_KECAMATAN_OPTIONS.map((kecamatan) => (
                        <option key={`situasi-${kecamatan}`} value={kecamatan}>
                          {kecamatan}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kelurahan
                    <select
                      name="kelurahan"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    >
                      <option value="" disabled>
                        Pilih Kelurahan
                      </option>
                      {kelurahanOptions.map(([kecamatan, kelurahanList]) => (
                        <optgroup key={`situasi-kel-${kecamatan}`} label={kecamatan}>
                          {kelurahanList.map((kelurahan) => (
                            <option key={`situasi-${kecamatan}-${kelurahan}`} value={kelurahan}>
                              {kelurahan}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Waktu Kejadian
                    <input
                      type="datetime-local"
                      name="reportDate"
                      defaultValue={`${todayDateInput}T00:00`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kondisi Cuaca
                    <input
                      name="weatherCondition"
                      placeholder="Cerah / Berawan / Hujan Deras"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="col-span-full flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Keterangan Akses ke Lokasi
                    <input
                      name="locationAddress"
                      placeholder="Akses dapat dilalui / terputus / jalan terendam..."
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                </div>
              </fieldset>

              {/* Gambaran Umum */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Gambaran Umum Situasi
                <textarea
                  name="situationOverview"
                  rows={4}
                  placeholder="Uraikan situasi umum di lokasi bencana"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* DAMPAK */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Dampak Bencana</legend>
                <div className="pt-2 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Korban Terdampak</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      KK Terdampak
                      <input type="number" name="korbanKK" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Jiwa Terdampak
                      <input type="number" name="korbanJiwa" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Luka Berat
                      <input type="number" name="lukaBerat" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Luka Ringan
                      <input type="number" name="lukaRingan" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Meninggal
                      <input type="number" name="meninggal" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Hilang
                      <input type="number" name="hilang" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Mengungsi
                      <input type="number" name="mengungsi" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">Kerusakan Rumah</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Rusak Berat
                      <input type="number" name="rusakBerat" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Rusak Sedang
                      <input type="number" name="rusakSedang" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Rusak Ringan
                      <input type="number" name="rusakRingan" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Terendam
                      <input type="number" name="rumahTerendam" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">Kerusakan Fasilitas</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Sekolah
                      <input type="number" name="fasSekolah" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Tempat Ibadah
                      <input type="number" name="fasIbadah" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Faskes
                      <input type="number" name="fasKesehatan" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Lain-lain
                      <input type="number" name="fasLainnya" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Mobilisasi SDM PMI */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Mobilisasi SDM PMI</legend>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Total Personil PMI
                    <input type="number" name="totalPersonilPMI" min="0" placeholder="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Kendaraan / Ambulans yang Digunakan
                    <input name="armadaDigunakan" placeholder="2 ambulans, 1 pick-up..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  </label>
                </div>
              </fieldset>

              {/* Giat PMI */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Giat PMI yang Dilakukan
                <textarea
                  name="operationalSummary"
                  rows={3}
                  placeholder="Evakuasi korban, layanan kesehatan, distribusi logistik..."
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* Kebutuhan & Hambatan */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Kebutuhan
                  <textarea
                    name="resourceNeeds"
                    rows={3}
                    placeholder="Obat-obatan, family kit, hygiene kit, APD..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Hambatan
                  <textarea
                    name="recommendation"
                    rows={3}
                    placeholder="Hambatan yang dihadapi tim di lapangan"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </div>

              {/* Kontak Petugas */}
              <fieldset className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Kontak Petugas Posko</legend>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Nama Petugas
                    <input name="kontakNama" placeholder="Nama lengkap" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    No. HP
                    <input name="kontakHp" placeholder="08xxxxxxxxxx" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                  </label>
                </div>
              </fieldset>

              {/* Pilih Kejadian & Permintaan */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lampirkan Kejadian Aktif
                  </p>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto text-sm">
                    {activeIncidents.length === 0 ? (
                      <p className="text-slate-500">Tidak ada kejadian aktif.</p>
                    ) : (
                      activeIncidents.map((incident) => (
                        <label key={incident.id} className="flex items-start gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            name="selectedIncidentIds"
                            value={incident.id}
                            className="mt-0.5"
                          />
                          <span>
                            {incident.incidentCode} · {incident.incidentType} · {incident.status}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lampirkan Permintaan Ambulance Aktif
                  </p>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto text-sm">
                    {[...waitingRequests, ...inProgressRequests].length === 0 ? (
                      <p className="text-slate-500">Tidak ada permintaan aktif.</p>
                    ) : (
                      [...waitingRequests, ...inProgressRequests].map((item) => (
                        <label key={item.id} className="flex items-start gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            name="selectedRequestIds"
                            value={item.id}
                            className="mt-0.5"
                          />
                          <span>
                            {item.requestCode} · {item.patientName} · {item.status}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="submitMode"
                  value="draft"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Simpan Draft
                </button>
                <button
                  type="submit"
                  name="submitMode"
                  value="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Submit Laporan
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Riwayat Laporan Situasi</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Judul</th>
                    <th className="px-3 py-3 font-semibold">Kecamatan</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Pembuat</th>
                    <th className="px-3 py-3 font-semibold">Generate</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanSituasiHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Belum ada laporan situasi.
                      </td>
                    </tr>
                  ) : null}
                  {laporanSituasiHistory.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-slate-900">{report.reportCode}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(report.reportDate).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{report.title}</td>
                      <td className="px-3 py-3 text-slate-700">{report.district}</td>
                      <td className="px-3 py-3 text-slate-700">{report.status}</td>
                      <td className="px-3 py-3 text-slate-700">{report.createdBy?.fullName || "-"}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/api/laporan/posko/${report.id}/docx`}
                            className="rounded-md bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            DOCX
                          </Link>
                          <Link
                            href={`/api/laporan/posko/${report.id}/pdf`}
                            className="rounded-md bg-rose-700 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            PDF
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
        )}
      </div>
    </main>
  );
}
