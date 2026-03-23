import Link from "next/link";

export default function Home() {
  const modules = [
    "Operasional Kejadian Posko",
    "Operasional Ambulance dan Kartu Luka",
    "Assessment Bencana Rapid dan Detail",
    "SDM, Shift, dan Handover",
    "Logistik Posko",
    "Laporan, Arsip, dan Audit Trail",
  ];

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-b from-amber-50 via-white to-red-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold tracking-wide text-red-700">
              PMI Kota Tangerang Selatan
            </p>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              SIM Posko Siaga 24 Jam
            </h1>
            <p className="text-sm text-slate-700 md:text-base">
              Platform terpusat untuk penanganan kejadian, operasional ambulance,
              assessment bencana, logistik, dan pelaporan operasional PMI.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Buka Dashboard
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Masuk
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((moduleName) => (
            <article
              key={moduleName}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-slate-900">{moduleName}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Fondasi modul sudah dipersiapkan dan akan diaktifkan bertahap pada
                sprint implementasi berikutnya.
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Status Sprint 1</h3>
          <p className="mt-2 text-sm text-amber-900">
            Setup baseline sudah dimulai: autentikasi Clerk, ORM Prisma,
            konfigurasi role dasar, dan struktur domain utama.
          </p>
        </section>
      </div>
    </main>
  );
}
