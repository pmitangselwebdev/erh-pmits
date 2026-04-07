import Link from "next/link";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  AMBULANCE_CREW_ROLES,
  AMBULANCE_REQUEST_STATUS,
  AMBULANCE_UNIT_STATUS,
  INCIDENT_STATUS,
  REPORT_APPROVAL_STATUS,
  TRIAGE_LEVELS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  handleAmbulanceFollowUp,
} from "./actions";
import { createInjuryCard, updateInjuryCardTriage } from "../kartu-luka/actions";

function getStatusBadgeClass(status) {
  if (status === AMBULANCE_REQUEST_STATUS.MENUNGGU) {
    return "bg-slate-100 text-slate-700";
  }
  if (status === AMBULANCE_REQUEST_STATUS.DALAM_PERJALANAN) {
    return "bg-amber-100 text-amber-700";
  }
  if (status === AMBULANCE_REQUEST_STATUS.PASIEN_DIANGKUT) {
    return "bg-sky-100 text-sky-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

function triageBadgeClass(level) {
  if (level === TRIAGE_LEVELS.HIJAU) return "bg-emerald-100 text-emerald-700";
  if (level === TRIAGE_LEVELS.KUNING) return "bg-amber-100 text-amber-700";
  if (level === TRIAGE_LEVELS.MERAH) return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function getApprovalBadgeClass(status) {
  if (status === REPORT_APPROVAL_STATUS.APPROVED) return "bg-emerald-100 text-emerald-700";
  if (status === REPORT_APPROVAL_STATUS.REJECTED) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function getCrewMembersByRole(request, role) {
  return (request?.responders || []).filter((item) => item.role === role);
}

export default async function PermintaanAmbulancePage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const tab = String(resolvedSearchParams?.tab || "permintaan").trim();
  const activeTab = ["permintaan", "kartu-luka", "jadwal"].includes(tab)
    ? tab
    : "permintaan";
  const followUpRequestId = String(resolvedSearchParams?.requestId || "").trim();
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const [incidents, units, requests, cards, ambulanceOfficers, schedules] = await Promise.all([
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
        createdAt: true,
        incidentType: true,
        district: true,
        locationAddress: true,
      },
    }),
    db.ambulanceUnit.findMany({
      orderBy: [{ status: "asc" }, { unitCode: "asc" }],
      select: {
        id: true,
        unitCode: true,
        plateNumber: true,
        vehicleName: true,
        status: true,
      },
    }),
    db.ambulanceRequest.findMany({
      where: {
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
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
        responders: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            unitCode: true,
            status: true,
          },
        },
        incident: {
          select: {
            id: true,
            incidentCode: true,
          },
        },
      },
    }),
    db.injuryCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        cardNumber: true,
        victimName: true,
        age: true,
        gender: true,
        injuryType: true,
        triageLevel: true,
        referralRequired: true,
        referralHospital: true,
        ambulanceUsed: true,
        jenisKejadian: true,
        waktuKejadian: true,
        lokasi: true,
        namaPetugas: true,
        respon: true,
        statusRujukan: true,
        lokasiRujukan: true,
        createdAt: true,
        incident: {
          select: {
            id: true,
            incidentCode: true,
          },
        },
        officer: {
          select: {
            fullName: true,
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
        officerType: "PETUGAS_AMBULANCE",
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
      },
    }),
    db.ambulanceRequest.findMany({
      where: {
        scheduledAt: { not: null },
        approvalStatus: REPORT_APPROVAL_STATUS.APPROVED,
      },
      orderBy: { scheduledAt: "desc" },
      take: 200,
      select: {
        id: true,
        requestCode: true,
        patientName: true,
        patientCondition: true,
        pickupAddress: true,
        pickupDistrict: true,
        destinationType: true,
        destinationName: true,
        priority: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        responders: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            role: true,
            user: { select: { fullName: true } },
          },
        },
        unit: {
          select: { unitCode: true, plateNumber: true },
        },
        incident: {
          select: { id: true, incidentCode: true },
        },
      },
    }),
  ]);

  const selectedRequest =
    requests.find((item) => item.id === followUpRequestId) || requests[0] || null;
  const selectedDriver = getCrewMembersByRole(selectedRequest, AMBULANCE_CREW_ROLES.DRIVER)[0] || null;
  const selectedParamedics = getCrewMembersByRole(
    selectedRequest,
    AMBULANCE_CREW_ROLES.PARAMEDIK
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Operasional Ambulance
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Petugas Ambulance</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola permintaan ambulance dan kartu luka dalam satu halaman kerja.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/operasional/petugas-ambulance/permintaan?tab=permintaan"
              className={`app-tab-btn ${activeTab === "permintaan" ? "app-tab-btn-active" : ""}`}
            >
              Permintaan Ambulance
            </Link>
            <Link
              href="/operasional/petugas-ambulance/permintaan?tab=kartu-luka"
              className={`app-tab-btn ${activeTab === "kartu-luka" ? "app-tab-btn-active" : ""}`}
            >
              Kartu Luka
            </Link>
            <Link
              href="/operasional/petugas-ambulance/permintaan?tab=jadwal"
              className={`app-tab-btn ${activeTab === "jadwal" ? "app-tab-btn-active" : ""}`}
            >
              Jadwal
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

        {activeTab === "permintaan" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Follow-up Permintaan</h2>
            <p className="mt-1 text-xs text-slate-500">
              Permintaan dibuat oleh Posko. Tim Ambulance fokus pada konfirmasi personel,
              assignment unit, dan update status layanan.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Permintaan dipilih untuk follow-up</p>
              <p className="mt-1 text-sm text-slate-900">
                {selectedRequest
                  ? `${selectedRequest.requestCode} - ${selectedRequest.patientName}`
                  : "Belum ada data permintaan yang dapat di-follow-up."}
              </p>
              {selectedRequest ? (
                <div className="mt-1 space-y-1 text-xs text-slate-600">
                  <p>Pickup: {selectedRequest.pickupDistrict} · Tujuan: {selectedRequest.destinationName}</p>
                  <p>
                    Driver: {selectedDriver?.user.fullName || "Belum dipilih"}
                  </p>
                  <p>
                    Paramedik: {selectedParamedics.map((item) => item.user.fullName).join(", ") || "Belum dipilih"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <form action={handleAmbulanceFollowUp} className="space-y-3">
                <input type="hidden" name="requestId" value={selectedRequest?.id || ""} />
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Driver
                    <select
                      name="driverId"
                      defaultValue={selectedDriver?.user.id || ""}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="">Pilih Driver</option>
                      {ambulanceOfficers.map((officer) => (
                        <option key={officer.id} value={officer.id}>
                          {officer.fullName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Paramedik 1
                    <select
                      name="paramedicIds"
                      defaultValue={selectedParamedics[0]?.user.id || ""}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="">Pilih Paramedik</option>
                      {ambulanceOfficers.map((officer) => (
                        <option key={officer.id} value={officer.id}>
                          {officer.fullName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Paramedik 2
                    <select
                      name="paramedicIds"
                      defaultValue={selectedParamedics[1]?.user.id || ""}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="">Pilih Paramedik</option>
                      {ambulanceOfficers.map((officer) => (
                        <option key={officer.id} value={officer.id}>
                          {officer.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-600">
                    Simpan follow-up sekaligus: tim (1 driver + maks. 2 paramedik), unit, dan status.
                  </p>
                  <button
                    type="submit"
                    disabled={!selectedRequest}
                    className="rounded-md bg-indigo-700 px-2.5 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Simpan Follow-up
                  </button>
                </div>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Assign Unit Ambulance
                  <select
                    name="unitId"
                    defaultValue={selectedRequest?.unit?.id || ""}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">Pilih Unit</option>
                    {units.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                        disabled={unit.status === AMBULANCE_UNIT_STATUS.MAINTENANCE}
                      >
                        {unit.unitCode} ({unit.status})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Update Status Layanan
                  <select
                    name="nextStatus"
                    defaultValue={selectedRequest?.status || AMBULANCE_REQUEST_STATUS.MENUNGGU}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {Object.values(AMBULANCE_REQUEST_STATUS).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </form>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Antrian Permintaan</h2>
            <p className="mt-1 text-xs text-slate-500">Menampilkan 100 data terakhir.</p>

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
                    <th className="px-3 py-3 font-semibold">Petugas</th>
                    <th className="px-3 py-3 font-semibold">Unit</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Pilih Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
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
                        {item.approvalNote ? (
                          <p className="mt-1 max-w-[170px] truncate text-xs text-slate-500">
                            {item.approvalNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.responders.length ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-700">
                              Driver: {getCrewMembersByRole(item, AMBULANCE_CREW_ROLES.DRIVER)[0]?.user.fullName || "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Paramedik: {getCrewMembersByRole(item, AMBULANCE_CREW_ROLES.PARAMEDIK)
                                .map((member) => member.user.fullName)
                                .join(", ") || "-"}
                            </p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.unit ? (
                          <p>
                            {item.unit.unitCode}
                            <span className="ml-1 text-xs text-slate-500">
                              ({item.unit.status})
                            </span>
                          </p>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/operasional/petugas-ambulance/permintaan?tab=permintaan&requestId=${item.id}`}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white ${
                            selectedRequest?.id === item.id
                              ? "bg-slate-900"
                              : "bg-slate-700 hover:bg-slate-800"
                          }`}
                        >
                          {selectedRequest?.id === item.id ? "Dipilih" : "Pilih"}
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
          </article>
        </section>
        ) : activeTab === "kartu-luka" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Input Kartu Luka</h2>
            <p className="mt-1 text-xs text-slate-500">
              Buat kartu luka baru untuk pasien yang ditangani ambulance.
            </p>

            <form action={createInjuryCard} className="mt-4 space-y-4">
              {/* ── Info Kejadian ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">Info Kejadian</legend>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Kejadian Terkait
                  <select
                    name="incidentId"
                    defaultValue=""
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
                  Jenis Kejadian
                  <select
                    required
                    name="jenisKejadian"
                    defaultValue=""
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="" disabled>Pilih Jenis Kejadian</option>
                    <option value="Rujukan">Rujukan</option>
                    <option value="Kecelakaan">Kecelakaan</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Waktu Kejadian
                  <input
                    required
                    name="waktuKejadian"
                    type="datetime-local"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Lokasi Kejadian
                  <input
                    required
                    name="lokasi"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </fieldset>

              {/* ── Info Petugas ── */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Petugas
                <input
                  required
                  name="namaPetugas"
                  defaultValue={profile.fullName}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* ── Info Korban ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">Info Korban</legend>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Nama Korban / Pasien
                  <input
                    required
                    name="namaKorban"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Usia
                    <input
                      required
                      name="usia"
                      placeholder="cth: 25"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Jenis Kelamin
                    <select
                      required
                      name="jenisKelamin"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Alamat
                  <input
                    required
                    name="alamat"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Nomor Telepon
                  <input
                    required
                    name="nomorTelepon"
                    placeholder="08xxxxxxxxxx"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </fieldset>

              {/* ── Tanda Vital ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">Tanda Vital</legend>

                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-slate-600">Respon (AVPU)</p>
                  <div className="flex flex-wrap gap-2">
                    {["Awas", "Suara", "Nyeri", "Tidak Respon"].map((level) => (
                      <label
                        key={level}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:font-semibold has-[:checked]:text-blue-700"
                      >
                        <input type="radio" required name="respon" value={level} className="accent-blue-600" />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Nafas
                    <select
                      required
                      name="nafas"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="Kuat">Kuat</option>
                      <option value="Lemah">Lemah</option>
                      <option value="Tidak ada">Tidak ada</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Frekuensi Nafas
                    <input
                      name="frekuensiNafas"
                      placeholder="cth: 20x/menit"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Nadi
                    <select
                      required
                      name="nadi"
                      defaultValue=""
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="" disabled>Pilih</option>
                      <option value="Kuat">Kuat</option>
                      <option value="Lemah">Lemah</option>
                      <option value="Tidak ada">Tidak ada</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Frekuensi Nadi
                    <input
                      name="frekuensiNadi"
                      placeholder="cth: 80x/menit"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Tekanan Darah
                  <input
                    name="tekananDarah"
                    placeholder="cth: 120/80 mmHg"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </fieldset>

              {/* ── Jenis Cedera ── */}
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Jenis Cedera
                <input
                  name="jenisCedera"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              {/* ── KOMPAK ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">KOMPAK</legend>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  K — Keluhan Utama
                  <textarea
                    name="keluhan"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  O — Obat yang dikonsumsi
                  <input
                    name="obat"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  M — Makan / Minum Terakhir
                  <input
                    name="makanMinum"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  P — Penyakit / Riwayat
                  <input
                    name="penyakit"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  A — Alergi
                  <input
                    name="alergi"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  K — Kejadian / Kronologis
                  <textarea
                    name="kejadian"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </fieldset>

              {/* ── Tindakan ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">Tindakan</legend>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Penjelasan Tindakan
                  <textarea
                    name="penjelasanTindakan"
                    rows={2}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Triage
                  <select
                    name="triageLevel"
                    defaultValue={TRIAGE_LEVELS.KUNING}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {Object.values(TRIAGE_LEVELS).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              {/* ── Rujukan ── */}
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
                <legend className="px-2 text-xs font-semibold text-slate-700">Rujukan</legend>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Status Rujukan
                  <select
                    required
                    name="statusRujukan"
                    defaultValue="Tidak"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="Iya">Iya</option>
                    <option value="Tidak">Tidak</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Lokasi Rujukan
                  <input
                    name="lokasiRujukan"
                    placeholder="Nama rumah sakit tujuan"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </label>
              </fieldset>

              {/* ── Lain-lain ── */}
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">
                <input type="checkbox" name="ambulanceUsed" defaultChecked />
                Menggunakan Ambulance
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Catatan
                <textarea
                  name="notes"
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Simpan Kartu Luka
              </button>
            </form>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Kartu Luka</h2>
            <p className="mt-1 text-xs text-slate-500">Menampilkan 100 data terakhir.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">No. Kartu</th>
                    <th className="px-3 py-3 font-semibold">Pasien</th>
                    <th className="px-3 py-3 font-semibold">Kejadian</th>
                    <th className="px-3 py-3 font-semibold">Triage</th>
                    <th className="px-3 py-3 font-semibold">Rujukan</th>
                    <th className="px-3 py-3 font-semibold">Petugas</th>
                    <th className="px-3 py-3 font-semibold">Ubah Triage</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Belum ada kartu luka.
                      </td>
                    </tr>
                  ) : null}

                  {cards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <p className="font-semibold">{card.cardNumber}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(card.createdAt).toLocaleString("id-ID")}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>{card.victimName}</p>
                        <p className="text-xs text-slate-500">
                          {card.gender || "-"} · {card.age ?? "-"} thn
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {card.jenisKejadian ? (
                          <p className="text-xs">{card.jenisKejadian}</p>
                        ) : null}
                        {card.incident ? (
                          <Link
                            href={`/operasional/petugas-posko/kejadian/${card.incident.id}`}
                            className="text-xs text-slate-800 hover:text-red-700"
                          >
                            {card.incident.incidentCode}
                          </Link>
                        ) : (
                          !card.jenisKejadian && "-"
                        )}
                        {card.lokasi ? (
                          <p className="text-xs text-slate-500">{card.lokasi}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${triageBadgeClass(
                            card.triageLevel
                          )}`}
                        >
                          {card.triageLevel}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          {card.injuryType || "Jenis cedera belum diisi"}
                        </p>
                        {card.respon ? (
                          <p className="text-xs text-slate-500">Respon: {card.respon}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p className="text-xs">
                          {card.statusRujukan || (card.referralRequired ? "Iya" : "Tidak")}
                        </p>
                        {(card.lokasiRujukan || card.referralHospital) ? (
                          <p className="text-xs text-slate-500">{card.lokasiRujukan || card.referralHospital}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {card.namaPetugas || card.officer?.fullName || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <form action={updateInjuryCardTriage} className="flex gap-2">
                          <input type="hidden" name="cardId" value={card.id} />
                          <select
                            name="triageLevel"
                            defaultValue={card.triageLevel}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          >
                            {Object.values(TRIAGE_LEVELS).map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Simpan
                          </button>
                        </form>
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
        ) : (
        <section className="space-y-6">
          {/* ── Calendar View ── */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Kalender Jadwal Ambulance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Titik merah menandakan ada jadwal ambulance pada tanggal tersebut.
            </p>
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

              const scheduleDates = new Set(
                schedules
                  .filter((s) => {
                    const d = new Date(s.scheduledAt);
                    return d.getFullYear() === year && d.getMonth() === month;
                  })
                  .map((s) => new Date(s.scheduledAt).getDate())
              );

              const blanks = Array.from({ length: firstDay }, (_, i) => (
                <div key={`blank-${i}`} />
              ));
              const days = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isToday = day === now.getDate();
                const hasSchedule = scheduleDates.has(day);
                return (
                  <div
                    key={day}
                    className={`relative flex h-10 items-center justify-center rounded-lg text-sm font-medium ${
                      isToday
                        ? "bg-red-600 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {day}
                    {hasSchedule && (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />
                    )}
                  </div>
                );
              });

              return (
                <div className="mt-4">
                  <p className="mb-3 text-center text-sm font-semibold text-slate-800">{monthName}</p>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {blanks}
                    {days}
                  </div>
                </div>
              );
            })()}
          </article>

          {/* ── Table View ── */}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Jadwal Ambulance</h2>
            <p className="mt-1 text-xs text-slate-500">
              Semua permintaan ambulance yang telah dijadwalkan.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Jadwal</th>
                    <th className="px-3 py-2">Pasien</th>
                    <th className="px-3 py-2">Jemput</th>
                    <th className="px-3 py-2">Tujuan</th>
                    <th className="px-3 py-2">Kru</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Kejadian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                        Belum ada jadwal ambulance.
                      </td>
                    </tr>
                  ) : (
                    schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                          {item.requestCode}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {new Date(item.scheduledAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{item.patientName}</p>
                          <p className="text-xs text-slate-500">{item.patientCondition || "-"}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {item.pickupDistrict || item.pickupAddress || "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {item.destinationName || item.destinationType || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs">
                            Driver: {getCrewMembersByRole(item, AMBULANCE_CREW_ROLES.DRIVER)[0]?.user.fullName || "-"}
                          </p>
                          <p className="text-xs">
                            Paramedik: {getCrewMembersByRole(item, AMBULANCE_CREW_ROLES.PARAMEDIK)
                              .map((p) => p.user.fullName)
                              .join(", ") || "-"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {item.unit ? `${item.unit.unitCode} (${item.unit.plateNumber})` : "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {item.incident?.incidentCode || "-"}
                        </td>
                      </tr>
                    ))
                  )}
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
