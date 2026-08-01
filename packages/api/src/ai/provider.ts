import { anthropicProvider } from "./providers/anthropic.js";
import { geminiProvider } from "./providers/gemini.js";
import { groqProvider } from "./providers/groq.js";
import { ollamaProvider } from "./providers/ollama.js";

export type ProviderId = "anthropic" | "gemini" | "groq" | "ollama";

export type StructuredRequest = {
  /** Instructions that don't vary between calls — cached where the provider supports it. */
  system: string;
  user: string;
  /** JSON Schema the response is constrained to. */
  schema: object;
  /** Ceiling on generated tokens. Must cover reasoning tokens as well as output. */
  maxTokens: number;
};

export type AiProvider = {
  id: ProviderId;
  /** Model identifier stored on the digest row and mixed into its fingerprint. */
  modelId(): string;
  isConfigured(): boolean;
  /**
   * Raw JSON text from the model, or null when it declined, was blocked, or
   * returned nothing usable. Callers validate the JSON themselves, so a
   * provider that enforces the schema loosely still can't write bad rows.
   */
  generateStructured(request: StructuredRequest): Promise<string | null>;
};

const PROVIDERS: Record<ProviderId, AiProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  groq: groqProvider,
  ollama: ollamaProvider,
};

let warnedAboutBadId = false;

function resolveProvider(): AiProvider {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (requested) {
    const provider = PROVIDERS[requested as ProviderId];
    if (provider) return provider;
    if (!warnedAboutBadId) {
      warnedAboutBadId = true;
      console.warn(
        `[ai] AI_PROVIDER="${requested}" is not one of ${Object.keys(PROVIDERS).join(", ")} — falling back to key detection.`
      );
    }
  }

  // No usable choice given: use whichever key is present, Anthropic first so
  // existing deployments keep their current behaviour. Ollama is never picked
  // implicitly — that would mean quietly calling a localhost port nobody asked for.
  if (anthropicProvider.isConfigured()) return anthropicProvider;
  if (geminiProvider.isConfigured()) return geminiProvider;
  return groqProvider;
}

/** The provider AI features will actually use, given the current environment. */
export function activeProvider(): AiProvider {
  return resolveProvider();
}

/**
 * True when the active provider has what it needs. Every AI feature checks this
 * first and degrades to "no digest" rather than throwing — the app must run fine
 * with no AI credentials configured at all.
 */
export function isAiConfigured(): boolean {
  return resolveProvider().isConfigured();
}

/** Model id of the active provider, e.g. "gemini-3.5-flash". */
export function activeModelId(): string {
  return resolveProvider().modelId();
}

export function generateStructured(request: StructuredRequest): Promise<string | null> {
  return resolveProvider().generateStructured(request);
}
