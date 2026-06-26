import { router, publicProcedure } from "../trpc.js";
import { mountainService } from "./mountain.service.js";
import { listMountainsSchema, getMountainSchema } from "./mountain.schema.js";

export const mountainRouter = router({
  list: publicProcedure
    .input(listMountainsSchema)
    .query(({ input }) => mountainService.list(input)),

  get: publicProcedure
    .input(getMountainSchema)
    .query(({ input }) => mountainService.getById(input.id)),
});
