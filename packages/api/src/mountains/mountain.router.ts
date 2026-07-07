import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { mountainService } from "./mountain.service.js";
import { listMountainsSchema, getMountainSchema, getMountainBySlugSchema } from "./mountain.schema.js";

export const mountainRouter = router({
  list: publicProcedure
    .input(listMountainsSchema)
    .query(({ input }) => mountainService.list(input)),

  get: publicProcedure
    .input(getMountainSchema)
    .query(({ input }) => mountainService.getById(input.id)),

  getBySlug: publicProcedure
    .input(getMountainBySlugSchema)
    .query(({ input }) => mountainService.getBySlug(input.slug)),

  globalStats: publicProcedure
    .query(() => mountainService.globalStats()),

  nearby: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ input }) => mountainService.nearby(input.mountainId)),

  recentConditions: publicProcedure
    .input(z.object({ mountainId: z.string() }))
    .query(({ input }) => mountainService.recentConditions(input.mountainId)),
});
