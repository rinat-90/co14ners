/**
 * Seeds trail geometry from GPX files into the Trail.geometry field.
 *
 * Usage:
 *   cd packages/api
 *   bun run db:seed-gpx
 *
 * File layout:
 *   packages/api/prisma/gpx/
 *     Mount Elbert/
 *       North Elbert Trail.gpx
 *       South Elbert Trail.gpx
 *     Longs Peak/
 *       Keyhole Route.gpx
 *     ...
 *
 * Folder name  = exact mountain name as in the DB
 * File name    = exact trail name as in the DB (minus .gpx)
 *
 * Re-running is safe — always overwrites existing geometry.
 */

import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const GPX_DIR = new URL("./gpx", import.meta.url).pathname;

/** Extract [lon, lat] pairs from a GPX string. Handles both attribute orderings. */
function parseGpxCoordinates(gpx: string): [number, number][] {
  const coords: [number, number][] = [];
  const trkptRe = /<trkpt\b([^>]+)>/g;
  let m: RegExpExecArray | null;
  while ((m = trkptRe.exec(gpx)) !== null) {
    const attrs = m[1];
    const lon = /\blon="([^"]+)"/.exec(attrs)?.[1];
    const lat = /\blat="([^"]+)"/.exec(attrs)?.[1];
    if (lon != null && lat != null) {
      coords.push([parseFloat(lon), parseFloat(lat)]);
    }
  }
  return coords;
}

async function main() {
  if (!existsSync(GPX_DIR)) {
    console.error(`GPX directory not found: ${GPX_DIR}`);
    console.error("Create packages/api/prisma/gpx/<Mountain Name>/<Trail Name>.gpx");
    process.exit(1);
  }

  const mountains = await prisma.mountain.findMany({ include: { trails: true } });
  const mountainMap = new Map(mountains.map((m) => [m.name, m]));

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const mountainDirs = readdirSync(GPX_DIR, { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  );

  if (mountainDirs.length === 0) {
    console.log("No mountain folders found in prisma/gpx/. Nothing to do.");
    return;
  }

  for (const dir of mountainDirs) {
    const mountain = mountainMap.get(dir.name);
    if (!mountain) {
      console.warn(`⚠  Mountain not found in DB: "${dir.name}" — skipping folder`);
      skipped++;
      continue;
    }

    const gpxFiles = readdirSync(join(GPX_DIR, dir.name), { withFileTypes: true }).filter(
      (f) => f.isFile() && f.name.toLowerCase().endsWith(".gpx"),
    );

    for (const file of gpxFiles) {
      const trailName = file.name.replace(/\.gpx$/i, "");
      const trail = mountain.trails.find((t) => t.name === trailName);

      if (!trail) {
        console.warn(`  ⚠  Trail not found in DB: "${trailName}" on ${dir.name} — skipping`);
        skipped++;
        continue;
      }

      const gpxContent = readFileSync(join(GPX_DIR, dir.name, file.name), "utf-8");
      const coords = parseGpxCoordinates(gpxContent);

      if (coords.length < 2) {
        console.error(`  ✗  No track points in ${file.name}`);
        errors++;
        continue;
      }

      await prisma.trail.update({
        where: { id: trail.id },
        data: { geometry: { type: "LineString", coordinates: coords } },
      });

      console.log(`  ✓  ${dir.name} / ${trailName} — ${coords.length} pts`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
