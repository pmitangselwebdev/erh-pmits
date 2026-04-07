import { redirect } from "next/navigation";
import { getCurrentSessionProfile } from "@/lib/auth";
import { LOGISTIC_MOVEMENT_TYPES, SYSTEM_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { adjustLogisticStock, createLogisticItem } from "./actions";

const ALLOWED_ROLES = new Set([SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.KOORDINATOR_POSKO]);

export default async function ManajemenLogistikPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  if (!ALLOWED_ROLES.has(profile.role)) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const items = await db.logisticItem.findMany({
    orderBy: [{ isActive: "desc" }, { category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      itemCode: true,
      name: true,
      category: true,
      unit: true,
      currentStock: true,
      minimumStock: true,
      storageLocation: true,
      notes: true,
      isActive: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Manajemen</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Logistik</h1>
          <p className="mt-2 text-sm text-slate-600">Kontrol stok logistik untuk memastikan kesiapsiagaan operasi posko.</p>
        </header>

        {alert ? (
          <section className={`rounded-xl border px-4 py-3 text-sm ${alertType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {alert}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Tambah Item Logistik</h2>
            <form action={createLogisticItem} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Kode
                  <input required name="itemCode" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Nama Item
                  <input required name="name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Kategori
                  <input required name="category" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Satuan
                  <input required name="unit" placeholder="pcs/box/tabung" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Stok Awal
                  <input type="number" min="0" name="currentStock" defaultValue="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Minimum Stok
                  <input type="number" min="0" name="minimumStock" defaultValue="0" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Lokasi Simpan
                <input name="storageLocation" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Catatan
                <textarea name="notes" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Simpan Item</button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Stok Logistik</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Item</th>
                    <th className="px-3 py-3 font-semibold">Kategori</th>
                    <th className="px-3 py-3 font-semibold">Stok</th>
                    <th className="px-3 py-3 font-semibold">Lokasi</th>
                    <th className="px-3 py-3 font-semibold">Penyesuaian</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada item logistik.</td></tr>
                  ) : null}
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <p className="font-semibold">{item.itemCode} - {item.name}</p>
                        {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.category}</td>
                      <td className="px-3 py-3">
                        <p className={`font-semibold ${item.currentStock <= item.minimumStock ? "text-rose-700" : "text-slate-900"}`}>
                          {item.currentStock} {item.unit}
                        </p>
                        <p className="text-xs text-slate-500">Min: {item.minimumStock}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{item.storageLocation || "-"}</td>
                      <td className="px-3 py-3">
                        <form action={adjustLogisticStock} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                          <input type="hidden" name="itemId" value={item.id} />
                          <select name="movementType" className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            {Object.values(LOGISTIC_MOVEMENT_TYPES).map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input type="number" min="1" name="quantity" placeholder="Jumlah" className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                          <button type="submit" className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">Update</button>
                          <input name="note" placeholder="Catatan transaksi" className="col-span-3 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
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
