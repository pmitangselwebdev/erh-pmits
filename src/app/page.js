"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  MapPin,
  Users,
  Activity,
  Shield,
  Heart,
  Ambulance,
  Truck,
  SunMoon,
} from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import MapInfographicHero from "@/components/map-infographic-hero"

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isSignedIn) {
      router.push("/auth/callback")
      return
    }
  }, [isSignedIn, router])

  useEffect(() => {
    const revealNodes = document.querySelectorAll("[data-reveal]")
    if (!revealNodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target instanceof Element && entry.target.classList) {
            entry.target.classList.add("is-revealed")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    )

    revealNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo pmi-tangsel.png"
              alt="Logo PMI Kota Tangerang Selatan"
              width={44}
              height={44}
              className="h-11 w-auto object-contain"
              priority
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Emergency Response Hub PMI Kota Tangerang Selatan</p>
              <h1 className="text-sm font-semibold sm:text-base">PMI Kota Tangerang Selatan</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#statistik" className="text-sm text-muted-foreground transition-colors hover:text-red-500">
              Statistik
            </Link>
            <Link href="#alur" className="text-sm text-muted-foreground transition-colors hover:text-red-500">
              Alur Respons
            </Link>
            <Link href="/lapor" className="text-sm font-semibold text-red-500 transition-colors hover:text-red-400">
              Lapor Darurat
            </Link>
          </nav>

          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2 py-1.5 shadow-sm">
            <span className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground sm:flex">
              <SunMoon className="h-3.5 w-3.5" />
              Theme
            </span>
            <ThemeToggle />
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <MapInfographicHero />

      <section className="px-4 pb-16" data-reveal>
        <div className="container mx-auto">
          <div className="grid gap-6 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Butuh Bantuan Darurat?</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                Laporkan Kejadian.
                <span className="block text-red-500">PMI Siap Bergerak.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Setiap detik berarti dalam situasi darurat. Kirim laporan kejadian sekarang — tim PMI Kota Tangerang Selatan
                akan merespons, memverifikasi, dan mengirimkan bantuan ke lokasi Anda secepat mungkin.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Bisa juga hubungi kami langsung di <strong className="text-foreground">119</strong> untuk ambulans darurat
                atau <strong className="text-foreground">(021) 123-4567</strong> untuk koordinasi posko.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/lapor"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:-translate-y-0.5 hover:bg-red-600"
                >
                  <Shield className="h-4 w-4" />
                  Lapor Sekarang
                </Link>
                <Link
                  href="/#statistik"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-red-300 hover:text-red-500"
                >
                  Lihat Laporan Publik
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border">
              <div className="flex flex-col gap-1 bg-card p-6">
                <Ambulance className="h-6 w-6 text-red-500" />
                <p className="mt-2 text-2xl font-bold">119</p>
                <p className="text-xs text-muted-foreground">Ambulans Darurat</p>
              </div>
              <div className="flex flex-col gap-1 bg-card p-6">
                <Heart className="h-6 w-6 text-pink-500" />
                <p className="mt-2 text-2xl font-bold">24/7</p>
                <p className="text-xs text-muted-foreground">Siaga Sepanjang Hari</p>
              </div>
              <div className="flex flex-col gap-1 bg-card p-6">
                <Activity className="h-6 w-6 text-sky-500" />
                <p className="mt-2 text-2xl font-bold">&lt; 15 mnt</p>
                <p className="text-xs text-muted-foreground">Target Waktu Respons</p>
              </div>
              <div className="flex flex-col gap-1 bg-card p-6">
                <Users className="h-6 w-6 text-emerald-500" />
                <p className="mt-2 text-2xl font-bold">7 Zona</p>
                <p className="text-xs text-muted-foreground">Cakupan Kecamatan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="alur" className="px-4 pb-16" data-reveal>
        <div className="container mx-auto">
          <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Alur Respons Cepat</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">Dari laporan masuk sampai unit bergerak dalam satu jalur kerja</h2>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4" data-reveal style={{ transitionDelay: "70ms" }}>
                <p className="text-xs font-semibold text-red-500">01. Intake</p>
                <p className="mt-2 text-sm text-muted-foreground">Warga mengirim laporan dan sistem memetapkan tingkat urgensi otomatis.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4" data-reveal style={{ transitionDelay: "140ms" }}>
                <p className="text-xs font-semibold text-red-500">02. Verifikasi</p>
                <p className="mt-2 text-sm text-muted-foreground">Petugas posko memvalidasi data lokasi, korban, dan kebutuhan darurat.</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4" data-reveal style={{ transitionDelay: "210ms" }}>
                <p className="text-xs font-semibold text-red-500">03. Dispatch</p>
                <p className="mt-2 text-sm text-muted-foreground">Unit ambulans, relawan, dan logistik ditugaskan lalu dipantau real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="statistik" className="px-4 py-16 md:py-20" data-reveal>
        <div className="container mx-auto px-4">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Statistik Layanan PMI</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">Data layanan yang telah ditangani oleh PMI Kota Tangerang Selatan</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              Informasi statistik tentang jumlah kejadian yang telah ditangani, distribusi per jenis kejadian, dan cakupan wilayah layanan.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Jenis Kejadian</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Kecelakaan</span>
                    <span className="text-sm font-bold">24%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Bencana Alam</span>
                    <span className="text-sm font-bold">32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Evakuasi Medis</span>
                    <span className="text-sm font-bold">18%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '18%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Lainnya</span>
                    <span className="text-sm font-bold">26%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '26%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Cakupan Wilayah</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Pondok Aren</span>
                    <span className="text-sm font-bold">156</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Serpong</span>
                    <span className="text-sm font-bold">132</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Ciputat</span>
                    <span className="text-sm font-bold">98</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '54%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Pamulang</span>
                    <span className="text-sm font-bold">112</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '61%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl border border-border/80 bg-card shadow-sm">
              <p className="text-3xl font-bold text-red-500">1,248</p>
              <p className="text-sm text-muted-foreground mt-2">Total Kejadian</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/80 bg-card shadow-sm">
              <p className="text-3xl font-bold text-amber-500">312</p>
              <p className="text-sm text-muted-foreground mt-2">Kecelakaan</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/80 bg-card shadow-sm">
              <p className="text-3xl font-bold text-blue-500">421</p>
              <p className="text-sm text-muted-foreground mt-2">Bencana</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-border/80 bg-card shadow-sm">
              <p className="text-3xl font-bold text-emerald-500">515</p>
              <p className="text-sm text-muted-foreground mt-2">Lainnya</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/80 bg-background py-10" data-reveal>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Image
                  src="/images/logo pmi-tangsel.png"
                  alt="Logo PMI Tangsel"
                  width={32}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
                <span className="font-bold">PMI Tangsel</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Emergency Response Hub PMI Kota Tangerang Selatan untuk penanganan bencana dan pertolongan masyarakat.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Fitur</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Peta Interaktif</li>
                <li>Command Center</li>
                <li>Manajemen Relawan</li>
                <li>Statistik Real-time</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Kontak Darurat</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Ambulans: 119</li>
                <li>Pemadam: 113</li>
                <li>Polisi: 110</li>
                <li>PMI: (021) 123-4567</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Lokasi</h3>
              <p className="text-sm text-muted-foreground">
                Jl. Cendekia Sektor 11, Ciater, Serpong<br />
                Kota Tangerang Selatan<br />
                Banten 15310
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 PMI Kota Tangerang Selatan. All rights reserved.</p>
            <p className="mt-2">Developed by PMI Tangsel WebDev Team</p>
          </div>
        </div>
      </footer>
    </div>
  )
}