"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

const TANGSEL_CENTER = [-6.295, 106.708];
const TANGSEL_BOUNDS = [
  [-6.42, 106.58],
  [-6.18, 106.84],
];

const INCIDENT_COLORS = {
  REPORTED: "#f59e0b",
  ON_PROCESS: "#ef4444",
  HANDLED: "#10b981",
  CLOSED: "#64748b",
};

const REQUEST_COLORS = {
  MENUNGGU: "#64748b",
  DALAM_PERJALANAN: "#f59e0b",
  PASIEN_DIANGKUT: "#0ea5e9",
  SELESAI: "#10b981",
};

const UNIT_COLORS = {
  STANDBY: "#22c55e",
  BERTUGAS: "#f59e0b",
  MAINTENANCE: "#6b7280",
};

const MOTOR_COLORS = {
  STANDBY: "#16a34a",
  BERTUGAS: "#f97316",
  MAINTENANCE: "#475569",
};

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

export default function OperationalMapInner({ incidents, requests, officers, units, motors = [] }) {
  return (
    <div className="relative h-[560px] overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={TANGSEL_CENTER}
        zoom={12}
        minZoom={11}
        maxZoom={18}
        maxBounds={TANGSEL_BOUNDS}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {incidents.map((item) => (
          <CircleMarker
            key={`incident-${item.id}`}
            center={[item.latitude, item.longitude]}
            radius={9}
            pathOptions={{
              color: INCIDENT_COLORS[item.status] || "#64748b",
              fillColor: INCIDENT_COLORS[item.status] || "#64748b",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{item.incidentCode}</p>
                <p>Jenis: {item.incidentType}</p>
                <p>Status: {item.status}</p>
                <p>Lokasi: {item.district}</p>
                <p>PIC: {item.assignedOfficerName || "-"}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {requests.map((item) => (
          <CircleMarker
            key={`request-${item.id}`}
            center={[item.pickupLatitude, item.pickupLongitude]}
            radius={7}
            pathOptions={{
              color: REQUEST_COLORS[item.status] || "#64748b",
              fillColor: REQUEST_COLORS[item.status] || "#64748b",
              fillOpacity: 0.65,
              weight: 2,
              dashArray: "4 3",
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{item.requestCode}</p>
                <p>Pasien: {item.patientName}</p>
                <p>Status: {item.status}</p>
                <p>Unit: {item.unitCode || "Belum diassign"}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {officers.map((item) => (
          <CircleMarker
            key={`officer-${item.id}`}
            center={[item.lastLatitude, item.lastLongitude]}
            radius={5}
            pathOptions={{
              color: item.onDuty ? "#2563eb" : "#94a3b8",
              fillColor: item.onDuty ? "#2563eb" : "#94a3b8",
              fillOpacity: 0.9,
              weight: 1,
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{item.fullName}</p>
                <p>Peran: {item.officerType || "PETUGAS"}</p>
                <p>Status Shift: {item.onDuty ? "On Duty" : "Off Duty"}</p>
                <p>Update: {new Date(item.lastLocationAt).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {units.map((item) => (
          <CircleMarker
            key={`unit-${item.id}`}
            center={[item.lastLatitude, item.lastLongitude]}
            radius={6}
            pathOptions={{
              color: UNIT_COLORS[item.status] || "#64748b",
              fillColor: UNIT_COLORS[item.status] || "#64748b",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{item.unitCode}</p>
                <p>Nama: {item.vehicleName}</p>
                <p>Status: {item.status}</p>
                <p>Update: {new Date(item.lastLocationAt).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {motors.map((item) => (
          <CircleMarker
            key={`motor-${item.id}`}
            center={[item.lastLatitude, item.lastLongitude]}
            radius={5}
            pathOptions={{
              color: MOTOR_COLORS[item.status] || "#475569",
              fillColor: MOTOR_COLORS[item.status] || "#475569",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">{item.unitCode}</p>
                <p>Nama: {item.vehicleName}</p>
                <p>Status: {item.status}</p>
                <p>Jenis: Armada Motor</p>
                <p>Update: {new Date(item.lastLocationAt).toLocaleString("id-ID")}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-700 shadow">
        <p className="mb-2 text-xs font-semibold text-slate-900">Legenda</p>
        <div className="space-y-1.5">
          <LegendItem color="#ef4444" label="Kejadian On Process" />
          <LegendItem color="#f59e0b" label="Kejadian/Request Aktif" />
          <LegendItem color="#0ea5e9" label="Request Pasien Diangkut" />
          <LegendItem color="#22c55e" label="Unit Standby" />
          <LegendItem color="#16a34a" label="Motor Standby" />
          <LegendItem color="#2563eb" label="Petugas On Duty" />
        </div>
      </div>
    </div>
  );
}
