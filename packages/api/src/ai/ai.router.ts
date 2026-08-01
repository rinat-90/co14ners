import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc.js";
import { activeProvider, isAiConfigured } from "./provider.js";
import { digestService } from "./digest.service.js";
import { CONFIDENCE, CROWDING } from "./digest.schema.js";

type Hazard = { label: string; detail: string };

/**
 * Prisma returns the array columns as `JsonValue`. Narrow them here so the
 * client gets real types instead of `unknown` through the tRPC boundary.
 */
function shape(row: NonNullable<Awaited<ReturnType<typeof digestService.get>>>) {
  return {
    summary: row.summary,
    snowLine: row.snowLine,
    hazards: (row.hazards ?? []) as Hazard[],
    gear: (row.gear ?? []) as string[],
    routeNotes: (row.routeNotes ?? []) as string[],
    crowding: row.crowding as (typeof CROWDING)[number],
    confidence: row.confidence as (typeof CONFIDENCE)[number],
    sourceCount: row.sourceCount,
    generatedAt: row.generatedAt,
    isStale: digestService.isStale(row.generatedAt),
  };
}

export const aiRouter = router({
  /**
   * Read the cached conditions digest. Never calls the model on the request
   * path — if the row is missing or stale it schedules a background refresh and
   * returns what we have (possibly null), so the next visitor gets the fresh one.
   */
  conditionsDigest: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(async ({ input }) => {
      const row = await digestService.get(input.mountainId);

      if (!row || digestService.isStale(row.generatedAt)) {
        digestService.refreshInBackground(input.mountainId);
      }

      return row ? shape(row) : null;
    }),

  /** Whether AI features are switched on for this deployment, and by whom. */
  status: publicProcedure.query(() => {
    const provider = activeProvider();
    return { enabled: isAiConfigured(), provider: provider.id, model: provider.modelId() };
  }),

  /** Force a regeneration and wait for it — admin-only, since each call has a cost or a quota. */
  regenerateDigest: adminProcedure
    .input(z.object({ mountainId: z.string() }))
    .mutation(async ({ input }) => {
      const row = await digestService.generate(input.mountainId, { force: true });
      return row ? shape(row) : null;
    }),
});
