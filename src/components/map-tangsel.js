"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

export default function MapTangsel({ kecamatanData = {}, onHoverKecamatan }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const labelMarkersRef = useRef(new Map())
  const kecDataRef = useRef(kecamatanData)
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState(null)
  const [kecamatanGeoJSON, setKecamatanGeoJSON] = useState(null)
  const [kelurahanGeoJSON, setKelurahanGeoJSON] = useState(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Keep ref in sync for use inside leaflet callbacks
  useEffect(() => {
    kecDataRef.current = kecamatanData
  }, [kecamatanData])

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoJSON = async () => {
      try {
        const [boundaryRes, kecamatanRes, kelurahanRes] = await Promise.all([
          fetch('/uploads/geojson/36.74_Kota_Tangerang_Selatan.geojson'),
          fetch('/uploads/geojson/36.74_kecamatan.geojson'),
          fetch('/uploads/geojson/36.74_kelurahan.geojson')
        ])
        const boundary = await boundaryRes.json()
        const kecamatan = await kecamatanRes.json()
        const kelurahan = await kelurahanRes.json()
        setBoundaryGeoJSON(boundary)
        setKecamatanGeoJSON(kecamatan)
        setKelurahanGeoJSON(kelurahan)
      } catch (error) {
        console.error('Error loading GeoJSON:', error)
      }
    }
    loadGeoJSON()
  }, [])

  const getKecStats = useCallback((kecName) => {
    const data = kecDataRef.current
    const key = Object.keys(data).find(
      (k) => k.toLowerCase() === kecName.toLowerCase()
    )
    return key ? data[key] : { bencana: 0, kecelakaan: 0, rujukan: 0 }
  }, [])

  const buildTooltipHtml = useCallback((name, stats, accentColor) => {
    const total = stats.bencana + stats.kecelakaan + stats.rujukan
    return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:180px;padding:0;">
        <div style="background:${accentColor};color:white;padding:8px 12px;border-radius:10px 10px 0 0;font-size:13px;font-weight:700;letter-spacing:0.3px;">
          📍 ${name}
        </div>
        <div style="padding:10px 12px;background:white;border-radius:0 0 10px 10px;">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <div style="flex:1;background:#fef2f2;border-radius:8px;padding:6px 8px;text-align:center;">
              <div style="font-size:16px;font-weight:800;color:#dc2626;">${stats.bencana}</div>
              <div style="font-size:9px;color:#991b1b;font-weight:600;margin-top:1px;">Bencana</div>
            </div>
            <div style="flex:1;background:#fef9c3;border-radius:8px;padding:6px 8px;text-align:center;">
              <div style="font-size:16px;font-weight:800;color:#ca8a04;">${stats.kecelakaan}</div>
              <div style="font-size:9px;color:#854d0e;font-weight:600;margin-top:1px;">Kecelakaan</div>
            </div>
            <div style="flex:1;background:#eff6ff;border-radius:8px;padding:6px 8px;text-align:center;">
              <div style="font-size:16px;font-weight:800;color:#2563eb;">${stats.rujukan}</div>
              <div style="font-size:9px;color:#1e40af;font-weight:600;margin-top:1px;">Rujukan</div>
            </div>
          </div>
          <div style="background:#f1f5f9;border-radius:6px;padding:4px 8px;text-align:center;font-size:10px;color:#475569;font-weight:600;">
            Total Kejadian: ${total}
          </div>
        </div>
      </div>
    `
  }, [])

  // Initialize map when GeoJSON is loaded
  useEffect(() => {
    if (!boundaryGeoJSON) return
    if (!mapRef.current) return

    let isMounted = true

    import('leaflet').then((L) => {
      if (!isMounted || !mapRef.current || leafletMapRef.current) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: [-6.3, 106.7],
        zoom: 12,
        zoomControl: false
      })

      leafletMapRef.current = map

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
      }).addTo(map)

      const boundaryLayer = L.geoJSON(boundaryGeoJSON, {
        style: {
          color: '#dc2626',
          weight: 3,
          opacity: 0.7,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '8, 6'
        }
      }).addTo(map)

      const kecamatanColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#84cc16',
      ]

      const darkenColor = (color, factor = 0.15) => {
        const hex = color.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`
      }

      // Kelurahan polygons
      if (kelurahanGeoJSON) {
        L.geoJSON(kelurahanGeoJSON, {
          style: (feature) => {
            const kecCode = feature.properties.kd_kecamatan || feature.properties.kd_dati2
            const kecIndex = kecamatanGeoJSON?.features.findIndex(kec => {
              const kecKecCode = kec.properties.kd_kecamatan || kec.properties.kd_dati2
              return kecKecCode === kecCode
            }) || 0
            const baseColor = kecamatanColors[kecIndex % kecamatanColors.length]
            return {
              color: 'white',
              weight: 1.5,
              opacity: 0.7,
              fillColor: baseColor,
              fillOpacity: 0.35
            }
          },
          onEachFeature: (feature, layer) => {
            const kecCode = feature.properties.kd_kecamatan || feature.properties.kd_dati2
            const kecIndex = kecamatanGeoJSON?.features.findIndex(kec => {
              const kecKecCode = kec.properties.kd_kecamatan || kec.properties.kd_dati2
              return kecKecCode === kecCode
            }) || 0
            const originalColor = kecamatanColors[kecIndex % kecamatanColors.length]
            const hoverColor = darkenColor(originalColor)

            layer.on('mouseover', () => {
              layer.setStyle({ weight: 2, opacity: 1, fillColor: hoverColor, fillOpacity: 0.55 })
              layer.bringToFront()
            })
            layer.on('mouseout', () => {
              layer.setStyle({ weight: 1.5, opacity: 0.7, fillColor: originalColor, fillOpacity: 0.35 })
            })

            const kelName = feature.properties.nm_kelurahan || feature.properties.name || 'Kelurahan'
            layer.bindTooltip(
              `<div style="font-family:-apple-system,sans-serif;font-size:12px;font-weight:600;padding:4px 8px;">📌 ${kelName}</div>`,
              { permanent: false, direction: 'top', offset: [0, -5], className: 'map-tooltip-clean' }
            )
          }
        }).addTo(map)
      }

      // Kecamatan borders
      if (kecamatanGeoJSON) {
        L.geoJSON(kecamatanGeoJSON, {
          style: () => ({
            color: '#334155',
            weight: 2.5,
            opacity: 0.6,
            fillOpacity: 0,
            dashArray: '6, 4'
          }),
          onEachFeature: (feature, layer) => {
            const kecName = feature.properties.nm_kecamatan || feature.properties.name || 'Kecamatan'

            layer.on('mouseover', () => {
              layer.setStyle({ weight: 3.5, opacity: 1 })
              layer.bringToFront()
              const stats = getKecStats(kecName)
              onHoverKecamatan?.(kecName, stats)
            })
            layer.on('mouseout', () => {
              layer.setStyle({ weight: 2.5, opacity: 0.6 })
              onHoverKecamatan?.(null, null)
            })
          }
        }).addTo(map)
      }

      const bounds = boundaryLayer.getBounds()
      map.fitBounds(bounds, { padding: [20, 20] })
      map.setMaxBounds(bounds.pad(0.2))

      // Kecamatan labels
      if (kecamatanGeoJSON) {
        kecamatanGeoJSON.features.forEach((feature) => {
          const tempLayer = L.geoJSON(feature)
          const center = tempLayer.getBounds().getCenter()
          const kecName = feature.properties.nm_kecamatan || feature.properties.name || 'Kec'
          const index = kecamatanGeoJSON.features.indexOf(feature)
          const color = kecamatanColors[index % kecamatanColors.length]

          const labelMarker = L.marker([center.lat, center.lng], {
            icon: L.divIcon({
              html: `<div style="background:${color};color:white;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);letter-spacing:0.3px;border:2px solid rgba(255,255,255,0.6);">${kecName}</div>`,
              className: 'kecamatan-label',
              iconSize: null,
              iconAnchor: [50, 12]
            }),
            interactive: true
          }).addTo(map)

          labelMarkersRef.current.set(kecName, { marker: labelMarker, color })

          let isPinned = false

          labelMarker.on('mouseover', () => {
            if (!isPinned) {
              const stats = getKecStats(kecName)
              const html = buildTooltipHtml(kecName, stats, color)
              labelMarker.unbindTooltip()
              labelMarker.bindTooltip(html, {
                permanent: false,
                direction: 'top',
                offset: [0, -12],
                className: 'map-tooltip-clean',
                opacity: 1
              })
              labelMarker.openTooltip()
              onHoverKecamatan?.(kecName, stats)
            }
            const icon = labelMarker.getIcon()
            icon.options.html = `<div style="background:#dc2626;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(220,38,38,0.4);letter-spacing:0.3px;border:2px solid rgba(255,255,255,0.8);transform:scale(1.08);">${kecName}</div>`
            labelMarker.setIcon(icon)
          })

          labelMarker.on('mouseout', () => {
            if (!isPinned) {
              labelMarker.closeTooltip()
              onHoverKecamatan?.(null, null)
            }
            if (!isPinned) {
              const icon = labelMarker.getIcon()
              icon.options.html = `<div style="background:${color};color:white;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);letter-spacing:0.3px;border:2px solid rgba(255,255,255,0.6);">${kecName}</div>`
              labelMarker.setIcon(icon)
            }
          })

          labelMarker.on('click', (e) => {
            e.originalEvent.stopPropagation()
            isPinned = !isPinned
            if (isPinned) {
              const stats = getKecStats(kecName)
              const html = buildTooltipHtml(kecName, stats, color)
              labelMarker.unbindTooltip()
              labelMarker.bindTooltip(html, {
                permanent: true,
                direction: 'top',
                offset: [0, -12],
                className: 'map-tooltip-clean',
                opacity: 1
              })
              labelMarker.openTooltip()
            } else {
              labelMarker.closeTooltip()
              labelMarker.unbindTooltip()
              const icon = labelMarker.getIcon()
              icon.options.html = `<div style="background:${color};color:white;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);letter-spacing:0.3px;border:2px solid rgba(255,255,255,0.6);">${kecName}</div>`
              labelMarker.setIcon(icon)
            }
          })
        })
      }

      const markerDefs = [
        {
          position: [-6.3, 106.7],
          popup: '<div style="text-align:center;font-family:-apple-system,sans-serif"><strong style="color:#dc2626">🏛️ PMI Kota Tangerang Selatan</strong><br/><small>Kantor Pusat PMI</small></div>'
        },
        {
          position: [-6.25, 106.68],
          popup: '<div style="text-align:center;font-family:-apple-system,sans-serif"><strong style="color:#2563eb">🏥 RS PMI Tangerang Selatan</strong><br/><small>Pusat Kesehatan</small></div>'
        },
        {
          position: [-6.35, 106.72],
          popup: '<div style="text-align:center;font-family:-apple-system,sans-serif"><strong style="color:#16a34a">🚑 Posko Ambulans</strong><br/><small>Unit Darurat</small></div>'
        }
      ]

      markerDefs.forEach(({ position, popup }) => {
        L.marker(position).addTo(map).bindPopup(popup)
      })

      if (isMounted) {
        setIsMapReady(true)
      }
    })

    return () => {
      isMounted = false
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        labelMarkersRef.current.clear()
        setIsMapReady(false)
      }
    }
  }, [boundaryGeoJSON, kecamatanGeoJSON, kelurahanGeoJSON, getKecStats, buildTooltipHtml, onHoverKecamatan])

  // Sync map state via localStorage
  useEffect(() => {
    if (!isMapReady || !leafletMapRef.current) return
    const map = leafletMapRef.current

    const handleMapMove = () => {
      const center = map.getCenter()
      localStorage.setItem('sharedMapCenter', JSON.stringify([center.lat, center.lng]))
      localStorage.setItem('sharedMapZoom', map.getZoom().toString())
    }

    map.on('moveend', handleMapMove)
    map.on('zoomend', handleMapMove)

    const savedCenter = localStorage.getItem('sharedMapCenter')
    const savedZoom = localStorage.getItem('sharedMapZoom')
    if (savedCenter && savedZoom) {
      try {
        map.setView(JSON.parse(savedCenter), parseInt(savedZoom))
      } catch (e) {
        console.error('Error restoring map state:', e)
      }
    }

    const handleStorageChange = (e) => {
      if ((e.key === 'sharedMapCenter' || e.key === 'sharedMapZoom') && leafletMapRef.current) {
        try {
          const center = JSON.parse(localStorage.getItem('sharedMapCenter'))
          const zoom = parseInt(localStorage.getItem('sharedMapZoom'))
          leafletMapRef.current.setView(center, zoom, { animate: false })
        } catch (err) {
          console.error('Error syncing map state:', err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      map.off('moveend', handleMapMove)
      map.off('zoomend', handleMapMove)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isMapReady])

  return (
    <>
      <style>{`
        .map-tooltip-clean {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .map-tooltip-clean::before {
          display: none !important;
        }
        .kecamatan-label {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <div
        ref={mapRef}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="z-10"
      />
    </>
  )
}
