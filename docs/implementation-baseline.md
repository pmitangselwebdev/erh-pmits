# Baseline Implementasi Sprint 1

Dokumen ini mencatat hasil inisialisasi awal proyek sesuai konsep final SIM Posko PMI.

## Cakupan yang Sudah Selesai

- Inisialisasi Next.js App Router berbasis JavaScript
- Integrasi awal Clerk (provider, middleware, halaman sign-in/sign-up)
- Setup Prisma PostgreSQL dan skema domain fondasi
- Dashboard awal terproteksi autentikasi
- Struktur route utama untuk Operasional, Manajemen, Data Master, Laporan, Pengaturan
- Utility dasar untuk konstanta sistem, auth helper, koneksi database, dan validasi Zod

## Catatan Teknis

- Semua route di bawah dashboard, operasional, manajemen, data-master, laporan, dan pengaturan diproteksi middleware Clerk.
- Skema Prisma pada tahap ini adalah fondasi domain; model detail tambahan akan ditambahkan bertahap per modul.
- Integrasi peta Leaflet, upload file, notifikasi event, dan export PDF/Excel belum diaktifkan pada sprint ini.

## Next Sprint Prioritas

1. Approval user dan sinkronisasi profil Clerk ke tabel user internal.
2. Implementasi CRUD modul Kejadian untuk Petugas Posko.
3. Implementasi alur Permintaan Ambulance dan status perjalanan.
4. Implementasi Kartu Luka (KOMPAK) di Petugas Ambulance.
5. Pembuatan audit logger terpusat untuk semua mutation.
