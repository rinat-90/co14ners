/**
 * Pre-caching map tiles for a hike.
 *
 * Above treeline there is no signal, which is exactly where the tracker's map
 * matters most. The service worker caches every tile the app requests (see the
 * `map-tile-cache` rule in next.config.ts), but only tiles already looked at —
 * so before leaving the trailhead we walk the area's tile pyramid and request
 * each one, letting the worker store it.
 */

export type TileCoord = { z: number; x: number; y: number };
export type Bounds = { north: number; south: number; east: number; west: number };

/**
 * Zooms worth storing. z12 frames the whole approach, z15 is close enough to
 * see which side of a gully you are on. Going one level deeper would roughly
 * quadruple the download for detail the phone screen barely resolves.
 */
export const OFFLINE_ZOOMS = [12, 13, 14, 15];

/** Refuse absurd requests rather than silently hammering the tile server. */
export const MAX_TILES = 1200;

/**
 * Measured against OpenTopoMap: a shaded-relief tile runs ~25 KB deep in and
 * ~50 KB at the coarser zooms where more terrain fits in the frame. Used only to
 * warn about the download size before someone starts it on one bar of signal.
 */
const AVG_TILE_BYTES = 30 * 1024;

export function estimatedMegabytes(tileCount: number): number {
  return (tileCount * AVG_TILE_BYTES) / (1024 * 1024);
}

const TILE_SUBDOMAINS = ["a", "b", "c"];

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

/**
 * The exact URL Leaflet would request, subdomain included — a tile cached under
 * a different subdomain is a different cache key and would be a wasted download.
 * Mirrors Leaflet's own `subdomains[abs(x + y) % length]`.
 */
export function tileUrl({ z, x, y }: TileCoord): string {
  const subdomain = TILE_SUBDOMAINS[Math.abs(x + y) % TILE_SUBDOMAINS.length];
  return `https://${subdomain}.tile.opentopomap.org/${z}/${x}/${y}.png`;
}

/** Every tile covering `bounds` at each zoom, coarsest first. */
export function tilesForBounds(bounds: Bounds, zooms: number[] = OFFLINE_ZOOMS): TileCoord[] {
  const tiles: TileCoord[] = [];

  for (const z of zooms) {
    const minX = lonToTileX(bounds.west, z);
    const maxX = lonToTileX(bounds.east, z);
    // Tile Y runs north to south, so the northern edge gives the lower index.
    const minY = latToTileY(bounds.north, z);
    const maxY = latToTileY(bounds.south, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) tiles.push({ z, x, y });
    }
  }

  return tiles;
}

/** Bounding box around a route or a summit, padded by `padDegrees` on each side. */
export function boundsAround(
  positions: [number, number][],
  padDegrees = 0.03
): Bounds | null {
  if (positions.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const [lat, lng] of positions) {
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    west = Math.min(west, lng);
  }

  return {
    north: Math.min(90, north + padDegrees),
    south: Math.max(-90, south - padDegrees),
    east: Math.min(180, east + padDegrees),
    west: Math.max(-180, west - padDegrees),
  };
}

const CACHE_NAME = "map-tile-cache";

async function tileCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** How many of `tiles` are already stored, so the UI can say "ready" honestly. */
export async function countCached(tiles: TileCoord[]): Promise<number> {
  const cache = await tileCache();
  if (!cache) return 0;

  let cached = 0;
  for (const tile of tiles) {
    if (await cache.match(tileUrl(tile))) cached++;
  }
  return cached;
}

export type DownloadProgress = { done: number; total: number; failed: number };

/**
 * Request every tile so the service worker stores it. Runs a few at a time —
 * a serial loop takes minutes over a trailhead's one bar of signal, and a
 * thousand parallel requests get us rate-limited by a volunteer tile server.
 *
 * `no-cors` because that is how Leaflet fetches them; the response is opaque and
 * unreadable here, which is fine — the worker only has to store it.
 */
export async function downloadTiles(
  tiles: TileCoord[],
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<DownloadProgress> {
  const CONCURRENCY = 6;
  const progress: DownloadProgress = { done: 0, total: tiles.length, failed: 0 };
  const cache = await tileCache();
  let next = 0;

  async function worker() {
    while (next < tiles.length) {
      if (signal?.aborted) return;
      const tile = tiles[next++];
      const url = tileUrl(tile);

      try {
        // Skip what a previous download already stored, so a resumed or repeated
        // run costs nothing.
        if (!(await cache?.match(url))) {
          await fetch(url, { mode: "no-cors", signal });
        }
      } catch {
        // One missing tile is a grey square, not a failed download.
        progress.failed++;
      }

      progress.done++;
      onProgress({ ...progress });
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return progress;
}
