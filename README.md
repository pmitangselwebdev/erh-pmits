# SIM Posko PMI v2

Sistem Informasi Posko Siaga 24 Jam untuk PMI Kota Tangerang Selatan.

## Status Implementasi Saat Ini

Fitur yang sudah aktif:

- Autentikasi Clerk + proteksi route middleware
- Sinkronisasi user Clerk ke tabel user internal
- Dashboard KPI real-time berbasis data operasional
- Operasional Posko: CRUD Kejadian + update status + detail + edit/hapus dengan guard role
- Operasional Ambulance: permintaan ambulance, assignment unit, update status, sinkron status unit dan kejadian
- Operasional Assessment: input kartu luka/assessment + update triage
- Manajemen SDM: approval user, penjadwalan shift, serah terima shift
- Data Master: manajemen unit ambulance
- Pengaturan: profil akun, inbox notifikasi, audit log
- Laporan: filter + export CSV dan PDF

## Menjalankan Lokal

1. Install dependency:

```bash
npm install
```

2. Salin env contoh dan isi nilainya:

```bash
cp .env.example .env
```

3. Generate Prisma Client:

```bash
npm run db:generate
```

4. Push schema awal ke database:

```bash
npm run db:push
```

5. Jalankan server development:

```bash
npm run dev
```

## Script Utama

- `npm run dev` - Jalankan aplikasi mode development
- `npm run build` - Build production
- `npm run start` - Jalankan build production
- `npm run lint` - Cek linting
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sinkronisasi schema ke database
- `npm run db:migrate` - Buat migration development
- `npm run db:studio` - Buka Prisma Studio

## Stack

- Next.js App Router (JavaScript)
- Tailwind CSS
- Clerk
- Prisma ORM
- PostgreSQL
- Zod
- Leaflet
- UploadThing
- pdf-lib

## Catatan

- Kartu Luka (KOMPAK) berada di modul Petugas Ambulance.
- Implementasi berjalan bertahap per modul dengan validasi lint/build di tiap batch.
- Untuk bootstrap admin pertama, isi `BOOTSTRAP_ADMIN_CLERK_USER_ID` di `.env`.
# emergency-response-hub-pmits
