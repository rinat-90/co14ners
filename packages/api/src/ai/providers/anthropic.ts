import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "../provider.js";

const DEFAULT_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export const anthropicProvider: AiProvider = {
  id: "anthropic",

  modelId() {
    return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  },

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async generateStructured({ system, user, schema, maxTokens }) {
    if (!anthropicProvider.isConfigured()) throw new Error("ANTHROPIC_API_KEY is not set");
    client ??= new Anthropic();

    const response = await client.messages.create({
      model: anthropicProvider.modelId(),
      max_tokens: maxTokens,
      output_config: {
        effort: "medium",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        format: { type: "json_schema", schema: schema as any },
      },
      // The system prompt is identical on every call, so cache it.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      console.warn("[ai:anthropic] request refused:", response.stop_details);
      return null;
    }

    const block = response.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : null;
  },
};
