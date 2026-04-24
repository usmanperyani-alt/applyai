/**
 * AI helpers — wraps z.ai (default) or Anthropic (fallback).
 *
 * Set ZAI_API_KEY for z.ai (preferred), or ANTHROPIC_API_KEY for Anthropic.
 *
 * The file is named `anthropic.ts` for backwards compatibility — existing
 * imports keep working while the implementation routes to whichever provider
 * is configured.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MatchResult, CVContent } from "@/types";
import { MODEL_TAILOR, MODEL_MATCH, ZAI_MODEL_TAILOR, ZAI_MODEL_MATCH } from "./models";
import { hasZai, zaiChat, stripMarkdownFences } from "./zai";

function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Provider-agnostic chat. Z.ai first, Anthropic fallback. */
async function chat(
  prompt: string,
  options: { maxTokens?: number; smart?: boolean } = {}
): Promise<string> {
  const maxTokens = options.maxTokens ?? 4096;
  const smart = options.smart ?? true;

  if (hasZai()) {
    const res = await zaiChat([{ role: "user", content: prompt }], {
      model: smart ? ZAI_MODEL_TAILOR : ZAI_MODEL_MATCH,
      maxTokens,
      temperature: 0.3,
      thinking: false, // structured output — disable reasoning
    });
    return stripMarkdownFences(res.text);
  }

  if (hasAnthropic()) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const message = await client.messages.create({
      model: smart ? MODEL_TAILOR : MODEL_MATCH,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return stripMarkdownFences(text);
  }

  throw new Error(
    "No AI provider configured. Set ZAI_API_KEY (preferred) or ANTHROPIC_API_KEY in .env.local."
  );
}

/**
 * Score a job against a candidate profile. Uses the cheaper model.
 */
export async function matchJobToProfile(
  profile: {
    full_name: string;
    headline: string;
    roles: string[];
    skills: string[];
    location: string;
    remote_only: boolean;
    salary_min: number;
    salary_max: number;
  },
  job: {
    title: string;
    company: string;
    location: string;
    remote: boolean;
    salary_min: number | null;
    salary_max: number | null;
    description: string;
  }
): Promise<MatchResult> {
  const prompt = `You are a job matching engine. Score this job against the candidate profile.
Return JSON only with no markdown formatting: { "score": number, "matched_skills": string[], "missing_skills": string[], "reason": string }

The score should be 0-100 based on:
- Skill overlap (40% weight)
- Role/title relevance (25% weight)
- Location/remote compatibility (15% weight)
- Salary range fit (10% weight)
- Seniority match (10% weight)

Candidate profile:
${JSON.stringify(profile, null, 2)}

Job posting:
${JSON.stringify(job, null, 2)}`;

  const text = await chat(prompt, { maxTokens: 1024, smart: false });
  try {
    return JSON.parse(text) as MatchResult;
  } catch {
    return {
      score: 0,
      matched_skills: [],
      missing_skills: [],
      reason: "Failed to parse AI response",
    };
  }
}

/**
 * Tailor a CV for a specific job posting. Uses the smarter model.
 */
export async function tailorCV(
  masterCV: CVContent,
  job: {
    title: string;
    company: string;
    description: string;
  }
): Promise<CVContent> {
  const prompt = `You are an expert CV writer. Rewrite the candidate's CV to maximize fit for this specific role.

Strict rules:
- ONLY use facts from the master CV. Do not fabricate experience, skills, or dates.
- Reorder and rewrite bullet points to emphasize relevant experience already present.
- Inject keywords from the job description ONLY where they are truthfully supported by the master CV.
- If a key requirement from the job is missing from the CV, leave it absent — do NOT invent it.
- Keep the same JSON structure as the input.
- Return the full tailored CV as JSON only with no markdown formatting.

Master CV:
${JSON.stringify(masterCV, null, 2)}

Target job:
${JSON.stringify(job, null, 2)}`;

  const text = await chat(prompt, { maxTokens: 4096, smart: true });
  try {
    return JSON.parse(text) as CVContent;
  } catch {
    return masterCV;
  }
}

/** True when ANY supported provider is configured. */
export function hasAIProvider(): boolean {
  return hasZai() || hasAnthropic();
}
