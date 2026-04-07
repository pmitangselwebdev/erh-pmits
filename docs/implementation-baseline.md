# Ringkasan Implementasi Aktif

Dokumen ini merangkum fitur yang saat ini sudah aktif di SIM Posko PMI.

## Cakupan Aktif

- Fondasi aplikasi: Next.js App Router (JS), Tailwind, Clerk, Prisma PostgreSQL.
- Middleware proteksi route untuk area internal modul.
- Sinkronisasi user Clerk ke tabel user internal + approval user.
- Dashboard operasional dengan KPI agregasi real-time.
- Operasional Posko:
	- Input dan listing kejadian
	- Detail/edit/hapus kejadian dengan guard role
	- Update status kejadian
- Operasional Ambulance:
	- Input request ambulance terkait kejadian
	- Assignment unit ambulance
	- Update status request
	- Sinkron otomatis status unit dan status kejadian
- Operasional Assessment:
	- Input kartu luka/assessment
	- Listing assessment dan update triage
- Manajemen SDM:
	- Approval user
	- Penjadwalan shift
	- Serah terima shift (handover) + konfirmasi
- Data Master:
	- CRUD dasar unit ambulance + update status operasional
- Pengaturan:
	- Profil akun
	- Inbox notifikasi dan aksi tandai dibaca
	- Audit log aktivitas
- Laporan:
	- Filter periode
	- Export CSV
	- Export PDF

## Catatan Teknis

- Prisma client berjalan menggunakan adapter PostgreSQL (`@prisma/adapter-pg`).
- Semua mutation penting menulis audit log terpusat.
- Notifikasi internal sudah diaktifkan untuk approval user, assignment shift, dan handover shift.

## Prioritas Lanjutan

1. Master data rumah sakit rujukan dan kontak darurat.
2. Integrasi peta Leaflet pada kejadian/ambulance.
3. Peningkatan laporan periodik bulanan/tahunan dan grafik tren.
