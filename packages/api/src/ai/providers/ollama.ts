import type { AiProvider } from "../provider.js";

const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1:8b";

type OllamaResponse = {
  message?: { content?: string };
  done_reason?: string;
  error?: string;
};

function host(): string {
  return (process.env.OLLAMA_HOST?.trim() || DEFAULT_HOST).replace(/\/$/, "");
}

/**
 * Local inference — free and offline, but a small local model is noticeably
 * worse than a hosted one at admitting it has nothing to report, which matters
 * for a safety-relevant digest. Useful for development; only ever selected by
 * setting AI_PROVIDER=ollama explicitly.
 */
export const ollamaProvider: AiProvider = {
  id: "ollama",

  modelId() {
    return process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
  },

  isConfigured() {
    // No credentials exist to check; asking for it is the configuration.
    return true;
  },

  async generateStructured({ system, user, schema, maxTokens }) {
    let response: Response;
    try {
      response = await fetch(`${host()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: ollamaProvider.modelId(),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          // Ollama constrains generation to a JSON Schema passed as `format`.
          format: schema,
          stream: false,
          options: { num_predict: maxTokens, temperature: 0 },
        }),
      });
    } catch (err) {
      throw new Error(`Ollama unreachable at ${host()} — is it running?`, { cause: err });
    }

    const body = (await response.json().catch(() => ({}))) as OllamaResponse;
    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}): ${body.error ?? "unknown error"}`);
    }

    if (body.done_reason === "length") {
      console.warn("[ai:ollama] hit num_predict before finishing the JSON");
      return null;
    }

    const text = body.message?.content ?? "";
    return text.trim() ? text : null;
  },
};
