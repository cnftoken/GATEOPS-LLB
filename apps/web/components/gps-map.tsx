"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { KomandoData } from "@/lib/types";

// Ikon default Leaflet butuh perbaikan URL pada bundler (PRD 4, peta).
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function GpsMap({ points }: { points: KomandoData["outside"] }) {
  const located = points.filter((p) => p.latitude !== null && p.longitude !== null);
  const first = located[0];
  const center: [number, number] = first
    ? [first.latitude as number, first.longitude as number]
    : [-6.2, 106.8];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-[420px] w-full rounded-card"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {located.map((p) => (
        <Marker key={p.id} position={[p.latitude as number, p.longitude as number]} icon={icon}>
          <Popup>
            <strong>
              {p.pangkat} {p.name}
            </strong>
            <br />
            NRP {p.nrp}
            <br />
            {p.tujuan}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
