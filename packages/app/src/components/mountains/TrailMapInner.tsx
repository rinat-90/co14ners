"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack/Next.js asset handling
const peakIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#1d4ed8;
    border:2px solid white;
    border-radius:50% 50% 50% 0;
    width:22px;height:22px;
    transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -24],
});

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const TRAIL_COLORS = [
  "#1d4ed8", // blue
  "#15803d", // green
  "#b45309", // amber
  "#7c3aed", // purple
  "#be123c", // rose
];

interface Trail {
  id: string;
  name: string;
  difficulty: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry?: any;
}

interface TrailMapInnerProps {
  latitude: number;
  longitude: number;
  name: string;
  trails: Trail[];
}

/** Flatten geometry coordinates to [lon, lat] pairs regardless of type */
function flattenCoords(geometry: { type: string; coordinates: unknown }): [number, number][] {
  if (geometry.type === "LineString") {
    return geometry.coordinates as [number, number][];
  }
  if (geometry.type === "Polygon") {
    // Outer ring only (index 0); holes ignored for bounds
    return (geometry.coordinates as [number, number][][])[0] ?? [];
  }
  return [];
}

/** Auto-fit map bounds to show all trail geometry + peak */
function FitBounds({ latitude, longitude, trails }: { latitude: number; longitude: number; trails: Trail[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [[latitude, longitude]];
    for (const t of trails) {
      if (t.geometry?.coordinates) {
        for (const [lon, lat] of flattenCoords(t.geometry)) {
          if (distanceKm(latitude, longitude, lat, lon) <= 15) {
            points.push([lat, lon]);
          }
        }
      }
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }
  }, [map, latitude, longitude, trails]);
  return null;
}

export default function TrailMapInner({ latitude, longitude, name, trails }: TrailMapInnerProps) {
  const trailsWithGeo = trails.filter((t) => t.geometry?.coordinates && t.geometry.coordinates.length > 1);

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />

      {/* Summit marker */}
      <Marker position={[latitude, longitude]} icon={peakIcon}>
        <Popup>
          <strong>{name}</strong>
        </Popup>
      </Marker>

      {/* Trail shapes — Polyline for LineString, Polygon for Polygon */}
      {trailsWithGeo.map((trail, i) => {
        const color = TRAIL_COLORS[i % TRAIL_COLORS.length];
        const geo = trail.geometry!;

        if (geo.type === "Polygon") {
          // Convert each ring: [lon, lat][] → [lat, lon][]
          const rings = (geo.coordinates as [number, number][][]).map((ring) =>
            ring
              .filter(([lon, lat]) => distanceKm(latitude, longitude, lat, lon) <= 15)
              .map(([lon, lat]) => [lat, lon] as [number, number]),
          );
          return (
            <Polygon
              key={trail.id}
              positions={rings}
              pathOptions={{ color, weight: 2.5, opacity: 0.9, fillOpacity: 0.2 }}
            >
              <Popup>{trail.name}</Popup>
            </Polygon>
          );
        }

        // Default: LineString
        const positions = (geo.coordinates as [number, number][])
          .filter(([lon, lat]) => distanceKm(latitude, longitude, lat, lon) <= 15)
          .map(([lon, lat]) => [lat, lon] as [number, number]);
        return (
          <Polyline
            key={trail.id}
            positions={positions}
            pathOptions={{ color, weight: 3.5, opacity: 0.85 }}
          >
            <Popup>{trail.name}</Popup>
          </Polyline>
        );
      })}

      <FitBounds latitude={latitude} longitude={longitude} trails={trails} />
    </MapContainer>
  );
}
