import { getCurrentSessionProfile } from "@/lib/auth";
import { AMBULANCE_UNIT_STATUS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createAmbulanceUnit, updateAmbulanceUnitStatus } from "./actions";

function statusBadgeClass(status) {
  if (status === AMBULANCE_UNIT_STATUS.STANDBY) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === AMBULANCE_UNIT_STATUS.BERTUGAS) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default async function AmbulanceUnitPage({ searchParams }) {
  const profile = await getCurrentSessionProfile();
  if (!profile) return null;

  const resolvedSearchParams = await searchParams;
  const alert = String(resolvedSearchParams?.alert || "").trim();
  const alertType = String(resolvedSearchParams?.alertType || "error").trim();

  const [units, totals] = await Promise.all([
    db.ambulanceUnit.findMany({
      orderBy: [{ status: "asc" }, { unitCode: "asc" }],
      select: {
        id: true,
        unitCode: true,
        plateNumber: true,
        vehicleName: true,
        status: true,
        conditionNote: true,
        lastServiceAt: true,
        _count: {
          select: {
            requests: true,
          },
        },
      },
    }),
    db.ambulanceUnit.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    totals.map((item) => [item.status, item._count.status])
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Data Master
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Unit Ambulance</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola armada ambulance, status operasional, dan catatan kondisi kendaraan.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Standby</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {statusMap[AMBULANCE_UNIT_STATUS.STANDBY] || 0}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Bertugas</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {statusMap[AMBULANCE_UNIT_STATUS.BERTUGAS] || 0}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Maintenance</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {statusMap[AMBULANCE_UNIT_STATUS.MAINTENANCE] || 0}
            </p>
          </article>
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

        <section className="grid gap-6 xl:grid-cols-[1fr,2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Tambah Unit Ambulance</h2>
            <form action={createAmbulanceUnit} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Kode Unit
                <input
                  required
                  name="unitCode"
                  placeholder="AMB-01"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nomor Polisi
                <input
                  required
                  name="plateNumber"
                  placeholder="B 1234 XYZ"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Nama Kendaraan
                <input
                  required
                  name="vehicleName"
                  placeholder="Ambulance PMI 1"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Catatan Kondisi
                <textarea
                  name="conditionNote"
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Simpan Unit
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Daftar Armada</h2>
            <p className="mt-1 text-xs text-slate-500">Status unit bisa diubah sesuai kondisi lapangan.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Unit</th>
                    <th className="px-3 py-3 font-semibold">Nomor Polisi</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Riwayat Request</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        Belum ada unit ambulance.
                      </td>
                    </tr>
                  ) : null}

                  {units.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-900">
                        <p className="font-semibold">{unit.unitCode}</p>
                        <p className="text-xs text-slate-500">{unit.vehicleName}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{unit.plateNumber}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                            unit.status
                          )}`}
                        >
                          {unit.status}
                        </span>
                        {unit.conditionNote ? (
                          <p className="mt-1 text-xs text-slate-500">{unit.conditionNote}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{unit._count.requests}</td>
                      <td className="px-3 py-3">
                        <form action={updateAmbulanceUnitStatus} className="space-y-2">
                          <input type="hidden" name="unitId" value={unit.id} />
                          <select
                            name="nextStatus"
                            defaultValue={unit.status}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          >
                            {Object.values(AMBULANCE_UNIT_STATUS).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <input
                            name="conditionNote"
                            defaultValue={unit.conditionNote || ""}
                            placeholder="Catatan kondisi"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          />
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
      </div>
    </main>
  );
}
