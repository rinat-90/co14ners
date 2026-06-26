import { PrismaClient, Difficulty, MountainRange } from "@prisma/client";

const prisma = new PrismaClient();

// ─── All 58 Colorado 14ers ─────────────────────────────────────────────────
// Data sources: 14ers.com, Wikipedia List of Colorado fourteeners, USGS NGS
// Elevations: NAVD 88 published values (feet)
// Coordinates: USGS summit coordinates (decimal degrees)
// Route stats: 14ers.com standard/easiest route per peak
// Difficulty: Yosemite Decimal System class for the standard route

interface MountainSeed {
  name: string;
  altitude: number;
  range: MountainRange;
  latitude: number;
  longitude: number;
  difficulty: Difficulty;
  trailheadElevation: number;
  elevationGain: number;
  roundTripMiles: number;
  estimatedHours: number;
  description: string;
}

const mountains: MountainSeed[] = [
  // ─── SAWATCH RANGE (15 peaks) ──────────────────────────────────────────────
  {
    name: "Mount Elbert",
    altitude: 14440,
    range: MountainRange.SAWATCH,
    latitude: 39.1178,
    longitude: -106.4453,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 10080,
    elevationGain: 4500,
    roundTripMiles: 9.75,
    estimatedHours: 7.0,
    description:
      "The highest peak in the Rocky Mountains and Colorado's tallest 14er at 14,440 ft. A long but non-technical hike on a well-maintained trail with sweeping views of the Sawatch Range.",
  },
  {
    name: "Mount Massive",
    altitude: 14421,
    range: MountainRange.SAWATCH,
    latitude: 39.1875,
    longitude: -106.4757,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 10060,
    elevationGain: 4500,
    roundTripMiles: 13.75,
    estimatedHours: 8.0,
    description:
      "Colorado's second highest peak, justifying its name with five summits above 14,000 ft spread over a long ridge. The standard Southwest Slopes route is a strenuous but non-technical hike.",
  },
  {
    name: "Mount Harvard",
    altitude: 14421,
    range: MountainRange.SAWATCH,
    latitude: 38.9244,
    longitude: -106.3206,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9880,
    elevationGain: 4600,
    roundTripMiles: 13.75,
    estimatedHours: 8.5,
    description:
      "The highest of the Collegiate Peaks and third highest summit in the Rockies. The South Slopes standard route involves a long approach up the Pine Creek drainage with excellent ridge views.",
  },
  {
    name: "La Plata Peak",
    altitude: 14336,
    range: MountainRange.SAWATCH,
    latitude: 39.0294,
    longitude: -106.4731,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9900,
    elevationGain: 4400,
    roundTripMiles: 9.25,
    estimatedHours: 7.0,
    description:
      "The fifth highest peak in the Rockies, offering a straightforward but rocky Northwest Ridge route. La Plata features great views across the Collegiate Peaks and Arkansas River valley.",
  },
  {
    name: "Mount Antero",
    altitude: 14269,
    range: MountainRange.SAWATCH,
    latitude: 38.6745,
    longitude: -106.2464,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9420,
    elevationGain: 5200,
    roundTripMiles: 15.5,
    estimatedHours: 9.0,
    description:
      "The highest of the southern Sawatch peaks, renowned for world-class aquamarine gemstone deposits on its flanks. The West Slopes route follows a long mining road before a ridge scramble to the summit.",
  },
  {
    name: "Mount Shavano",
    altitude: 14229,
    range: MountainRange.SAWATCH,
    latitude: 38.6190,
    longitude: -106.2391,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9220,
    elevationGain: 4500,
    roundTripMiles: 9.5,
    estimatedHours: 7.0,
    description:
      "Famous for the 'Angel of Shavano,' a snow formation visible on its east face each spring. Often combined with neighboring Tabeguache Peak via a connecting ridge traverse.",
  },
  {
    name: "Tabeguache Peak",
    altitude: 14155,
    range: MountainRange.SAWATCH,
    latitude: 38.6253,
    longitude: -106.2508,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9220,
    elevationGain: 5600,
    roundTripMiles: 11.5,
    estimatedHours: 8.0,
    description:
      "Typically climbed together with Mount Shavano via an exposed ridge traverse. Named after the Tabeguache band of Ute people, this peak offers solitude and a demanding route.",
  },
  {
    name: "Mount Princeton",
    altitude: 14197,
    range: MountainRange.SAWATCH,
    latitude: 38.7494,
    longitude: -106.2425,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9000,
    elevationGain: 3200,
    roundTripMiles: 6.5,
    estimatedHours: 6.0,
    description:
      "One of the Collegiate Peaks, towering above the Chalk Creek valley and its famous hot springs. The East Slopes standard route is a relatively direct climb with moderate Class 2 difficulty.",
  },
  {
    name: "Mount Yale",
    altitude: 14196,
    range: MountainRange.SAWATCH,
    latitude: 38.8442,
    longitude: -106.3142,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9500,
    elevationGain: 4300,
    roundTripMiles: 9.5,
    estimatedHours: 7.0,
    description:
      "Part of the Collegiate Peaks group in the heart of the Sawatch Range. The Southwest Slopes route ascends steadily through forest and meadow before finishing on boulder-covered slopes.",
  },
  {
    name: "Mount Oxford",
    altitude: 14153,
    range: MountainRange.SAWATCH,
    latitude: 38.9650,
    longitude: -106.3378,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9690,
    elevationGain: 5900,
    roundTripMiles: 11.0,
    estimatedHours: 8.0,
    description:
      "Frequently combined with Mount Belford and Missouri Mountain from the Missouri Gulch Trailhead. The Northwest Ridge route involves significant total gain due to the traverse between peaks.",
  },
  {
    name: "Mount Belford",
    altitude: 14197,
    range: MountainRange.SAWATCH,
    latitude: 38.9608,
    longitude: -106.3603,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9690,
    elevationGain: 4500,
    roundTripMiles: 8.0,
    estimatedHours: 7.0,
    description:
      "A prominent Collegiate Peaks 14er accessed from the Missouri Gulch Trailhead near Winfield. Often climbed with Mount Oxford and Missouri Mountain in a single ambitious day.",
  },
  {
    name: "Mount Columbia",
    altitude: 14073,
    range: MountainRange.SAWATCH,
    latitude: 38.9036,
    longitude: -106.2975,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9880,
    elevationGain: 4250,
    roundTripMiles: 12.0,
    estimatedHours: 8.0,
    description:
      "One of the Collegiate Peaks, lying just south of Mount Harvard and sharing a connecting ridge that makes a challenging traverse possible. The West Slopes standard route is a long Class 2 hike from the North Cottonwood Creek trailhead.",
  },
  {
    name: "Missouri Mountain",
    altitude: 14067,
    range: MountainRange.SAWATCH,
    latitude: 38.9469,
    longitude: -106.3783,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9690,
    elevationGain: 4500,
    roundTripMiles: 10.5,
    estimatedHours: 7.5,
    description:
      "The most southwestern of the trio accessible from Missouri Gulch, offering rugged terrain and excellent views toward the Elk Range. A classic but demanding Class 2 summit.",
  },
  {
    name: "Huron Peak",
    altitude: 14003,
    range: MountainRange.SAWATCH,
    latitude: 38.9454,
    longitude: -106.4382,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 10260,
    elevationGain: 3500,
    roundTripMiles: 7.0,
    estimatedHours: 6.0,
    description:
      "One of the lower Collegiate Peaks, yet highly scenic with views across the Clear Creek drainage. The Northwest Slopes standard route is straightforward Class 2 from the South Winfield trailhead.",
  },
  {
    name: "Mount of the Holy Cross",
    altitude: 14005,
    range: MountainRange.SAWATCH,
    latitude: 39.4672,
    longitude: -106.4817,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 10320,
    elevationGain: 5600,
    roundTripMiles: 11.25,
    estimatedHours: 8.0,
    description:
      "Famous for the natural cross of snow-filled couloirs visible on its east face, inspiring famous 19th-century photography. The North Ridge route involves a significant descent and re-ascent via Half Moon Pass.",
  },

  // ─── FRONT RANGE (6 peaks) ─────────────────────────────────────────────────
  {
    name: "Grays Peak",
    altitude: 14278,
    range: MountainRange.FRONT,
    latitude: 39.6339,
    longitude: -105.8176,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 11280,
    elevationGain: 3000,
    roundTripMiles: 7.5,
    estimatedHours: 5.5,
    description:
      "The highest point on the Continental Divide in North America, located just 45 miles west of Denver. A popular well-graded trail makes this one of Colorado's most-climbed 14ers, often combined with Torreys Peak.",
  },
  {
    name: "Torreys Peak",
    altitude: 14275,
    range: MountainRange.FRONT,
    latitude: 39.6428,
    longitude: -105.8212,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 11280,
    elevationGain: 3000,
    roundTripMiles: 7.75,
    estimatedHours: 5.5,
    description:
      "Separated from Grays Peak by a high saddle, making the two a natural pairing for a single long day. The standard route follows a clear trail from the Grays Peak Trailhead with excellent Denver skyline views.",
  },
  {
    name: "Mount Blue Sky",
    altitude: 14264,
    range: MountainRange.FRONT,
    latitude: 39.5883,
    longitude: -105.6438,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 10600,
    elevationGain: 2000,
    roundTripMiles: 5.5,
    estimatedHours: 4.5,
    description:
      "Formerly known as Mount Evans, this peak is served by one of the highest paved roads in North America. The Chicago Lakes Trail provides a scenic hike alternative to the summit highway.",
  },
  {
    name: "Longs Peak",
    altitude: 14259,
    range: MountainRange.FRONT,
    latitude: 40.2550,
    longitude: -105.6151,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9405,
    elevationGain: 5100,
    roundTripMiles: 14.5,
    estimatedHours: 10.0,
    description:
      "The only Front Range 14er north of Denver and the highest peak in Rocky Mountain National Park. The famous Keyhole Route involves exposed traverses and scrambling on the Narrows and Homestretch sections.",
  },
  {
    name: "Pikes Peak",
    altitude: 14115,
    range: MountainRange.FRONT,
    latitude: 38.8405,
    longitude: -105.0442,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 6707,
    elevationGain: 7600,
    roundTripMiles: 24.0,
    estimatedHours: 12.0,
    description:
      "Colorado's most famous 14er, looming above Colorado Springs and inspiring the song 'America the Beautiful.' The legendary Barr Trail is one of the longest 14er routes in Colorado at 24 miles round trip.",
  },
  {
    name: "Mount Bierstadt",
    altitude: 14060,
    range: MountainRange.FRONT,
    latitude: 39.5826,
    longitude: -105.6688,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 11669,
    elevationGain: 2850,
    roundTripMiles: 7.25,
    estimatedHours: 5.5,
    description:
      "One of the most popular Front Range 14ers due to its proximity to Denver and high starting elevation. The West Slopes route crosses the iconic Sawtooth Ridge willows en route to a straightforward summit.",
  },

  // ─── TENMILE / MOSQUITO RANGE (6 peaks) ────────────────────────────────────
  {
    name: "Quandary Peak",
    altitude: 14265,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.3972,
    longitude: -106.1061,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 10850,
    elevationGain: 3450,
    roundTripMiles: 6.75,
    estimatedHours: 5.0,
    description:
      "The only 14er in the Tenmile Range and one of Colorado's most popular beginner peaks near Breckenridge. The East Ridge trail is a well-defined Class 1 route with a prominent ridge approach.",
  },
  {
    name: "Mount Lincoln",
    altitude: 14293,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.3515,
    longitude: -106.1115,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 12035,
    elevationGain: 2600,
    roundTripMiles: 6.0,
    estimatedHours: 5.0,
    description:
      "The highest peak in the Mosquito Range, part of the famous DeCaLiBron loop with Democrat, Cameron, and Bross. Starting from Kite Lake at 12,035 ft makes this one of the shorter elevation gains among 14ers.",
  },
  {
    name: "Mount Cameron",
    altitude: 14238,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.3469,
    longitude: -106.1194,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 12035,
    elevationGain: 2250,
    roundTripMiles: 4.75,
    estimatedHours: 4.0,
    description:
      "An unofficial 14er sitting on the connecting ridge between Lincoln and Democrat, lacking the required 300 ft of prominence. Despite its unofficial status, it is routinely tagged as part of the DeCaLiBron loop.",
  },
  {
    name: "Mount Bross",
    altitude: 14172,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.3347,
    longitude: -106.1069,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 12035,
    elevationGain: 2250,
    roundTripMiles: 3.25,
    estimatedHours: 3.5,
    description:
      "Part of the DeCaLiBron group, typically climbed from Kite Lake together with Lincoln, Democrat, and Cameron. Note that the summit access crosses private land requiring a posted waiver to legally ascend.",
  },
  {
    name: "Mount Democrat",
    altitude: 14148,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.3394,
    longitude: -106.1397,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 12035,
    elevationGain: 2150,
    roundTripMiles: 4.0,
    estimatedHours: 3.5,
    description:
      "Originally known as Buckskin Peak, renamed by miners with Southern sympathies during the Civil War. The South Ridge route from Kite Lake is straightforward Class 2 and the most direct of the DeCaLiBron quartet.",
  },
  {
    name: "Mount Sherman",
    altitude: 14036,
    range: MountainRange.TENMILE_MOSQUITO,
    latitude: 39.2250,
    longitude: -106.1697,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 12000,
    elevationGain: 2100,
    roundTripMiles: 5.25,
    estimatedHours: 4.0,
    description:
      "Widely considered one of the easiest Colorado 14ers, with a gentle summit ridge and views of dozens of other 14ers. The Fourmile Creek trailhead provides access to a straightforward Class 1 route through old mining ruins.",
  },

  // ─── SANGRE DE CRISTO RANGE (10 peaks) ─────────────────────────────────────
  {
    name: "Blanca Peak",
    altitude: 14345,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.5775,
    longitude: -105.4858,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 7980,
    elevationGain: 6500,
    roundTripMiles: 17.0,
    estimatedHours: 12.0,
    description:
      "The highest peak in the Sangre de Cristo Range and Colorado's fourth-highest 14er, forming the Sierra Blanca Massif. The long approach up the Lake Como Road and rough 4WD section makes this one of the most demanding Class 2 routes.",
  },
  {
    name: "Crestone Peak",
    altitude: 14294,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.9667,
    longitude: -105.5853,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 8880,
    elevationGain: 5700,
    roundTripMiles: 14.0,
    estimatedHours: 10.0,
    description:
      "One of the most technically challenging 14ers, featuring exposed Class 3 scrambling on the South Face route. The remote Crestone group requires careful route-finding on loose conglomerate and compact rock.",
  },
  {
    name: "Crestone Needle",
    altitude: 14197,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.9647,
    longitude: -105.5767,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 8880,
    elevationGain: 4400,
    roundTripMiles: 12.0,
    estimatedHours: 10.0,
    description:
      "A dramatic spire adjacent to Crestone Peak requiring Class 4 climbing on the South Couloir / Ellingwood Arête. Often combined with Crestone Peak in a challenging two-summit day from a basecamp in South Colony Lakes.",
  },
  {
    name: "Kit Carson Peak",
    altitude: 14165,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.9797,
    longitude: -106.6025,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 8880,
    elevationGain: 6250,
    roundTripMiles: 15.0,
    estimatedHours: 11.0,
    description:
      "A rugged Crestone group summit requiring sustained Class 3 scrambling on the East Face route. Often climbed with Challenger Point via the connecting ridge, combining two summits in a single ambitious outing.",
  },
  {
    name: "Challenger Point",
    altitude: 14081,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.9800,
    longitude: -105.6067,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 8880,
    elevationGain: 5400,
    roundTripMiles: 13.5,
    estimatedHours: 9.0,
    description:
      "Named in memory of the Space Shuttle Challenger crew, this peak sits just north of Kit Carson. The North Face route is a manageable Class 2 approach but requires significant mileage from the South Colony Lakes trailhead.",
  },
  {
    name: "Humboldt Peak",
    altitude: 14064,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.9723,
    longitude: -105.5532,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 8880,
    elevationGain: 4200,
    roundTripMiles: 11.0,
    estimatedHours: 7.5,
    description:
      "The most accessible summit in the Crestone group, with a direct Class 2 route via the West Ridge from South Colony Lakes. Named for the German naturalist Alexander von Humboldt.",
  },
  {
    name: "Ellingwood Point",
    altitude: 14042,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.5828,
    longitude: -105.4933,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 7980,
    elevationGain: 6200,
    roundTripMiles: 17.0,
    estimatedHours: 12.0,
    description:
      "A subpeak of the Blanca Massif, typically climbed together with Blanca Peak for a strenuous double summit. The North Ridge approach requires the same grueling Lake Como Road approach shared with Blanca Peak.",
  },
  {
    name: "Mount Lindsey",
    altitude: 14042,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.5842,
    longitude: -105.4408,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9750,
    elevationGain: 3500,
    roundTripMiles: 8.25,
    estimatedHours: 6.5,
    description:
      "A rarely visited southeastern outlier of the Blanca Massif with a surprisingly technical Class 3 North Face standard route. The remote setting near the Great Sand Dunes contributes to its low traffic.",
  },
  {
    name: "Little Bear Peak",
    altitude: 14037,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.5667,
    longitude: -105.4917,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 7980,
    elevationGain: 6200,
    roundTripMiles: 14.0,
    estimatedHours: 11.0,
    description:
      "Consistently ranked among Colorado's most dangerous 14ers, requiring exposed Class 4 scrambling on the Southwest Face Couloir. The infamous Little Bear-Blanca ridge traverse is one of the most technical undertakings in Colorado.",
  },
  {
    name: "Culebra Peak",
    altitude: 14047,
    range: MountainRange.SANGRE_DE_CRISTO,
    latitude: 37.1222,
    longitude: -105.1856,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9000,
    elevationGain: 2700,
    roundTripMiles: 5.0,
    estimatedHours: 4.5,
    description:
      "Colorado's southernmost 14er and the only one located entirely on private land, requiring a paid permit from the Taylor Ranch to access. Despite logistical challenges, the route itself is a moderate Class 2 hike.",
  },

  // ─── SAN JUAN MOUNTAINS (14 peaks) ─────────────────────────────────────────
  {
    name: "Uncompahgre Peak",
    altitude: 14309,
    range: MountainRange.SAN_JUAN,
    latitude: 38.0718,
    longitude: -107.4621,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 11400,
    elevationGain: 3000,
    roundTripMiles: 7.5,
    estimatedHours: 6.0,
    description:
      "The highest peak in the San Juan Mountains and sixth highest in Colorado, with a prominent flat-topped summit visible for miles. The Nellie Creek 4WD trailhead reduces the total gain to a manageable Class 2 route.",
  },
  {
    name: "Mount Wilson",
    altitude: 14246,
    range: MountainRange.SAN_JUAN,
    latitude: 37.8393,
    longitude: -107.9916,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9800,
    elevationGain: 4400,
    roundTripMiles: 12.5,
    estimatedHours: 9.0,
    description:
      "The highest peak in the San Miguel Mountains and one of the most remote 14ers, requiring a long approach through the Lizard Head Wilderness. The East Face route involves sustained Class 3 scrambling near the summit.",
  },
  {
    name: "El Diente Peak",
    altitude: 14159,
    range: MountainRange.SAN_JUAN,
    latitude: 37.8374,
    longitude: -108.0054,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9800,
    elevationGain: 4400,
    roundTripMiles: 12.0,
    estimatedHours: 9.0,
    description:
      "An unofficial 14er (insufficient prominence) sitting at the western terminus of the challenging Wilson-El Diente traverse. 'El Diente' means 'the tooth' in Spanish, aptly describing its jagged summit profile.",
  },
  {
    name: "Wilson Peak",
    altitude: 14017,
    range: MountainRange.SAN_JUAN,
    latitude: 37.8603,
    longitude: -107.9848,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9400,
    elevationGain: 3900,
    roundTripMiles: 10.0,
    estimatedHours: 8.0,
    description:
      "The third member of the Wilson Group in the Lizard Head Wilderness, recognizable on the Coors Light label. The Rock of Ages Mine approach is the most popular route, involving Class 3 scrambling near the summit.",
  },
  {
    name: "Wetterhorn Peak",
    altitude: 14015,
    range: MountainRange.SAN_JUAN,
    latitude: 38.0605,
    longitude: -107.5104,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 10400,
    elevationGain: 3300,
    roundTripMiles: 7.0,
    estimatedHours: 6.0,
    description:
      "A striking pyramidal summit near Lake City, often paired with neighboring Uncompahgre Peak. The East Ridge standard route requires Class 3 scrambling through a narrow summit chimney.",
  },
  {
    name: "Redcloud Peak",
    altitude: 14034,
    range: MountainRange.SAN_JUAN,
    latitude: 37.9407,
    longitude: -107.4216,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 10400,
    elevationGain: 3700,
    roundTripMiles: 9.0,
    estimatedHours: 6.5,
    description:
      "A popular San Juan 14er near Lake City, routinely combined with Sunshine Peak for a scenic two-summit day. The Silver Creek Trail approach leads through beautiful alpine terrain to a broad summit ridge.",
  },
  {
    name: "Sunshine Peak",
    altitude: 14001,
    range: MountainRange.SAN_JUAN,
    latitude: 37.9226,
    longitude: -107.4246,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 10400,
    elevationGain: 4800,
    roundTripMiles: 12.25,
    estimatedHours: 8.0,
    description:
      "The lowest official 14er when considering the disputed Huron Peak remeasurement, typically climbed with Redcloud Peak. The traverse from Redcloud's summit to Sunshine involves a 1,000-foot descent and re-ascent.",
  },
  {
    name: "Handies Peak",
    altitude: 14048,
    range: MountainRange.SAN_JUAN,
    latitude: 37.9129,
    longitude: -107.5043,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 11060,
    elevationGain: 2500,
    roundTripMiles: 5.75,
    estimatedHours: 4.5,
    description:
      "Widely regarded as one of the easiest 14ers in Colorado, accessible from the scenic American Basin or Grizzly Gulch trailheads near the Alpine Loop. A well-graded trail leads directly to the broad, gentle summit.",
  },
  {
    name: "San Luis Peak",
    altitude: 14014,
    range: MountainRange.SAN_JUAN,
    latitude: 37.9866,
    longitude: -106.9312,
    difficulty: Difficulty.CLASS_1,
    trailheadElevation: 10400,
    elevationGain: 3600,
    roundTripMiles: 13.5,
    estimatedHours: 8.0,
    description:
      "The most isolated and least-visited of the San Juan 14ers, requiring a long approach through the La Garita Wilderness. Despite its Class 1 rating, the 13.5-mile round trip demands good aerobic conditioning.",
  },
  {
    name: "Mount Sneffels",
    altitude: 14150,
    range: MountainRange.SAN_JUAN,
    latitude: 38.0023,
    longitude: -107.7887,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 11400,
    elevationGain: 2900,
    roundTripMiles: 6.0,
    estimatedHours: 5.5,
    description:
      "One of Colorado's most beautiful 14ers, rising dramatically above the Yankee Boy Basin near Ouray. The standard Southwest Ridge route involves a short but steep Class 3 gully scramble to the exposed summit.",
  },
  {
    name: "Windom Peak",
    altitude: 14082,
    range: MountainRange.SAN_JUAN,
    latitude: 37.6213,
    longitude: -107.5921,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 8200,
    elevationGain: 3000,
    roundTripMiles: 6.0,
    estimatedHours: 5.0,
    description:
      "One of the remote Chicago Basin 14ers in the Weminuche Wilderness, accessible only by backpacking or the Durango & Silverton Narrow Gauge Railroad. Often climbed together with Sunlight Peak and Mount Eolus.",
  },
  {
    name: "Sunlight Peak",
    altitude: 14059,
    range: MountainRange.SAN_JUAN,
    latitude: 37.6271,
    longitude: -107.5952,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 8200,
    elevationGain: 3000,
    roundTripMiles: 6.0,
    estimatedHours: 5.5,
    description:
      "Deceptively difficult for its altitude, the South Face route requires exposed Class 4 moves on the summit block above a high platform. Located in Chicago Basin alongside Windom and Eolus.",
  },
  {
    name: "Mount Eolus",
    altitude: 14083,
    range: MountainRange.SAN_JUAN,
    latitude: 37.6218,
    longitude: -107.6218,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 8200,
    elevationGain: 3100,
    roundTripMiles: 6.0,
    estimatedHours: 5.5,
    description:
      "The highest of the Chicago Basin peaks, accessible only by Durango & Silverton train or a long trail approach into the Weminuche Wilderness. The North Couloir route involves Class 3 scrambling on compact rock.",
  },
  {
    name: "North Eolus",
    altitude: 14039,
    range: MountainRange.SAN_JUAN,
    latitude: 37.6231,
    longitude: -107.6200,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 8200,
    elevationGain: 3350,
    roundTripMiles: 6.2,
    estimatedHours: 6.0,
    description:
      "An unofficial 14er directly north of Mount Eolus with only ~179 ft of prominence, typically tagged during the same outing. The connecting ridge involves Class 3 scrambling on exposed rock above Chicago Basin.",
  },

  // ─── ELK MOUNTAINS (7 peaks) ───────────────────────────────────────────────
  {
    name: "Castle Peak",
    altitude: 14265,
    range: MountainRange.ELK,
    latitude: 38.9344,
    longitude: -106.8614,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9800,
    elevationGain: 4600,
    roundTripMiles: 13.5,
    estimatedHours: 9.0,
    description:
      "The highest peak in the Elk Mountains, with a long approach via Montezuma Basin and a straightforward North Slopes summit. Often combined with Conundrum Peak for a demanding multi-summit day.",
  },
  {
    name: "Conundrum Peak",
    altitude: 14060,
    range: MountainRange.ELK,
    latitude: 38.9258,
    longitude: -106.8406,
    difficulty: Difficulty.CLASS_2,
    trailheadElevation: 9800,
    elevationGain: 4400,
    roundTripMiles: 13.5,
    estimatedHours: 9.0,
    description:
      "An unofficial Elk Range 14er lacking the 300-ft prominence requirement, sharing the Montezuma Basin approach with Castle Peak. The traverse between the two peaks makes for a satisfying long day outing.",
  },
  {
    name: "Capitol Peak",
    altitude: 14130,
    range: MountainRange.ELK,
    latitude: 39.1503,
    longitude: -107.0831,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 9450,
    elevationGain: 5300,
    roundTripMiles: 17.0,
    estimatedHours: 13.0,
    description:
      "Widely regarded as the most difficult and dangerous 14er in Colorado, featuring the notorious Knife Edge traverse. The Northeast Ridge route demands serious Class 4 climbing experience and a steady head for extreme exposure.",
  },
  {
    name: "Snowmass Mountain",
    altitude: 14092,
    range: MountainRange.ELK,
    latitude: 39.1189,
    longitude: -107.0664,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 8400,
    elevationGain: 5800,
    roundTripMiles: 22.0,
    estimatedHours: 13.0,
    description:
      "The most remote Elk Range 14er, requiring either a long day hike or overnight in the Maroon Bells-Snowmass Wilderness. The South Slopes route involves persistent Class 3 scrambling on firm rock above Snowmass Lake.",
  },
  {
    name: "Maroon Peak",
    altitude: 14163,
    range: MountainRange.ELK,
    latitude: 39.0706,
    longitude: -106.9892,
    difficulty: Difficulty.CLASS_3,
    trailheadElevation: 9600,
    elevationGain: 4800,
    roundTripMiles: 12.0,
    estimatedHours: 9.0,
    description:
      "The higher of the twin Maroon Bells, possibly the most photographed mountain in Colorado. Despite its breathtaking beauty, the South Ridge standard route features notoriously loose and deceptive conglomerate rock.",
  },
  {
    name: "North Maroon Peak",
    altitude: 14014,
    range: MountainRange.ELK,
    latitude: 39.0789,
    longitude: -106.9872,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 9600,
    elevationGain: 4600,
    roundTripMiles: 9.25,
    estimatedHours: 8.5,
    description:
      "An unofficial 14er sharing the iconic Maroon Bells profile, requiring Class 4 scrambling and solid rock craft to safely navigate the rotten Maroon Formation. Typically combined with Maroon Peak via the famous Bell Cord Couloir.",
  },
  {
    name: "Pyramid Peak",
    altitude: 14018,
    range: MountainRange.ELK,
    latitude: 39.0717,
    longitude: -106.9500,
    difficulty: Difficulty.CLASS_4,
    trailheadElevation: 9600,
    elevationGain: 4500,
    roundTripMiles: 8.25,
    estimatedHours: 8.0,
    description:
      "A steep, imposing Elk Range peak notorious for its crumbling Maroon Formation rock, earning the Bells area the nickname 'the Deadly Bells.' The Northeast Ridge standard route demands Class 4 skill and vigilance against rockfall.",
  },
];

async function main() {
  const existing = await prisma.mountain.count();
  if (existing > 0) {
    console.log(`Already seeded (${existing} mountains). Skipping.`);
    return;
  }

  console.log("Seeding Colorado 14ers...");

  const result = await prisma.mountain.createMany({
    data: mountains,
  });

  console.log(`Seeded ${result.count} mountains.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
