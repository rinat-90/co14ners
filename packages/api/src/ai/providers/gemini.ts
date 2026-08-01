import type { AiProvider, StructuredRequest } from "../provider.js";

/**
 * Gemini's free tier covers the Flash and Flash-Lite families (Pro lost its free
 * row in April 2026), which is plenty for a background job that runs a few times
 * a day. Override with GEMINI_MODEL when a newer Flash ships.
 */
const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Overridable so a proxy — or a test — can stand in for Google. */
function apiBase(): string {
  return (process.env.GEMINI_BASE_URL?.trim() || DEFAULT_API_BASE).replace(/\/$/, "");
}

/**
 * Where the response schema goes in the request. Current docs nest it under
 * `generationConfig.responseFormat`; older API versions took
 * `responseMimeType` + `responseSchema` as siblings. We try the current shape and
 * fall back once if the endpoint rejects the field, so this keeps working across
 * both without anyone having to pin a version.
 */
type SchemaStyle = "responseFormat" | "legacy";

type GeminiPart = { text?: string; thought?: boolean };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

/** finishReason values that mean "there is no usable answer", not "here it is". */
const BLOCKED_REASONS = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"]);

function buildBody({ system, user, schema, maxTokens }: StructuredRequest, style: SchemaStyle) {
  const format =
    style === "responseFormat"
      ? { responseFormat: { text: { mimeType: "application/json", schema } } }
      : { responseMimeType: "application/json", responseSchema: schema };

  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: maxTokens, ...format },
  };
}

async function post(request: StructuredRequest, style: SchemaStyle) {
  const response = await fetch(`${apiBase()}/${geminiProvider.modelId()}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify(buildBody(request, style)),
  });

  const body = (await response.json().catch(() => ({}))) as GeminiResponse;
  return { ok: response.ok, status: response.status, body };
}

/** True when a 400 is about the schema field itself rather than our content. */
function isUnknownFieldError(body: GeminiResponse): boolean {
  const message = body.error?.message ?? "";
  return /unknown name|invalid json payload|cannot find field/i.test(message);
}

export const geminiProvider: AiProvider = {
  id: "gemini",

  modelId() {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  },

  isConfigured() {
    return !!process.env.GEMINI_API_KEY;
  },

  async generateStructured(request) {
    if (!geminiProvider.isConfigured()) throw new Error("GEMINI_API_KEY is not set");

    let result = await post(request, "responseFormat");
    if (!result.ok && result.status === 400 && isUnknownFieldError(result.body)) {
      console.warn("[ai:gemini] responseFormat rejected, retrying with responseSchema");
      result = await post(request, "legacy");
    }

    if (!result.ok) {
      const detail = result.body.error?.message ?? result.body.error?.status ?? "unknown error";
      throw new Error(`Gemini request failed (${result.status}): ${detail}`);
    }

    const { body } = result;
    if (body.promptFeedback?.blockReason) {
      console.warn("[ai:gemini] prompt blocked:", body.promptFeedback.blockReason);
      return null;
    }

    const candidate = body.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason && BLOCKED_REASONS.has(finishReason)) {
      console.warn("[ai:gemini] response blocked:", finishReason);
      return null;
    }
    if (finishReason === "MAX_TOKENS") {
      // Truncated JSON would only fail validation downstream — say why here.
      console.warn("[ai:gemini] hit maxOutputTokens before finishing the JSON");
      return null;
    }

    // Reasoning models return their thinking as parts too; those aren't the answer.
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");

    return text.trim() ? text : null;
  },
};
