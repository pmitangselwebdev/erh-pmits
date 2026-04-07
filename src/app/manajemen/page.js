import Link from "next/link";

export default function ManajemenPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Manajemen
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Modul Manajemen SDM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Approval user, shift, handover, dan logistik sudah aktif untuk mendukung
          operasional posko harian.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/manajemen/sdm"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Manajemen SDM
          </Link>
          <Link
            href="/manajemen/logistik"
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            Manajemen Logistik
          </Link>
        </div>
      </section>
    </main>
  );
}
