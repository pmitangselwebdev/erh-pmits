import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import {
  SYSTEM_ROLES,
  TANGSEL_KECAMATAN_OPTIONS,
  TANGSEL_WILAYAH,
  USER_STATUS,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { updateIncident } from "../../actions";
import GpsLocationButton from "@/components/gps-location-button";

const ELEVATED_ROLES = new Set([
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.KOORDINATOR_POSKO,
]);

function canModifyIncident(actor, incident) {
  if (!actor || !incident) return false;
  if (ELEVATED_ROLES.has(actor.role)) return true;
  return incident.assignedOfficerId === actor.id;
}

function extractKelurahanFromAddress(address) {
  const text = String(address || "").trim();
  const match = /^Kel\.\s*([^,]+),/i.exec(text);
  return match?.[1]?.trim() || "";
}

export default async function EditIncidentPage({ params, searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile || profile.status !== USER_STATUS.ACTIVE) {
    redirect("/operasional/petugas-posko/kejadian?alert=Akses%20ditolak&alertType=error");
  }

  const { incidentId } = await params;
  const resolvedSearchParams = await searchParams;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      incidentCode: true,
      sourceReport: true,
      reporterName: true,
      reporterPhone: true,
      incidentType: true,
      locationAddress: true,
      district: true,
      latitude: true,
      longitude: true,
      description: true,
      initialVictims: true,
      assignedOfficerId: true,
    },
  });

  if (!incident) {
    notFound();
  }

  if (!canModifyIncident(profile, incident)) {
    redirect(
      "/operasional/petugas-posko/kejadian?alert=Anda%20tidak%20memiliki%20izin%20untuk%20mengedit%20data%20ini&alertType=error"
    );
  }

  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();
  const kelurahanOptions = Object.entries(TANGSEL_WILAYAH);
  const initialKelurahan = extractKelurahanFromAddress(incident.locationAddress);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Operasional Posko
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Edit Kejadian {incident.incidentCode}
            </h1>
          </div>
          <Link
            href="/operasional/petugas-posko/kejadian"
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Kembali
          </Link>
        </div>

        {alert ? (
          <section
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              alertType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {alert}
          </section>
        ) : null}

        <form action={updateIncident} className="mt-5 space-y-3">
          <input type="hidden" name="incidentId" value={incident.id} />

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Sumber Laporan
            <input
              required
              name="sourceReport"
              defaultValue={incident.sourceReport}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Nama Pelapor
              <input
                name="reporterName"
                defaultValue={incident.reporterName || ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Nomor Pelapor
              <input
                name="reporterPhone"
                defaultValue={incident.reporterPhone || ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Jenis Kejadian
              <input
                required
                name="incidentType"
                defaultValue={incident.incidentType}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Kecamatan
              <select
                required
                name="district"
                defaultValue={incident.district}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="" disabled>
                  Pilih Kecamatan
                </option>
                {TANGSEL_KECAMATAN_OPTIONS.map((kecamatan) => (
                  <option key={`edit-${kecamatan}`} value={kecamatan}>
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
                defaultValue={initialKelurahan}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="" disabled>
                  Pilih Kelurahan
                </option>
                {kelurahanOptions.map(([kecamatan, kelurahanList]) => (
                  <optgroup key={`edit-kel-${kecamatan}`} label={kecamatan}>
                    {kelurahanList.map((kelurahan) => (
                      <option key={`edit-${kecamatan}-${kelurahan}`} value={kelurahan}>
                        {kelurahan}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Alamat Lokasi
            <textarea
              required
              name="locationAddress"
              rows={2}
              defaultValue={incident.locationAddress}
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
                defaultValue={incident.initialVictims}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Latitude
              <input
                id="edit-incident-latitude"
                name="latitude"
                defaultValue={incident.latitude ?? ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Longitude
              <input
                id="edit-incident-longitude"
                name="longitude"
                defaultValue={incident.longitude ?? ""}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>

          <GpsLocationButton
            latitudeId="edit-incident-latitude"
            longitudeId="edit-incident-longitude"
            buttonClassName="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          />

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Keterangan
            <textarea
              name="description"
              rows={3}
              defaultValue={incident.description || ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Simpan Perubahan
          </button>
        </form>
      </section>
    </main>
  );
}
