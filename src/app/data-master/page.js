import Link from "next/link";

const cards = [
  {
    title: "Unit Ambulance",
    description: "Manajemen unit, status kesiapan, dan catatan kondisi armada.",
    href: "/data-master/ambulance-unit",
    cta: "Kelola Unit",
  },
  {
    title: "Armada Motor",
    description: "Manajemen armada motor operasional dan status kesiapan lapangan.",
    href: "/data-master/motor-unit",
    cta: "Kelola Motor",
  },
  {
    title: "Rumah Sakit Rujukan",
    description: "Kelola rumah sakit rujukan untuk mendukung proses rujukan pasien.",
    href: "/data-master/rumah-sakit",
    cta: "Kelola RS Rujukan",
  },
  {
    title: "Kontak Darurat",
    description: "Daftar kontak lintas instansi untuk koordinasi cepat saat operasi.",
    href: "/data-master/kontak-darurat",
    cta: "Kelola Kontak",
  },
];

export default function DataMasterPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-2 md:p-3 lg:p-4">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Data Master
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Master Data Operasional</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola data referensi yang dipakai lintas modul operasional dan laporan.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
            >
              <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              <Link
                href={card.href}
                className="mt-3 inline-flex rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
