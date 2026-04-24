/**
 * Centralized Anthropic model identifiers.
 * Update here once when models change rather than hunting through files.
 */

// Smart model: structured extraction from PDFs, CV tailoring, hard reasoning.
export const MODEL_TAILOR = "claude-sonnet-4-6";

// Cheap, fast model: per-job grading, classification, high-volume calls.
export const MODEL_MATCH = "claude-haiku-4-5-20251001";

// Default Anthropic model for new code that doesn't specify
export const MODEL_DEFAULT = MODEL_TAILOR;
