/**
 * Z.ai (Zhipu) chat client using their OpenAI-compatible REST endpoint.
 * No SDK dependency — just fetch.
 *
 * GLM-4.6 has extended thinking enabled by default; we disable it for
 * structured-output use cases (CV extraction, tailoring) so all output
 * tokens go to the actual response.
 */

const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4";

export interface ZaiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ZaiChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** GLM-4.6 reasons by default. Set false (default here) to disable. */
  thinking?: boolean;
}

export interface ZaiResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export function hasZai(): boolean {
  return Boolean(process.env.ZAI_API_KEY);
}

export async function zaiChat(
  messages: ZaiMessage[],
  options: ZaiChatOptions = {}
): Promise<ZaiResponse> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error("ZAI_API_KEY is not set");

  const body = {
    model: options.model || "glm-4.6",
    messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    thinking: { type: options.thinking ? "enabled" : "disabled" },
  };

  const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Z.ai API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return {
    text,
    inputTokens: data?.usage?.prompt_tokens ?? 0,
    outputTokens: data?.usage?.completion_tokens ?? 0,
    reasoningTokens: data?.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
  };
}

/**
 * Strip markdown code fences a model may have wrapped JSON in.
 * Handles ```json ... ``` and ``` ... ```
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json|JSON)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}
