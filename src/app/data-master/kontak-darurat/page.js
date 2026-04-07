import { getCurrentSessionProfile } from "@/lib/auth";
import { EMERGENCY_AGENCIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { createEmergencyContact, toggleEmergencyContact } from "./actions";

export default async function EmergencyContactPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const contacts = await db.emergencyContact.findMany({
    orderBy: [{ isActive: "desc" }, { agency: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      agency: true,
      phoneNumber: true,
      backupPhone: true,
      district: true,
      notes: true,
      isActive: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Data Master</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Kontak Darurat</h1>
          <p className="mt-2 text-sm text-slate-600">Daftar kontak lintas instansi untuk koordinasi cepat saat kejadian.</p>
        </header>

        {alert ? (
          <section className={`rounded-xl border px-4 py-3 text-sm ${alertType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {alert}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Tambah Kontak Darurat</h2>
            <form action={createEmergencyContact} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Kontak
                <input required name="name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Instansi
                <select name="agency" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {EMERGENCY_AGENCIES.map((agency) => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Telepon Utama
                  <input required name="phoneNumber" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Telepon Cadangan
                  <input name="backupPhone" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kecamatan
                <input name="district" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Catatan
                <textarea name="notes" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Simpan Kontak</button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Kontak Darurat</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Instansi</th>
                    <th className="px-3 py-3 font-semibold">Nama</th>
                    <th className="px-3 py-3 font-semibold">Kontak</th>
                    <th className="px-3 py-3 font-semibold">Wilayah</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Belum ada kontak darurat.</td></tr>
                  ) : null}
                  {contacts.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-700">{item.agency}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>{item.phoneNumber}</p>
                        <p className="text-xs text-slate-500">Cadangan: {item.backupPhone || "-"}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.district || "-"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{item.isActive ? "AKTIF" : "NONAKTIF"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <form action={toggleEmergencyContact}>
                          <input type="hidden" name="contactId" value={item.id} />
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
