"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrackPoint } from "@/lib/track";

export type TrackMapProps = {
  points: TrackPoint[];
  mountainLat: number;
  mountainLng: number;
};

function dot(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};border:3px solid white;border-radius:50%;width:${size}px;height:${size}px;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function summitIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#1d4ed8;
      border:3px solid white;
      border-radius:50% 50% 0 50%;
      width:16px;height:16px;
      transform:rotate(45deg);
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 14],
  });
}

/** Frame the whole route on first render — a recorded hike has fixed extents. */
function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [30, 30], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
}

export default function TrackMapInner({ points, mountainLat, mountainLng }: TrackMapProps) {
  const positions: [number, number][] = points.map((p) => [p[0], p[1]]);
  const start = positions[0];
  const end = positions[positions.length - 1];

  return (
    <MapContainer
      center={start ?? [mountainLat, mountainLng]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />

      {/* Casing under the route so it stays readable over busy topo tiles */}
      {positions.length > 1 && (
        <>
          <Polyline positions={positions} color="#ffffff" weight={7} opacity={0.7} />
          <Polyline positions={positions} color="#f97316" weight={4} opacity={0.95} />
        </>
      )}

      <Marker position={[mountainLat, mountainLng]} icon={summitIcon()} />
      {start && <Marker position={start} icon={dot("#22c55e", 12)} />}
      {end && positions.length > 1 && <Marker position={end} icon={dot("#ef4444", 12)} />}

      <FitRoute positions={positions} />
    </MapContainer>
  );
}
