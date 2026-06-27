import { z } from "zod";

export const addReviewSchema = z.object({
  mountainId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  hikedAt: z.string().datetime().optional(),
});

export const updateReviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(5000).optional(),
  hikedAt: z.string().datetime().nullable().optional(),
});

export const deleteReviewSchema = z.object({
  id: z.string(),
});

export const listReviewsSchema = z.object({
  mountainId: z.string(),
});
