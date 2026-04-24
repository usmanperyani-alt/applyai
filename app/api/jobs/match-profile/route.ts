import { NextRequest, NextResponse } from "next/server";

interface ProfileData {
  skills: string[];
  roles: string[];
  headline: string;
  years_experience: number;
  location: string;
}

interface JobData {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  description_text?: string;
}

// POST /api/jobs/match-profile — score jobs against an extracted profile
export async function POST(req: NextRequest) {
  const { profile, jobs }: { profile: ProfileData; jobs: JobData[] } = await req.json();

  if (!profile || !jobs) {
    return NextResponse.json({ error: "profile and jobs are required" }, { status: 400 });
  }

  const profileSkills = new Set(profile.skills.map((s) => s.toLowerCase()));
  const profileRoles = profile.roles.map((r) => r.toLowerCase());
  const headline = (profile.headline || "").toLowerCase();

  const scored = jobs.map((job) => {
    let score = 0;
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    // Title/role relevance (40 points)
    const jobTitleLower = job.title.toLowerCase();
    const titleMatch = profileRoles.some(
      (role) =>
        jobTitleLower.includes(role) ||
        role.includes(jobTitleLower.split(" ")[0])
    );
    if (titleMatch) score += 35;
    else if (headline && jobTitleLower.split(" ").some((w) => headline.includes(w))) {
      score += 20;
    }

    // Skill matching (40 points)
    // Use description_text (stripped HTML) if available for better matching
    const descLower = (job.description_text || job.description || "").toLowerCase().replace(/<[^>]*>/g, " ");
    const jobWords = new Set([
      ...jobTitleLower.split(/\s+/),
      ...descLower.split(/\s+/),
    ]);

    for (const skill of profileSkills) {
      if (descLower.includes(skill) || jobTitleLower.includes(skill)) {
        matchedSkills.push(skill);
      }
    }

    // Common skill terms to check as missing
    const commonSkills = ["react", "figma", "python", "sql", "aws", "docker", "typescript", "javascript", "node.js"];
    for (const skill of commonSkills) {
      if (descLower.includes(skill) && !profileSkills.has(skill)) {
        missingSkills.push(skill);
      }
    }

    const skillScore = profileSkills.size > 0
      ? (matchedSkills.length / profileSkills.size) * 40
      : 10;
    score += Math.min(skillScore, 40);

    // Location match (10 points)
    if (job.remote) score += 10;
    else if (profile.location && job.location.toLowerCase().includes(profile.location.toLowerCase())) {
      score += 10;
    }

    // Base score (everyone gets at least some points for relevance)
    score += 10;

    // Cap at 100
    score = Math.min(Math.round(score), 100);

    return {
      ...job,
      match_score: score,
      matched_skills: matchedSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      missing_skills: missingSkills.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.match_score - a.match_score);

  return NextResponse.json({ jobs: scored });
}
