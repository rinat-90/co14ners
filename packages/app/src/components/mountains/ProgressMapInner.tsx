"use client";

import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const COLORADO_CENTER: [number, number] = [38.9, -105.5];

export type PeakStatus = "summited" | "saved" | "unvisited";

export interface ProgressPeak {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  altitude: number;
  difficulty: string;
  status: PeakStatus;
}

const STATUS_COLORS: Record<PeakStatus, string> = {
  summited: "#15803d",
  saved:    "#f59e0b",
  unvisited: "#94a3b8",
};

function makeIcon(status: PeakStatus) {
  const color = STATUS_COLORS[status];
  const size = status === "summited" ? 16 : 13;
  const ring = status === "summited" ? "3px" : "2px";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      border:${ring} solid white;
      border-radius:50%;
      width:${size}px;height:${size}px;
      box-shadow:0 2px 5px rgba(0,0,0,0.45);
      cursor:pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

export default function ProgressMapInner({ peaks }: { peaks: ProgressPeak[] }) {
  const router = useRouter();

  return (
    <MapContainer
      center={COLORADO_CENTER}
      zoom={7}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      minZoom={6}
    >
      <TileLayer
        attribution='Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />
      {peaks.map((peak) => (
        <Marker
          key={peak.id}
          position={[peak.latitude, peak.longitude]}
          icon={makeIcon(peak.status)}
          eventHandlers={{ click: () => router.push(`/mountains/${peak.slug}`) }}
        >
          <Popup>
            <div style={{ fontFamily: "inherit", lineHeight: 1.5 }}>
              <strong style={{ fontSize: 13 }}>{peak.name}</strong><br />
              <span style={{ fontSize: 12, color: "#64748b" }}>{peak.altitude.toLocaleString()} ft</span>
              {peak.status === "summited" && (
                <span style={{ display: "block", fontSize: 11, color: "#15803d", fontWeight: 600 }}>✓ Summited</span>
              )}
              {peak.status === "saved" && (
                <span style={{ display: "block", fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>★ Saved</span>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
