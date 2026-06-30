/**
 * Seeds standard route trails for all Colorado 14ers.
 * Run with: bun run db:seed-trails
 *
 * Safe to re-run — uses upsert keyed on (mountainId, name).
 * Source: 14ers.com standard/easiest routes per peak.
 */

import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

interface TrailSeed {
  name: string;
  difficulty: Difficulty;
  trailheadElevation?: number;
  elevationGain?: number;
  roundTripMiles?: number;
  estimatedHours?: number;
  description?: string;
}

// Keyed by exact mountain name as in seed.ts
const TRAILS: Record<string, TrailSeed[]> = {
  "Mount Elbert": [
    { name: "South Elbert Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 10040, elevationGain: 4400, roundTripMiles: 9.5, estimatedHours: 7.0, description: "The most popular route on Colorado's highest peak, well-maintained singletrack to the summit via the southeast ridge." },
    { name: "North Elbert Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 10080, elevationGain: 4700, roundTripMiles: 9.0, estimatedHours: 7.5, description: "Northern approach via Halfmoon Creek trailhead with slightly more elevation gain and fewer crowds than the south route." },
  ],
  "Mount Massive": [
    { name: "East Slopes", difficulty: Difficulty.CLASS_1, trailheadElevation: 10060, elevationGain: 3500, roundTripMiles: 13.5, estimatedHours: 8.0, description: "Long ridge traverse accessing multiple false summits before the true high point; excellent panoramas of the Sawatch." },
    { name: "Southwest Ridge", difficulty: Difficulty.CLASS_2, trailheadElevation: 10700, elevationGain: 3800, roundTripMiles: 9.5, estimatedHours: 7.0, description: "A direct, less-traveled approach from the Halfmoon West trailhead up the rocky southwest ridge." },
  ],
  "Mount Harvard": [
    { name: "South Slopes via Pine Creek", difficulty: Difficulty.CLASS_2, trailheadElevation: 9700, elevationGain: 4600, roundTripMiles: 14.0, estimatedHours: 9.0, description: "The standard route follows Pine Creek through beautiful Collegiate Peaks wilderness to Harvard's broad summit plateau." },
  ],
  "La Plata Peak": [
    { name: "Northwest Ridge", difficulty: Difficulty.CLASS_2, trailheadElevation: 10000, elevationGain: 3700, roundTripMiles: 9.0, estimatedHours: 7.0, description: "Classic Sawatch route beginning at the La Plata Trailhead, ascending loose scree and solid ridge to the summit." },
    { name: "Ellingwood Ridge", difficulty: Difficulty.CLASS_3, trailheadElevation: 10000, elevationGain: 3900, roundTripMiles: 9.5, estimatedHours: 9.0, description: "A scenic technical ridge offering Class 3 scrambling with outstanding views — one of Colorado's finest alpine routes." },
  ],
  "Mount Antero": [
    { name: "Baldwin Creek ATV Road", difficulty: Difficulty.CLASS_2, trailheadElevation: 9000, elevationGain: 4200, roundTripMiles: 16.0, estimatedHours: 9.0, description: "Most hikers drive as high as their vehicle allows on this jeep road before transitioning to trail. Famous for aquamarine gem collecting on the slopes." },
  ],
  "Mount Shavano": [
    { name: "East Slopes via Shavano Trailhead", difficulty: Difficulty.CLASS_2, trailheadElevation: 9200, elevationGain: 4600, roundTripMiles: 9.5, estimatedHours: 7.5, description: "The standard route passes the famed Angel of Shavano snowfield visible from Salida and ascends open tundra to the summit." },
  ],
  "Tabeguache Peak": [
    { name: "East Ridge from Shavano", difficulty: Difficulty.CLASS_2, trailheadElevation: 9200, elevationGain: 4800, roundTripMiles: 10.5, estimatedHours: 8.0, description: "Typically combined with Shavano on a traverse; after summiting Shavano, descend and traverse the high ridge to Tabeguache." },
  ],
  "Mount Princeton": [
    { name: "East Slopes via Grouse Canyon", difficulty: Difficulty.CLASS_2, trailheadElevation: 8900, elevationGain: 4500, roundTripMiles: 9.5, estimatedHours: 7.5, description: "A long approach up Grouse Canyon followed by boulder fields and tundra to Princeton's broad summit dome." },
  ],
  "Mount Yale": [
    { name: "Southwest Slopes", difficulty: Difficulty.CLASS_2, trailheadElevation: 9600, elevationGain: 4300, roundTripMiles: 9.0, estimatedHours: 7.0, description: "Beginning at Denny Creek trailhead, this route ascends forest then open slopes with a short but steep final push to the summit." },
  ],
  "Mount Oxford": [
    { name: "East Slopes via Missouri Gulch", difficulty: Difficulty.CLASS_2, trailheadElevation: 9600, elevationGain: 3800, roundTripMiles: 8.5, estimatedHours: 6.5, description: "Frequently combined with Mount Belford. From the Belford summit, a 0.75-mile ridge walk leads to Oxford's high point." },
  ],
  "Mount Belford": [
    { name: "Northwest Slopes via Missouri Gulch", difficulty: Difficulty.CLASS_2, trailheadElevation: 9600, elevationGain: 3600, roundTripMiles: 7.5, estimatedHours: 6.0, description: "Missouri Gulch provides the most direct approach; steep upper slopes lead to a wide summit with Collegiate Peaks views." },
  ],
  "Mount Columbia": [
    { name: "East Slopes via Horn Fork Basin", difficulty: Difficulty.CLASS_2, trailheadElevation: 9800, elevationGain: 4100, roundTripMiles: 10.5, estimatedHours: 8.0, description: "The beautiful Horn Fork Basin approach enters a pristine cirque before switchbacks lead to Columbia's gentle summit." },
  ],
  "Missouri Mountain": [
    { name: "East Slopes via Missouri Gulch", difficulty: Difficulty.CLASS_2, trailheadElevation: 9600, elevationGain: 4000, roundTripMiles: 9.0, estimatedHours: 7.5, description: "Often combined with Belford and Oxford for an ambitious three-peak day. The upper mountain has Class 2 rock scrambling." },
  ],
  "Huron Peak": [
    { name: "Northwest Ridge", difficulty: Difficulty.CLASS_2, trailheadElevation: 10700, elevationGain: 2900, roundTripMiles: 6.0, estimatedHours: 5.0, description: "A moderate Sawatch route with a well-marked trail from the upper Lake Fork trailhead through tundra to the rocky summit." },
  ],
  "Mount of the Holy Cross": [
    { name: "North Ridge via Halfmoon Creek", difficulty: Difficulty.CLASS_2, trailheadElevation: 10300, elevationGain: 4800, roundTripMiles: 11.0, estimatedHours: 8.5, description: "The famous cross-shaped couloir is visible from the summit ridge. A long approach with significant off-trail travel above treeline." },
  ],
  "Grays Peak": [
    { name: "North Slopes Standard Route", difficulty: Difficulty.CLASS_1, trailheadElevation: 11280, elevationGain: 3000, roundTripMiles: 7.5, estimatedHours: 5.5, description: "Colorado's most climbed 14er. A wide, well-maintained trail through Kelso Valley to the highest point on the Continental Divide." },
  ],
  "Torreys Peak": [
    { name: "North Slopes via Grays Peak Trail", difficulty: Difficulty.CLASS_2, trailheadElevation: 11280, elevationGain: 3200, roundTripMiles: 8.5, estimatedHours: 6.5, description: "Most often combined with Grays on the same day. The connecting ridge offers Class 2 scrambling on solid rock." },
    { name: "Dead Dog Couloir", difficulty: Difficulty.CLASS_3, trailheadElevation: 11280, elevationGain: 3100, roundTripMiles: 7.0, estimatedHours: 6.0, description: "A direct gully route on the northeast face; moderate snow travel in early season, loose rock later." },
  ],
  "Mount Blue Sky": [
    { name: "Chicago Lakes Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 10600, elevationGain: 3900, roundTripMiles: 14.0, estimatedHours: 8.0, description: "A scenic wilderness approach through the Chicago Creek drainage passing two alpine lakes before the final summit push." },
    { name: "Summit Lake Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 12830, elevationGain: 1400, roundTripMiles: 1.5, estimatedHours: 2.0, description: "Short, popular hike from the Summit Lake parking area. The road to Summit Lake (toll) dramatically reduces effort." },
  ],
  "Longs Peak": [
    { name: "Keyhole Route", difficulty: Difficulty.CLASS_3, trailheadElevation: 9400, elevationGain: 5100, roundTripMiles: 15.5, estimatedHours: 10.5, description: "Colorado's most iconic 14er route. Follows a well-marked trail to the famous Keyhole, then navigates the Ledges, Homestretch, and Broadway to the summit." },
    { name: "Loft Route", difficulty: Difficulty.CLASS_3, trailheadElevation: 9400, elevationGain: 5300, roundTripMiles: 14.0, estimatedHours: 11.0, description: "A less-crowded alternative through Chasm Meadows and the Loft col, joining the Homestretch for the final ascent." },
  ],
  "Pikes Peak": [
    { name: "Barr Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 6700, elevationGain: 7800, roundTripMiles: 24.0, estimatedHours: 14.0, description: "The legendary 24-mile round-trip trail from Manitou Springs, traversing through multiple life zones to the famous summit house." },
    { name: "Crags Route", difficulty: Difficulty.CLASS_2, trailheadElevation: 10100, elevationGain: 4600, roundTripMiles: 13.0, estimatedHours: 9.0, description: "A scenic approach from the Crags Campground on the northwest side with outstanding views and fewer crowds than Barr Trail." },
  ],
  "Mount Bierstadt": [
    { name: "West Slopes via Scott Gomer Creek", difficulty: Difficulty.CLASS_2, trailheadElevation: 11700, elevationGain: 2900, roundTripMiles: 7.0, estimatedHours: 5.5, description: "One of Colorado's most accessible 14ers. Crosses willows in the lower valley before rising to gentle open slopes at the summit." },
    { name: "Sawtooth Ridge (Bierstadt–Evans Traverse)", difficulty: Difficulty.CLASS_3, trailheadElevation: 11700, elevationGain: 3500, roundTripMiles: 12.0, estimatedHours: 9.0, description: "A thrilling ridge traverse between Bierstadt and Blue Sky with sustained Class 3 scrambling on the dramatic Sawtooth." },
  ],
  "Quandary Peak": [
    { name: "East Ridge Standard Route", difficulty: Difficulty.CLASS_1, trailheadElevation: 10900, elevationGain: 3350, roundTripMiles: 6.75, estimatedHours: 5.5, description: "A well-traveled trail from the Quandary trailhead near Breckenridge. The East Ridge is broad and straightforward with few navigation challenges." },
    { name: "West Ridge", difficulty: Difficulty.CLASS_2, trailheadElevation: 10200, elevationGain: 3800, roundTripMiles: 8.5, estimatedHours: 6.5, description: "A longer and more remote approach from McCullough Gulch with excellent views of the Tenmile Range." },
  ],
  "Mount Lincoln": [
    { name: "East Slopes via Kite Lake", difficulty: Difficulty.CLASS_2, trailheadElevation: 12000, elevationGain: 2400, roundTripMiles: 6.0, estimatedHours: 5.0, description: "Begins at Kite Lake, the highest trailhead in Colorado accessible by passenger car. Frequently combined with Democrat, Cameron, and Bross." },
  ],
  "Mount Cameron": [
    { name: "East Slopes via Kite Lake", difficulty: Difficulty.CLASS_2, trailheadElevation: 12000, elevationGain: 2700, roundTripMiles: 7.0, estimatedHours: 5.5, description: "A sub-summit connecting Lincoln and Bross on the popular Kite Lake quad. Some lists exclude Cameron due to insufficient topographic prominence." },
  ],
  "Mount Bross": [
    { name: "East Slopes via Kite Lake", difficulty: Difficulty.CLASS_2, trailheadElevation: 12000, elevationGain: 2600, roundTripMiles: 6.5, estimatedHours: 5.0, description: "Part of the Kite Lake foursome; the summit involves off-trail tundra hiking with good footing on the broad plateau." },
  ],
  "Mount Democrat": [
    { name: "East Slopes via Kite Lake", difficulty: Difficulty.CLASS_1, trailheadElevation: 12000, elevationGain: 1900, roundTripMiles: 5.0, estimatedHours: 4.0, description: "The easiest of the Kite Lake peaks and often a solo objective. A well-defined trail leads directly from the lake to the summit." },
  ],
  "Mount Sherman": [
    { name: "Southwest Ridge via Fourmile Creek", difficulty: Difficulty.CLASS_1, trailheadElevation: 12000, elevationGain: 2300, roundTripMiles: 5.5, estimatedHours: 4.0, description: "A historic mining road approach through remnants of the Leavick Mine district; one of Colorado's easiest 14ers." },
  ],
  "Blanca Peak": [
    { name: "Northeast Face via Lake Como Road", difficulty: Difficulty.CLASS_2, trailheadElevation: 7990, elevationGain: 5700, roundTripMiles: 15.0, estimatedHours: 10.5, description: "The long Lake Como Road approach (4WD recommended) leads to challenging scree and talus on the upper northeast face." },
  ],
  "Crestone Peak": [
    { name: "South Face Couloir", difficulty: Difficulty.CLASS_4, trailheadElevation: 8900, elevationGain: 4600, roundTripMiles: 9.0, estimatedHours: 10.0, description: "One of Colorado's most demanding standard routes. A steep couloir followed by exposed Class 4 ridge scrambling on loose conglomerate rock." },
  ],
  "Crestone Needle": [
    { name: "South Ridge via Broken Hand Pass", difficulty: Difficulty.CLASS_4, trailheadElevation: 8900, elevationGain: 5200, roundTripMiles: 11.0, estimatedHours: 11.5, description: "An exposed and committing route over Broken Hand Pass with technical Class 4 moves near the summit — one of Colorado's most serious 14ers." },
  ],
  "Kit Carson Peak": [
    { name: "East Ridge via Willow Creek", difficulty: Difficulty.CLASS_4, trailheadElevation: 8900, elevationGain: 4600, roundTripMiles: 9.5, estimatedHours: 10.0, description: "Typically combined with Challenger Point. After tagging Challenger, a Class 4 knife-edge traverse leads to Kit Carson's exposed summit." },
  ],
  "Challenger Point": [
    { name: "West Ridge via Willow Creek", difficulty: Difficulty.CLASS_3, trailheadElevation: 8900, elevationGain: 4200, roundTripMiles: 9.0, estimatedHours: 9.0, description: "Named for the Space Shuttle Challenger crew. A Class 3 approach with airy exposure on the upper ridge above the San Luis Valley." },
  ],
  "Humboldt Peak": [
    { name: "West Ridge via South Colony Lake", difficulty: Difficulty.CLASS_2, trailheadElevation: 9800, elevationGain: 4100, roundTripMiles: 9.5, estimatedHours: 7.5, description: "A scenic approach through the South Colony Lakes basin with a straightforward rocky ridge to the summit." },
  ],
  "Ellingwood Point": [
    { name: "North Slopes from Blanca-Ellingwood Col", difficulty: Difficulty.CLASS_3, trailheadElevation: 7990, elevationGain: 5900, roundTripMiles: 14.0, estimatedHours: 11.0, description: "Usually combined with Blanca Peak via the shared Lake Como Road approach. Class 3 scrambling to the summit block." },
  ],
  "Mount Lindsey": [
    { name: "Northeast Ridge via Iron Nipple", difficulty: Difficulty.CLASS_3, trailheadElevation: 9700, elevationGain: 4500, roundTripMiles: 11.0, estimatedHours: 9.5, description: "A remote Sangre de Cristo peak with a technical Class 3 standard route over the distinctive Iron Nipple formation." },
  ],
  "Little Bear Peak": [
    { name: "Southwest Ridge via Lake Como", difficulty: Difficulty.CLASS_4, trailheadElevation: 7990, elevationGain: 5900, roundTripMiles: 16.0, estimatedHours: 13.0, description: "Consistently rated as Colorado's most dangerous standard route. The crux is a 400-foot Class 4 headwall with significant rockfall exposure." },
  ],
  "Culebra Peak": [
    { name: "South Ridge via Private Land", difficulty: Difficulty.CLASS_2, trailheadElevation: 9200, elevationGain: 4100, roundTripMiles: 8.0, estimatedHours: 7.0, description: "The only Colorado 14er on private land (fee required). A jeep road approach transitions to a straightforward ridge walk." },
  ],
  "Uncompahgre Peak": [
    { name: "South Slopes Standard Route", difficulty: Difficulty.CLASS_1, trailheadElevation: 10400, elevationGain: 2900, roundTripMiles: 7.5, estimatedHours: 5.5, description: "The highest peak in the San Juan Mountains; a well-defined trail on open tundra with minimal technical difficulty." },
  ],
  "Mount Wilson": [
    { name: "East Slopes via Navajo Basin", difficulty: Difficulty.CLASS_4, trailheadElevation: 9400, elevationGain: 4400, roundTripMiles: 13.5, estimatedHours: 11.0, description: "A remote San Juan peak with a serious Class 4 standard route through the Navajo Basin, requiring good route-finding skills." },
  ],
  "El Diente Peak": [
    { name: "North Slopes via Kilpacker Creek", difficulty: Difficulty.CLASS_4, trailheadElevation: 9200, elevationGain: 4000, roundTripMiles: 14.0, estimatedHours: 11.0, description: "One of the most remote 14ers; the long approach up Kilpacker Creek is followed by technical Class 4 terrain on rotten rock." },
  ],
  "Wilson Peak": [
    { name: "Southwest Ridge via Rock of Ages Saddle", difficulty: Difficulty.CLASS_3, trailheadElevation: 9300, elevationGain: 3800, roundTripMiles: 9.5, estimatedHours: 8.5, description: "The most accessible of the Wilson group; jeep road to Rock of Ages Mine, then Class 3 scrambling along the southwest ridge." },
  ],
  "Wetterhorn Peak": [
    { name: "Southeast Ridge", difficulty: Difficulty.CLASS_3, trailheadElevation: 9400, elevationGain: 3500, roundTripMiles: 7.5, estimatedHours: 6.5, description: "A classic San Juan route with sustained Class 3 scrambling on solid rock — far more rewarding than its modest stats suggest." },
  ],
  "Redcloud Peak": [
    { name: "Silver Creek – East Fork Trail", difficulty: Difficulty.CLASS_2, trailheadElevation: 9700, elevationGain: 3400, roundTripMiles: 9.5, estimatedHours: 6.5, description: "A well-marked trail through the Silver Creek drainage in the heart of the San Juan Mountains." },
  ],
  "Sunshine Peak": [
    { name: "Silver Creek Trail via Redcloud", difficulty: Difficulty.CLASS_2, trailheadElevation: 9700, elevationGain: 3800, roundTripMiles: 11.5, estimatedHours: 8.0, description: "Typically combined with Redcloud; from Redcloud's summit, descend the connecting ridge to Sunshine's broad, flat top." },
  ],
  "Handies Peak": [
    { name: "Grizzly Gulch Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 11200, elevationGain: 2300, roundTripMiles: 5.5, estimatedHours: 4.5, description: "One of Colorado's easiest San Juan 14ers; a maintained trail up the scenic Grizzly Gulch to the broad summit." },
    { name: "American Basin Trail", difficulty: Difficulty.CLASS_1, trailheadElevation: 11300, elevationGain: 2200, roundTripMiles: 5.0, estimatedHours: 4.0, description: "The prettier approach — American Basin is one of the finest wildflower meadows in Colorado, rivaling any alpine garden in the Rockies." },
  ],
  "San Luis Peak": [
    { name: "Stewart Creek Approach", difficulty: Difficulty.CLASS_1, trailheadElevation: 9600, elevationGain: 3400, roundTripMiles: 13.5, estimatedHours: 7.5, description: "A long but technically straightforward route across open Colorado tundra — one of the most remote easy 14ers in the state." },
  ],
  "Mount Sneffels": [
    { name: "South Slopes via Yankee Boy Basin", difficulty: Difficulty.CLASS_3, trailheadElevation: 10800, elevationGain: 2600, roundTripMiles: 4.5, estimatedHours: 5.0, description: "Colorado's most photographed 14er; jeep accessible to the upper basin, then Class 3 couloir to an exposed summit perch." },
    { name: "East Ridge via Blue Lakes", difficulty: Difficulty.CLASS_3, trailheadElevation: 9300, elevationGain: 3800, roundTripMiles: 9.5, estimatedHours: 8.5, description: "A longer but spectacular approach via the vivid blue-green Blue Lakes, ascending the east ridge to join the summit couloir." },
  ],
  "Windom Peak": [
    { name: "West Ridge via Chicago Basin", difficulty: Difficulty.CLASS_3, trailheadElevation: 8200, elevationGain: 5100, roundTripMiles: 13.5, estimatedHours: 10.0, description: "Chicago Basin is the hub for the Weminuche Wilderness 14ers. Access by Durango & Silverton Narrow Gauge Railroad then trail to the west ridge." },
  ],
  "Sunlight Peak": [
    { name: "Northwest Face via Chicago Basin", difficulty: Difficulty.CLASS_3, trailheadElevation: 8200, elevationGain: 5200, roundTripMiles: 13.5, estimatedHours: 10.5, description: "One of Colorado's more serious standard routes with genuine Class 3+ moves on the notorious summit block step." },
  ],
  "Mount Eolus": [
    { name: "Northeast Ridge via Chicago Basin", difficulty: Difficulty.CLASS_3, trailheadElevation: 8200, elevationGain: 5100, roundTripMiles: 13.5, estimatedHours: 9.5, description: "A stunning Needle Mountains peak accessed from Chicago Basin; the northeast ridge involves sustained Class 3 scrambling." },
  ],
  "North Eolus": [
    { name: "East Face from Eolus Saddle", difficulty: Difficulty.CLASS_4, trailheadElevation: 8200, elevationGain: 5400, roundTripMiles: 14.0, estimatedHours: 11.0, description: "Typically combined with Eolus. A short but committing Class 4 traverse from the saddle to North Eolus's tiny summit." },
  ],
  "Castle Peak": [
    { name: "Northeast Ridge via Montezuma Basin", difficulty: Difficulty.CLASS_2, trailheadElevation: 10100, elevationGain: 3400, roundTripMiles: 8.5, estimatedHours: 6.5, description: "Highest peak in the Elk Mountains; the Montezuma Basin jeep approach makes for a moderate hike on the northeast ridge." },
    { name: "West Ridge via Pearl Pass", difficulty: Difficulty.CLASS_3, trailheadElevation: 11500, elevationGain: 2800, roundTripMiles: 7.0, estimatedHours: 6.0, description: "A longer but more scenic approach utilizing the historic Pearl Pass jeep road to access the western approaches." },
  ],
  "Conundrum Peak": [
    { name: "West Slopes from Castle Peak", difficulty: Difficulty.CLASS_3, trailheadElevation: 10100, elevationGain: 3600, roundTripMiles: 9.5, estimatedHours: 8.0, description: "A sub-peak of Castle typically reached by continuing along the ridge after summiting Castle. Involves Class 3 exposure on the connecting ridge." },
  ],
  "Capitol Peak": [
    { name: "Northeast Ridge — Capitol Creek Trail", difficulty: Difficulty.CLASS_4, trailheadElevation: 8600, elevationGain: 5300, roundTripMiles: 17.0, estimatedHours: 13.0, description: "The most committing standard route on a Colorado 14er. The knife-edge 'K2' ridge leading to the summit demands excellent route-finding and solid Class 4 skills." },
  ],
  "Snowmass Mountain": [
    { name: "East Slopes via Snowmass Basin", difficulty: Difficulty.CLASS_3, trailheadElevation: 8400, elevationGain: 5400, roundTripMiles: 18.0, estimatedHours: 13.0, description: "A long, remote Elk Mountains route requiring an overnight in Snowmass Basin. The final Class 3 headwall is steep but on solid rock." },
  ],
  "Maroon Peak": [
    { name: "South Ridge via Maroon–Pyramid Couloir", difficulty: Difficulty.CLASS_4, trailheadElevation: 9600, elevationGain: 4700, roundTripMiles: 11.0, estimatedHours: 11.0, description: "The Deadly Bells standard route. Loose Maroon Formation conglomerate on every step; early morning starts essential to minimize rockfall risk." },
    { name: "North Ridge Traverse", difficulty: Difficulty.CLASS_4, trailheadElevation: 9600, elevationGain: 5000, roundTripMiles: 12.0, estimatedHours: 12.0, description: "The complete Bell Cord–North Maroon–Maroon traverse, one of the classic Colorado ridge routes done in a single long day." },
  ],
  "North Maroon Peak": [
    { name: "East Face via Bell Cord Couloir", difficulty: Difficulty.CLASS_4, trailheadElevation: 9600, elevationGain: 4000, roundTripMiles: 10.0, estimatedHours: 10.0, description: "The Bell Cord Couloir splits the two Maroon Bells; this Class 4 route ascends directly to North Maroon's summit on characteristically rotten rock." },
  ],
  "Pyramid Peak": [
    { name: "Northeast Ridge", difficulty: Difficulty.CLASS_4, trailheadElevation: 9600, elevationGain: 4500, roundTripMiles: 10.5, estimatedHours: 11.5, description: "The third of the notorious Elk Mountains quartet. Complex route-finding through cliff bands and gullies to a small, airy summit with no margin for error." },
  ],
};

async function main() {
  const mountains = await prisma.mountain.findMany();
  const mountainMap = new Map(mountains.map((m) => [m.name, m.id]));

  let created = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [mountainName, trailSeeds] of Object.entries(TRAILS)) {
    const mountainId = mountainMap.get(mountainName);
    if (!mountainId) {
      console.warn(`Mountain not found: "${mountainName}"`);
      notFound++;
      continue;
    }

    for (const trail of trailSeeds) {
      const existing = await prisma.trail.findFirst({
        where: { mountainId, name: trail.name },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.trail.create({ data: { mountainId, ...trail } });
      created++;
    }
  }

  console.log(`\nTrails seeded: ${created} created, ${skipped} already existed, ${notFound} mountains not found`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
