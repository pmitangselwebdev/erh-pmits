# SIM Posko PMI v2

Sistem Informasi Posko Siaga 24 Jam untuk PMI Kota Tangerang Selatan.

## Baseline Sprint 1

Fase awal implementasi menyiapkan:

- Next.js App Router dengan JavaScript
- Tailwind CSS
- Clerk untuk autentikasi
- Prisma ORM dengan PostgreSQL
- Struktur domain untuk pengembangan modul operasional

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

## Catatan

- Kartu Luka (KOMPAK) berada di modul Petugas Ambulance.
- Full scope modul akan diaktifkan bertahap sesuai roadmap implementasi.
