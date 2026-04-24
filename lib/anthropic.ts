import Anthropic from "@anthropic-ai/sdk";
import type { MatchResult, CVContent } from "@/types";
import { MODEL_TAILOR, MODEL_MATCH } from "./models";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Safely extract text from a Claude message — handles multi-block responses
 * (e.g. when extended thinking or tool use is enabled).
 */
function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Score a job against a candidate profile.
 * Uses Haiku — high-volume, cheap per-job grading.
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
  const message = await client.messages.create({
    model: MODEL_MATCH,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a job matching engine. Score this job against the candidate profile.
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
${JSON.stringify(job, null, 2)}`,
      },
    ],
  });

  const text = extractText(message);

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
 * Tailor a CV for a specific job posting.
 * Uses Sonnet — needs strong instruction following and writing quality.
 */
export async function tailorCV(
  masterCV: CVContent,
  job: {
    title: string;
    company: string;
    description: string;
  }
): Promise<CVContent> {
  const message = await client.messages.create({
    model: MODEL_TAILOR,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an expert CV writer. Rewrite the candidate's CV to maximize fit for this specific role.

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
${JSON.stringify(job, null, 2)}`,
      },
    ],
  });

  const text = extractText(message);

  try {
    return JSON.parse(text) as CVContent;
  } catch {
    // Return original CV if parsing fails
    return masterCV;
  }
}
