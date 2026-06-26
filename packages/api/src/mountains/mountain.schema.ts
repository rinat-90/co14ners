import { z } from "zod";

export const getMountainSchema = z.object({
  id: z.string(),
});

export const listMountainsSchema = z.object({
  range: z
    .enum([
      "SAWATCH",
      "ELK",
      "SAN_JUAN",
      "TENMILE_MOSQUITO",
      "FRONT",
      "SANGRE_DE_CRISTO",
      "OTHER",
    ])
    .optional(),
  difficulty: z
    .enum(["CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5"])
    .optional(),
  search: z.string().optional(),
});
