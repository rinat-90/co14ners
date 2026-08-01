import { z } from "zod";

export const CROWDING = ["QUIET", "MODERATE", "BUSY", "UNKNOWN"] as const;
export const CONFIDENCE = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * Shape the model must return. Sent to the API as `output_config.format` so the
 * response is constrained to it, then re-validated with the zod schema below
 * before anything touches the database.
 *
 * Structured outputs require `additionalProperties: false` on every object and
 * reject length/numeric constraints — keep those in the prompt, not the schema.
 */
export const DIGEST_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "Two or three sentences on what climbers are currently reporting. Plain language, specific, no hedging filler.",
    },
    snowLine: {
      type: ["string", "null"],
      description:
        'Approximate elevation where reporters said snow starts, e.g. "~12,400 ft". Null unless a report actually mentions it.',
    },
    hazards: {
      type: "array",
      description: "Conditions that could hurt someone. Empty array when none were reported.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: 'Short name, e.g. "Verglas on the ledges"' },
          detail: { type: "string", description: "One sentence of specifics from the reports." },
        },
        required: ["label", "detail"],
        additionalProperties: false,
      },
    },
    gear: {
      type: "array",
      description: 'Gear reporters said they needed, e.g. "microspikes", "ice axe". Empty when unreported.',
      items: { type: "string" },
    },
    routeNotes: {
      type: "array",
      description: "Route-specific beta worth knowing before starting. Empty when unreported.",
      items: { type: "string" },
    },
    crowding: {
      type: "string",
      enum: [...CROWDING],
      description: "UNKNOWN unless reports actually describe how busy it was.",
    },
    confidence: {
      type: "string",
      enum: [...CONFIDENCE],
      description:
        "HIGH only with several recent, consistent reports. LOW when sources are few, old, or contradictory.",
    },
    sourceIds: {
      type: "array",
      description: "Ids of the sources you actually drew on, copied exactly from the input.",
      items: { type: "string" },
    },
  },
  required: ["summary", "snowLine", "hazards", "gear", "routeNotes", "crowding", "confidence", "sourceIds"],
  additionalProperties: false,
} as const;

export const digestOutputSchema = z.object({
  summary: z.string().min(1),
  snowLine: z.string().nullable(),
  hazards: z.array(z.object({ label: z.string(), detail: z.string() })),
  gear: z.array(z.string()),
  routeNotes: z.array(z.string()),
  crowding: z.enum(CROWDING),
  confidence: z.enum(CONFIDENCE),
  sourceIds: z.array(z.string()),
});

export type DigestOutput = z.infer<typeof digestOutputSchema>;
