import { getCurrentSessionProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReferralHospital, toggleReferralHospital } from "./actions";

export default async function ReferralHospitalPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const hospitals = await db.referralHospital.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      district: true,
      phoneNumber: true,
      emergencyPhone: true,
      hasEmergencyUnit: true,
      hasTraumaCenter: true,
      isActive: true,
      notes: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Data Master</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Rumah Sakit Rujukan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola daftar rumah sakit rujukan untuk mendukung proses ambulance dan assessment.
          </p>
        </header>

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

        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Tambah RS Rujukan</h2>
            <form action={createReferralHospital} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Rumah Sakit
                <input required name="name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Alamat
                <textarea required name="address" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kecamatan
                <input required name="district" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Telepon
                  <input name="phoneNumber" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Telepon IGD
                  <input name="emergencyPhone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs">
                  <input type="checkbox" name="hasEmergencyUnit" defaultChecked />
                  Memiliki IGD
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs">
                  <input type="checkbox" name="hasTraumaCenter" />
                  Trauma Center
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Catatan
                <textarea name="notes" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Simpan Rumah Sakit
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar RS Rujukan</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Nama</th>
                    <th className="px-3 py-3 font-semibold">Lokasi</th>
                    <th className="px-3 py-3 font-semibold">Kontak</th>
                    <th className="px-3 py-3 font-semibold">Layanan</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Belum ada data rumah sakit.</td></tr>
                  ) : null}
                  {hospitals.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-3 py-3 text-slate-700">{item.district} · {item.address}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>{item.phoneNumber || "-"}</p>
                        <p className="text-xs text-slate-500">IGD: {item.emergencyPhone || "-"}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>IGD: {item.hasEmergencyUnit ? "Ya" : "Tidak"}</p>
                        <p>Trauma: {item.hasTraumaCenter ? "Ya" : "Tidak"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {item.isActive ? "AKTIF" : "NONAKTIF"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <form action={toggleReferralHospital}>
                          <input type="hidden" name="hospitalId" value={item.id} />
                          <input type="hidden" name="nextActive" value={String(!item.isActive)} />
                          <button type="submit" className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">
                            {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
