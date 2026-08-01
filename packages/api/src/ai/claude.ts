import Anthropic from "@anthropic-ai/sdk";

/** Model used for every AI feature in the app. */
export const CLAUDE_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

/**
 * True when an API key is present. Every AI feature checks this first and
 * degrades to "no digest" rather than throwing — the app must run fine without
 * an Anthropic key configured.
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function getClaude(): Anthropic {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic();
  return client;
}
