import Link from "next/link";

const moduleCards = [
  {
    title: "Kejadian Posko",
    description: "Input, monitoring, dan update status kejadian lapangan.",
    href: "/operasional/petugas-posko/kejadian",
    cta: "Buka Modul Kejadian",
  },
  {
    title: "Permintaan Ambulance",
    description: "Antrian permintaan ambulance dan progres penjemputan pasien.",
    href: "/operasional/petugas-ambulance/permintaan",
    cta: "Buka Permintaan Ambulance",
  },
  {
    title: "Kartu Luka",
    description: "Buat dan kelola kartu luka pasien yang ditangani oleh tim ambulance.",
    href: "/operasional/petugas-ambulance/permintaan?tab=kartu-luka",
    cta: "Buka Kartu Luka",
  },
  {
    title: "Assessment Lapangan",
    description: "Perbarui data situasional kejadian aktif dari hasil observasi lapangan.",
    href: "/operasional/petugas-assessment/assessment",
    cta: "Buka Assessment",
  },
  {
    title: "Event Medis",
    description: "Inisiasi event medis, persiapan pos, tim, armada, dan logistik.",
    href: "/operasional/event-medis",
    cta: "Buka Event Medis",
  },
];

export default function OperasionalPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Operasional
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Modul Operasional Petugas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pilih area kerja sesuai jenis petugas untuk menjalankan proses operasional.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {moduleCards.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {item.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
