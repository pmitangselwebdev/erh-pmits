import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function IncidentDetailPage({ params }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const { incidentId } = await params;

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true,
      incidentCode: true,
      reportedAt: true,
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
      status: true,
      createdAt: true,
      updatedAt: true,
      assignedOfficer: {
        select: {
          fullName: true,
          officerType: true,
        },
      },
    },
  });

  if (!incident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/operasional/petugas-posko/kejadian"
          className="inline-flex rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          Kembali ke Daftar
        </Link>

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Detail Kejadian
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{incident.incidentCode}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Status saat ini: <span className="font-semibold">{incident.status}</span>
          </p>
        </header>

        <dl className="mt-6 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Waktu Lapor</dt>
            <dd className="mt-1">{new Date(incident.reportedAt).toLocaleString("id-ID")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Jenis Kejadian</dt>
            <dd className="mt-1">{incident.incidentType}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Sumber Laporan</dt>
            <dd className="mt-1">{incident.sourceReport}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Kecamatan</dt>
            <dd className="mt-1">{incident.district}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Alamat Lokasi</dt>
            <dd className="mt-1">{incident.locationAddress}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Nama Pelapor</dt>
            <dd className="mt-1">{incident.reporterName || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">No. Pelapor</dt>
            <dd className="mt-1">{incident.reporterPhone || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Jumlah Korban Awal</dt>
            <dd className="mt-1">{incident.initialVictims}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Petugas Penanggung Jawab</dt>
            <dd className="mt-1">{incident.assignedOfficer?.fullName || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Koordinat</dt>
            <dd className="mt-1">
              {incident.latitude != null && incident.longitude != null
                ? `${incident.latitude}, ${incident.longitude}`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Terakhir Diperbarui</dt>
            <dd className="mt-1">{new Date(incident.updatedAt).toLocaleString("id-ID")}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">Keterangan</dt>
            <dd className="mt-1 whitespace-pre-wrap">{incident.description || "-"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
