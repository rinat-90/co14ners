import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { hikeTrackService } from "./hikeTrack.service.js";
import { saveTrackSchema } from "./hikeTrack.schema.js";

export const hikeTrackRouter = router({
  /** Store a track recorded by the live hike tracker. */
  save: protectedProcedure
    .input(saveTrackSchema)
    .mutation(({ ctx, input }) => hikeTrackService.save(ctx.user.id, input)),

  /** Current user's recorded hikes, newest first. */
  myTracks: protectedProcedure.query(({ ctx }) => hikeTrackService.listMine(ctx.user.id)),

  /** Public tracks recorded on a mountain. Summaries only — no point arrays. */
  forMountain: publicProcedure
    .input(z.object({ mountainId: z.string(), limit: z.number().int().min(1).max(50).default(6) }))
    .query(({ input }) => hikeTrackService.listForMountain(input.mountainId, input.limit)),

  /** One track with its points. Public, but private tracks resolve to null. */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => hikeTrackService.get(input.id, ctx.user?.id ?? null)),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => hikeTrackService.remove(input.id, ctx.user.id)),

  setVisibility: protectedProcedure
    .input(z.object({ id: z.string(), isPublic: z.boolean() }))
    .mutation(({ ctx, input }) =>
      hikeTrackService.setVisibility(input.id, ctx.user.id, input.isPublic)
    ),
});
