"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Ambulance,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Droplets,
  Filter,
  Shield,
  UserRound,
  Wind,
  X,
} from "lucide-react"
import MapTangsel from "@/components/map-tangsel"

function toInputDate(date) {
  return date.toISOString().slice(0, 10)
}

// iOS-style widget stat card
const TONE_GRADIENT = {
  info: "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-800",
  success: "bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-800",
  danger: "bg-gradient-to-br from-red-500 to-red-700 border-red-800",
  warning: "bg-gradient-to-br from-orange-500 to-orange-700 border-orange-800",
  default: "bg-gradient-to-br from-slate-500 to-slate-700 border-slate-800",
}

function StatCard({ title, value, subtitle, icon: Icon, tone = "default" }) {
  const gradient = TONE_GRADIENT[tone] || TONE_GRADIENT.default
  return (
    <div className={`min-h-[78px] rounded-xl border shadow-sm ${gradient} px-3 py-2`}>
      <div className="flex min-h-[58px] items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/20">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-white/80">{title}</p>
          <p className="mt-0.5 text-base font-bold leading-tight text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-[10px] font-medium leading-tight text-white/95">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function GlassWidget({ icon: Icon, iconBg, label, value, sub, className = "" }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-3 shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-white/10 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="truncate text-lg font-extrabold leading-tight text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-1.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  )
}

// Hover detail card
function HoverDetailCard({ name, stats }) {
  if (!name) return null
  const total = (stats?.bencana || 0) + (stats?.kecelakaan || 0) + (stats?.rujukan || 0)
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">📍 {name}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-red-50 px-2 py-1.5 text-center dark:bg-red-500/15">
          <p className="text-base font-extrabold text-red-600 dark:text-red-400">{stats?.bencana || 0}</p>
          <p className="text-[9px] font-semibold text-red-700/70 dark:text-red-300/70">Bencana</p>
        </div>
        <div className="rounded-xl bg-amber-50 px-2 py-1.5 text-center dark:bg-amber-500/15">
          <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{stats?.kecelakaan || 0}</p>
          <p className="text-[9px] font-semibold text-amber-700/70 dark:text-amber-300/70">Kecelakaan</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-2 py-1.5 text-center dark:bg-blue-500/15">
          <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">{stats?.rujukan || 0}</p>
          <p className="text-[9px] font-semibold text-blue-700/70 dark:text-blue-300/70">Rujukan</p>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-slate-100 py-1 text-center text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        Total: {total} kejadian
      </div>
    </div>
  )
}

export default function MapInfographicHero() {
  const now = new Date()
  const [dateTo, setDateTo] = useState(toInputDate(now))
  const [dateFrom, setDateFrom] = useState(toInputDate(new Date(now.getTime() - 6 * 86400000)))
  const [timePreset, setTimePreset] = useState("7d")
  const [showStats, setShowStats] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [showRecap, setShowRecap] = useState(false)

  const [kecamatanOptions, setKecamatanOptions] = useState([])
  const [kelurahanOptions, setKelurahanOptions] = useState([])
  const [selectedKecamatan, setSelectedKecamatan] = useState("all")
  const [selectedKelurahan, setSelectedKelurahan] = useState("all")

  const [hoveredKec, setHoveredKec] = useState(null)
  const [hoveredStats, setHoveredStats] = useState(null)
  const [kecamatanData, setKecamatanData] = useState({})

  const [weather, setWeather] = useState({
    temp: "-",
    wind: "-",
    condition: "Memuat cuaca...",
  })
  const [summary, setSummary] = useState({
    totalDays: 1,
    armada: 0,
    armadaSiaga: 0,
    relawan: 0,
    relawanL: 0,
    relawanP: 0,
    bencana: 0,
    kecelakaan: 0,
    stokDarah: { A: 0, B: 0, AB: 0, O: 0 },
    recap: [],
  })
  const [summaryLoading, setSummaryLoading] = useState(false)

  const handleHoverKecamatan = useCallback((name, stats) => {
    setHoveredKec(name)
    setHoveredStats(stats)
  }, [])

  useEffect(() => {
    const loadWilayah = async () => {
      try {
        const [kecRes, kelRes] = await Promise.all([
          fetch("/uploads/geojson/36.74_kecamatan.geojson"),
          fetch("/uploads/geojson/36.74_kelurahan.geojson"),
        ])
        const kec = await kecRes.json()
        const kel = await kelRes.json()

        const kecByCode = new Map(
          (kec.features || []).map((item, index) => [
            String(item.properties?.kd_kecamatan || item.properties?.kd_dati2 || index),
            item.properties?.nm_kecamatan || item.properties?.name || `Kecamatan ${index + 1}`,
          ])
        )

        const normalizedKec = (kec.features || []).map((item, index) => ({
          id: item.properties?.nm_kecamatan || item.properties?.name || `Kecamatan ${index + 1}`,
          name: item.properties?.nm_kecamatan || item.properties?.name || `Kecamatan ${index + 1}`,
        }))

        const normalizedKel = (kel.features || []).map((item, index) => ({
          id: item.properties?.nm_kelurahan || item.properties?.name || `Kelurahan ${index + 1}`,
          kecamatanId:
            kecByCode.get(String(item.properties?.kd_kecamatan || item.properties?.kd_dati2 || "")) || "",
          name: item.properties?.nm_kelurahan || item.properties?.name || `Kelurahan ${index + 1}`,
        }))

        setKecamatanOptions(normalizedKec)
        setKelurahanOptions(normalizedKel)
      } catch (error) {
        console.error("Gagal memuat data wilayah:", error)
      }
    }

    loadWilayah()
  }, [])

  useEffect(() => {
    if (timePreset === "custom") return
    const end = new Date()
    let start = new Date(end)

    if (timePreset === "today") start = new Date(end)
    if (timePreset === "7d") start = new Date(end.getTime() - 6 * 86400000)
    if (timePreset === "30d") start = new Date(end.getTime() - 29 * 86400000)

    setDateTo(toInputDate(end))
    setDateFrom(toInputDate(start))
  }, [timePreset])

  useEffect(() => {
    const loadWeather = async () => {
      try {
        // BMKG API for Kota Tangerang Selatan (Ciputat representative)
        const res = await fetch(
          "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=36.74.04.1003"
        )
        const data = await res.json()
        const forecasts = data?.data?.[0]?.cuaca?.flat() || []
        // Find the closest forecast to current time
        const now = new Date()
        let closest = forecasts[0]
        if (forecasts.length > 1) {
          let minDiff = Infinity
          for (const f of forecasts) {
            const diff = Math.abs(new Date(f.local_datetime).getTime() - now.getTime())
            if (diff < minDiff) {
              minDiff = diff
              closest = f
            }
          }
        }
        if (!closest) return

        setWeather({
          temp: `${Math.round(closest.t)}°C`,
          wind: `${Math.round(closest.ws)} km/jam`,
          condition: closest.weather_desc || "Kondisi berubah",
          humidity: `${closest.hu}%`,
        })
      } catch (error) {
        console.error("Gagal memuat cuaca BMKG:", error)
      }
    }

    loadWeather()
  }, [])

  const kelurahanFiltered = useMemo(() => {
    if (selectedKecamatan === "all") return kelurahanOptions
    return kelurahanOptions.filter((item) => item.kecamatanId === selectedKecamatan)
  }, [kelurahanOptions, selectedKecamatan])

  useEffect(() => {
    if (selectedKelurahan === "all") return
    const valid = kelurahanFiltered.some((item) => item.id === selectedKelurahan)
    if (!valid) setSelectedKelurahan("all")
  }, [kelurahanFiltered, selectedKelurahan])

  useEffect(() => {
    const syncSummary = async () => {
      setSummaryLoading(true)
      try {
        const params = new URLSearchParams({
          dateFrom,
          dateTo,
          kecamatan: selectedKecamatan,
          kelurahan: selectedKelurahan,
        })

        const response = await fetch(`/api/infographic/summary?${params.toString()}`, {
          cache: "no-store",
        })
        const result = await response.json()
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Gagal mengambil ringkasan data")
        }
        setSummary(result.data)
      } catch (error) {
        console.error("Gagal memuat ringkasan infografis:", error)
      } finally {
        setSummaryLoading(false)
      }
    }

    syncSummary()
  }, [dateFrom, dateTo, selectedKecamatan, selectedKelurahan])

  return (
    <section className="pb-12 pt-8 md:pt-10" id="hero-map">
      <div className="relative w-full overflow-hidden border-y border-border/80 bg-card">
        <div className="h-[100vh] min-h-[640px] w-full">
          <MapTangsel />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/95 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background/95 to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {/* <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-300/70 bg-background/85 px-3 py-1.5 text-xs font-semibold text-red-600 backdrop-blur">
              <CloudSun className="h-3.5 w-3.5" />
              Peta Infografis Respons PMI Tangsel
            </div> */}

            <div className="mt-0 flex flex-wrap items-end justify-between gap-3">
              <div className="rounded-xl bg-slate-900/25 px-4 py-3 backdrop-blur-sm dark:bg-slate-800/30">
                <h2 className="text-2xl font-bold tracking-tight text-white md:text-5xl">Rapid Response Map</h2>
                <p className="mt-2 max-w-1xl text-sm text-slate-100 md:text-base">
                  Pantau kondisi cuaca, kesiapan armada, relawan, dan rekap kejadian harian dalam satu tampilan peta interaktif.
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {summaryLoading ? "Menyinkronkan data dari database..." : "Data infografis tersinkron dengan API database."}
            </p>
          </div>
        </div>

        {showStats ? (
          <div className="pointer-events-none absolute right-0 top-0 z-30 flex w-52 flex-col justify-start p-2 md:bottom-0 md:w-80 md:p-3">
            <div className="pointer-events-auto flex w-full flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-xl border border-white/30 bg-white/70 p-2 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/50 max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-5rem)]">
              <button
                type="button"
                onClick={() => setShowStats(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-red-300 hover:text-red-500"
              >
                <ChevronDown className="h-4 w-4" />
                Sembunyikan Statistik
              </button>

              {/* Filter controls */}
              <div className="rounded-lg border border-white/30 bg-white/80 p-2 dark:border-white/10 dark:bg-white/10">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Filter className="h-3 w-3" />
                  Filter Data
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <select
                    value={timePreset}
                    onChange={(e) => setTimePreset(e.target.value)}
                    className="col-span-2 h-7 rounded-md border border-border/80 bg-background/90 px-2 text-[11px]"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="7d">7 Hari</option>
                    <option value="30d">30 Hari</option>
                    <option value="custom">Kustom</option>
                  </select>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setTimePreset("custom"); setDateFrom(e.target.value) }}
                    className="h-7 rounded-md border border-border/80 bg-background/90 px-1.5 text-[11px]"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setTimePreset("custom"); setDateTo(e.target.value) }}
                    className="h-7 rounded-md border border-border/80 bg-background/90 px-1.5 text-[11px]"
                  />
                  <select
                    value={selectedKecamatan}
                    onChange={(e) => setSelectedKecamatan(e.target.value)}
                    className="h-7 rounded-md border border-border/80 bg-background/90 px-1.5 text-[11px]"
                  >
                    <option value="all">Semua Kecamatan</option>
                    {kecamatanOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedKelurahan}
                    onChange={(e) => setSelectedKelurahan(e.target.value)}
                    className="h-7 rounded-md border border-border/80 bg-background/90 px-1.5 text-[11px]"
                  >
                    <option value="all">Semua Kelurahan</option>
                    {kelurahanFiltered.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stat cards */}
              <StatCard
                title="Cuaca Saat Ini"
                value={weather.temp}
                subtitle={weather.condition}
                icon={CloudSun}
                tone="info"
              />
              <StatCard
                title="Kecepatan Angin"
                value={weather.wind}
                subtitle="Sumber: BMKG Kota Tangsel"
                icon={Wind}
              />
              <StatCard
                title="Jumlah Armada"
                value={`${summary.armada} Unit`}
                subtitle={`${summary.armadaSiaga} ambulans terdaftar`}
                icon={Ambulance}
                tone="success"
              />
              <StatCard
                title="Jumlah Relawan"
                value={`L ${summary.relawanL} • P ${summary.relawanP}`}
                subtitle={`Total ${summary.relawan} personel aktif`}
                icon={UserRound}
              />
              <StatCard
                title="Kejadian Bencana"
                value={summary.bencana}
                subtitle={`${summary.totalDays} hari terakhir`}
                icon={AlertTriangle}
                tone="danger"
              />
              <StatCard
                title="Kecelakaan"
                value={summary.kecelakaan}
                subtitle="Laporan kecelakaan terverifikasi"
                icon={Shield}
                tone="danger"
              />

              {/* Blood stock per type */}
              <div className="rounded-xl border border-white/30 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stok Darah</p>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {["A", "B", "AB", "O"].map((type) => (
                    <div key={type} className="rounded-lg bg-gradient-to-br from-red-500 to-red-700 px-1.5 py-1.5 text-center">
                      <p className="text-[9px] font-bold leading-tight text-white/75">Gol. {type}</p>
                      <p className="text-xs font-extrabold leading-tight text-white">{summary.stokDarah?.[type] ?? 0}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[9px] leading-tight text-slate-400 dark:text-slate-500">
                  Total: {(summary.stokDarah?.A ?? 0) + (summary.stokDarah?.B ?? 0) + (summary.stokDarah?.AB ?? 0) + (summary.stokDarah?.O ?? 0)} kantong
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!showStats ? (
          <div className="pointer-events-none absolute right-0 top-0 z-40 p-2 md:p-3">
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:border-red-300 hover:text-red-500"
            >
              <ChevronUp className="h-4 w-4" />
              Tampilkan Statistik
            </button>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2">
            <Link
              href="/lapor"
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600"
            >
              <Shield className="h-4 w-4" />
              Lapor Kejadian Sekarang
            </Link>
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/70 px-4 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              Hubungi PMI: 119 / (021) 123-4567
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
