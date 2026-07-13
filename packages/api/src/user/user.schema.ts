import { z } from "zod";

export const logSummitSchema = z.object({
  mountainId: z.string(),
  completedAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  trailId: z.string().optional(),
  isPrivate: z.boolean().default(false),
  photoUrl: z.string().url().optional(),
});

export const updateCompletionSchema = z.object({
  id: z.string(),
  completedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isPrivate: z.boolean().optional(),
});

export const deleteCompletionSchema = z.object({
  id: z.string(),
});

export const favoriteSchema = z.object({
  mountainId: z.string(),
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
