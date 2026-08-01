import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { activeModelId, generateStructured, isAiConfigured } from "./provider.js";
import { DIGEST_JSON_SCHEMA, digestOutputSchema, type DigestOutput } from "./digest.schema.js";

/** Below this many sources there is nothing worth synthesizing. */
const MIN_SOURCES = 2;
const MAX_SOURCES = 15;
const LOOKBACK_MONTHS = 18;
/** Regenerate an unchanged digest anyway once it is this old. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** After a failed generation, don't retry this mountain for a while. */
const FAILURE_COOLDOWN_MS = 30 * 60 * 1000;
/**
 * Prompt size caps. One 20-page trip report shouldn't crowd out the other
 * fourteen sources, and free-tier providers meter tokens per minute — so the
 * prompt has to stay predictable regardless of what climbers wrote.
 */
const MAX_SOURCE_CHARS = 1_800;
const MAX_PROMPT_CHARS = 12_000;

/** Cut at a word boundary where possible, so a source never ends mid-word. */
function clampText(text: string, limit: number): string {
  if (limit < 80) return ""; // too little room left to say anything useful
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const SYSTEM_PROMPT = `You summarize trip reports from climbers on Colorado 14ers into a short conditions briefing for someone deciding whether to attempt the peak in the next few days.

People make safety decisions from what you write, so grounding matters more than completeness:

- Use ONLY the reports provided. Never add conditions, hazards, dates, or gear from general knowledge of the peak or the season. If the reports don't mention snow, there is no snow line.
- Prefer recent reports over old ones. When reports conflict, say so plainly rather than averaging them into a confident-sounding middle.
- Quantify only what a reporter quantified. Don't convert "there was still some snow up high" into an elevation.
- Every hazard, gear item, and route note must trace to a specific report. Put those reports' ids in sourceIds.
- Set confidence honestly: HIGH needs several recent reports that agree; LOW when they are few, stale, or contradictory. A thin digest marked LOW is far more useful than a thorough-sounding one that is partly invented.
- Leave arrays empty and snowLine null rather than filling them with weak inferences.

Write for a climber packing tonight: concrete and specific, no preamble, no restating the mountain's stats, no generic advice like "check the weather" or "bring layers" unless a reporter actually flagged it.`;

type Source = {
  id: string;
  kind: "report" | "note" | "review";
  date: Date;
  label: string;
  text: string;
};

/** In-flight generations, so concurrent readers don't all fire the same call. */
const inFlight = new Set<string>();
/**
 * When the last background generation for a mountain threw. Without this, an
 * outage or an empty credit balance turns every page view into another doomed
 * API call, since no row ever gets cached to stop the retries.
 */
const lastFailureAt = new Map<string, number>();

async function gatherSources(mountainId: string): Promise<Source[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - LOOKBACK_MONTHS);

  const [reports, completions, reviews] = await Promise.all([
    prisma.tripReport.findMany({
      where: { mountainId, isPublic: true, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_SOURCES,
      select: { id: true, title: true, body: true, conditions: true, createdAt: true },
    }),
    prisma.completion.findMany({
      where: { mountainId, isPrivate: false, notes: { not: null }, completedAt: { gte: since } },
      orderBy: { completedAt: "desc" },
      take: MAX_SOURCES,
      select: { id: true, notes: true, completedAt: true },
    }),
    prisma.review.findMany({
      where: { mountainId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_SOURCES,
      select: { id: true, body: true, rating: true, hikedAt: true, createdAt: true },
    }),
  ]);

  const sources: Source[] = [
    ...reports.map((r) => ({
      id: `report:${r.id}`,
      kind: "report" as const,
      date: r.createdAt,
      label: r.conditions ? `trip report — reporter rated conditions ${r.conditions}` : "trip report",
      text: `${r.title}\n${r.body}`,
    })),
    ...completions.map((c) => ({
      id: `note:${c.id}`,
      kind: "note" as const,
      date: c.completedAt,
      label: "summit log note",
      text: c.notes!,
    })),
    ...reviews.map((r) => ({
      id: `review:${r.id}`,
      kind: "review" as const,
      date: r.hikedAt ?? r.createdAt,
      label: `review — ${r.rating}/5`,
      text: r.body,
    })),
  ];

  return sources
    .filter((s) => s.text.trim().length >= 20)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, MAX_SOURCES);
}

function fingerprintOf(sources: Source[]): string {
  const material = sources
    .map((s) => `${s.id}@${s.date.getTime()}`)
    .sort()
    .join("|");
  // Model id is part of the fingerprint, so switching provider or model
  // regenerates every digest instead of leaving stale output from the old one.
  return createHash("sha256").update(`${activeModelId()}::${material}`).digest("hex");
}

function buildUserPrompt(mountainName: string, altitude: number, sources: Source[]): string {
  const today = new Date().toISOString().slice(0, 10);
  // Sources arrive newest-first, so filling the budget in order keeps the freshest
  // reports and drops the stalest — the opposite would be worse than useless.
  let remaining = MAX_PROMPT_CHARS;
  const blocks = sources
    .map((s) => {
      const date = s.date.toISOString().slice(0, 10);
      const trimmed = clampText(s.text.trim(), Math.min(MAX_SOURCE_CHARS, remaining));
      if (!trimmed) return null;
      remaining -= trimmed.length;
      return `<source id="${s.id}" date="${date}" type="${s.label}">\n${trimmed}\n</source>`;
    })
    .filter((block): block is string => block !== null)
    .join("\n\n");

  return `Peak: ${mountainName} (${altitude.toLocaleString()} ft)
Today's date: ${today}

${blocks}`;
}

async function callModel(
  mountainName: string,
  altitude: number,
  sources: Source[]
): Promise<DigestOutput | null> {
  const text = await generateStructured({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(mountainName, altitude, sources),
    schema: DIGEST_JSON_SCHEMA,
    // Has to cover reasoning tokens too, not just the JSON.
    maxTokens: 8000,
  });
  if (!text) return null;

  // Providers enforce the schema to differing degrees, so never trust the shape:
  // anything that doesn't validate is dropped rather than written to the row.
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.warn(`[digest] unparseable JSON for ${mountainName}`);
    return null;
  }

  const parsed = digestOutputSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(`[digest] schema mismatch for ${mountainName}:`, parsed.error.issues);
    return null;
  }

  // Drop any source id the model didn't copy verbatim from the input, so the UI
  // can never link to a citation that doesn't exist.
  const known = new Set(sources.map((s) => s.id));
  return { ...parsed.data, sourceIds: parsed.data.sourceIds.filter((id) => known.has(id)) };
}

export const digestService = {
  /** Cached digest for a mountain, or null when one has never been generated. */
  async get(mountainId: string) {
    return prisma.mountainConditionsDigest.findUnique({ where: { mountainId } });
  },

  /**
   * Generate and store a digest. Returns the stored row, or null when there was
   * nothing to summarize / no API key / the model declined.
   *
   * `force` skips the fingerprint check that normally makes an unchanged
   * regeneration a no-op.
   */
  async generate(mountainId: string, { force = false } = {}) {
    if (!isAiConfigured()) return null;

    const mountain = await prisma.mountain.findUnique({
      where: { id: mountainId },
      select: { id: true, name: true, altitude: true },
    });
    if (!mountain) return null;

    const sources = await gatherSources(mountainId);
    if (sources.length < MIN_SOURCES) return null;

    const fingerprint = fingerprintOf(sources);
    const existing = await prisma.mountainConditionsDigest.findUnique({ where: { mountainId } });
    const fresh = existing && Date.now() - existing.generatedAt.getTime() < MAX_AGE_MS;
    if (!force && existing?.fingerprint === fingerprint && fresh) return existing;

    const output = await callModel(mountain.name, mountain.altitude, sources);
    if (!output) return existing;

    const data = {
      summary: output.summary,
      snowLine: output.snowLine,
      hazards: output.hazards,
      gear: output.gear,
      routeNotes: output.routeNotes,
      crowding: output.crowding,
      confidence: output.confidence,
      sourceIds: output.sourceIds,
      sourceCount: sources.length,
      fingerprint,
      model: activeModelId(),
      generatedAt: new Date(),
    };

    return prisma.mountainConditionsDigest.upsert({
      where: { mountainId },
      create: { mountainId, ...data },
      update: data,
    });
  },

  /**
   * Kick off a regeneration without blocking the caller. Safe to call from a
   * request handler: failures are logged, never surfaced, and concurrent calls
   * for the same mountain collapse into one.
   */
  refreshInBackground(mountainId: string) {
    if (!isAiConfigured()) return;

    // One generation at a time app-wide. Free-tier providers meter tokens per
    // minute, and two peaks refreshing at once is the easiest way to trip that.
    // A skipped refresh isn't lost — the next page view schedules it again.
    if (inFlight.size > 0) return;

    const failedAt = lastFailureAt.get(mountainId);
    if (failedAt !== undefined && Date.now() - failedAt < FAILURE_COOLDOWN_MS) return;

    inFlight.add(mountainId);

    void digestService
      .generate(mountainId)
      .then(() => lastFailureAt.delete(mountainId))
      .catch((err) => {
        lastFailureAt.set(mountainId, Date.now());
        console.error(`[digest] generation failed for ${mountainId}:`, err);
      })
      .finally(() => inFlight.delete(mountainId));
  },

  /** True when the cached row is old enough to be worth refreshing. */
  isStale(generatedAt: Date): boolean {
    return Date.now() - generatedAt.getTime() >= MAX_AGE_MS;
  },
};
