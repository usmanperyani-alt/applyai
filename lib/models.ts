/**
 * Centralized model identifiers.
 *
 * Default provider is Z.ai (Zhipu) via GLM-4.6 — set ZAI_API_KEY in .env.local.
 * Anthropic IDs kept for the optional fallback path (set ANTHROPIC_API_KEY instead).
 */

// --- Z.ai / GLM ---
export const ZAI_MODEL_TAILOR = "glm-4.6";  // smart writing, structured extraction
export const ZAI_MODEL_MATCH = "glm-4.5-air"; // cheaper for high-volume grading

// --- Anthropic Claude (fallback) ---
export const MODEL_TAILOR = "claude-sonnet-4-6";
export const MODEL_MATCH = "claude-haiku-4-5-20251001";
