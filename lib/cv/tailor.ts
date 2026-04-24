import { tailorCV } from "@/lib/anthropic";
import type { CVContent } from "@/types";

/**
 * High-level CV tailoring orchestrator.
 * Takes a master CV and job details, returns the tailored version
 * with metadata about what changed.
 */
export async function tailorCVForJob(
  masterCV: CVContent,
  job: { title: string; company: string; description: string }
): Promise<{
  tailored: CVContent;
  changes: string[];
}> {
  const tailored = await tailorCV(masterCV, job);

  // Compute a simple diff summary
  const changes: string[] = [];

  if (tailored.summary !== masterCV.summary) {
    changes.push("Rewrote professional summary");
  }

  for (let i = 0; i < tailored.experience.length; i++) {
    const original = masterCV.experience[i];
    const updated = tailored.experience[i];
    if (!original || !updated) continue;

    const originalBullets = original.bullets.join("\n");
    const updatedBullets = updated.bullets.join("\n");
    if (originalBullets !== updatedBullets) {
      changes.push(`Updated bullet points for ${updated.company}`);
    }
  }

  const originalSkills = new Set(masterCV.skills);
  const addedSkills = tailored.skills.filter((s) => !originalSkills.has(s));
  if (addedSkills.length > 0) {
    changes.push(`Added skills: ${addedSkills.join(", ")}`);
  }

  if (changes.length === 0) {
    changes.push("No significant changes needed");
  }

  return { tailored, changes };
}
