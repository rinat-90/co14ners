import type { AiProvider } from "../provider.js";

/**
 * Only the gpt-oss models support `strict: true` constrained decoding on Groq;
 * everything else degrades to best-effort JSON. Override with GROQ_MODEL.
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_API_BASE = "https://api.groq.com/openai/v1";

/**
 * Groq charges the requested `max_completion_tokens` against the per-minute
 * budget up front, so prompt + requested output must both fit under the TPM
 * limit or the call 413s before the model runs. Free tier is 8k TPM on
 * gpt-oss-120b; raise GROQ_TPM_LIMIT after upgrading the tier.
 */
const DEFAULT_TPM_LIMIT = 8_000;
/** Not worth calling with less room than this — a reasoning model would truncate. */
const MIN_OUTPUT_TOKENS = 1_500;
/** Chat scaffolding the tokenizer counts but we can't see. */
const OVERHEAD_TOKENS = 300;
/** Give up rather than sleep longer than this waiting out a 429. */
const MAX_RETRY_WAIT_MS = 30_000;
/**
 * Aim below the limit rather than at it: the token count below is a heuristic,
 * and landing exactly on the ceiling turns a small underestimate into a 413.
 */
const TPM_SAFETY_FACTOR = 0.95;

function tpmLimit(): number {
  const configured = Number(process.env.GROQ_TPM_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TPM_LIMIT;
}

/** Deliberately rough — English averages ~4 chars/token, so 3.5 errs high. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.ceil(seconds * 1000) + 250;
}

type GroqResponse = {
  choices?: { message?: { content?: string; refusal?: string }; finish_reason?: string }[];
  error?: { message?: string; type?: string };
};

/** Overridable so a proxy — or a test — can stand in for Groq. */
function apiBase(): string {
  return (process.env.GROQ_BASE_URL?.trim() || DEFAULT_API_BASE).replace(/\/$/, "");
}

export const groqProvider: AiProvider = {
  id: "groq",

  modelId() {
    return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  },

  isConfigured() {
    return !!process.env.GROQ_API_KEY;
  },

  async generateStructured({ system, user, schema, maxTokens }) {
    if (!groqProvider.isConfigured()) throw new Error("GROQ_API_KEY is not set");

    const schemaText = JSON.stringify(schema);
    const promptTokens =
      estimateTokens(system) + estimateTokens(user) + estimateTokens(schemaText) + OVERHEAD_TOKENS;
    const budget = Math.floor(tpmLimit() * TPM_SAFETY_FACTOR);
    const room = budget - promptTokens;

    if (room < MIN_OUTPUT_TOKENS) {
      console.warn(
        `[ai:groq] prompt needs ~${promptTokens} tokens, leaving only ${room} of the ${budget}-token working budget for output — skipping`
      );
      return null;
    }
    const completionTokens = Math.min(maxTokens, room);

    const payload = JSON.stringify({
      model: groqProvider.modelId(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "conditions_digest", strict: true, schema },
      },
      max_completion_tokens: completionTokens,
      temperature: 0,
    });

    const send = () =>
      fetch(`${apiBase()}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: payload,
      });

    let response = await send();

    // Per-minute quota is shared across everything hitting the org, so a 429 is
    // routine on the free tier rather than a real failure. Wait it out once.
    if (response.status === 429) {
      const wait = retryAfterMs(response);
      if (wait !== null && wait <= MAX_RETRY_WAIT_MS) {
        console.warn(`[ai:groq] rate limited, retrying in ${Math.round(wait / 1000)}s`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        response = await send();
      }
    }

    const body = (await response.json().catch(() => ({}))) as GroqResponse;
    if (!response.ok) {
      throw new Error(`Groq request failed (${response.status}): ${body.error?.message ?? "unknown error"}`);
    }

    const choice = body.choices?.[0];
    if (choice?.message?.refusal) {
      console.warn("[ai:groq] request refused:", choice.message.refusal);
      return null;
    }
    if (choice?.finish_reason === "length") {
      console.warn("[ai:groq] hit max_completion_tokens before finishing the JSON");
      return null;
    }

    const text = choice?.message?.content ?? "";
    return text.trim() ? text : null;
  },
};
