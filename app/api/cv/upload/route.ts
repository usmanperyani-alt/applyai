import { NextRequest, NextResponse } from "next/server";
// pdf-parse is loaded dynamically to avoid its test-file auto-load at import time
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_TAILOR } from "@/lib/models";

// POST /api/cv/upload — upload PDF, extract text, analyze with AI
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
  }

  // 1. Extract text from PDF
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let extractedText: string;
  try {
    // Dynamic require to avoid pdf-parse loading test fixtures at import time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text;
  } catch {
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 422 });
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "No text found in PDF. It may be image-based." }, { status: 422 });
  }

  // 2. Analyze with AI if API key is available
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: MODEL_TAILOR,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Analyze this CV/resume text and extract structured information. Return JSON only with no markdown formatting:

{
  "name": "full name",
  "headline": "professional headline (e.g. Senior Product Designer)",
  "location": "location or Remote",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "roles": ["target role 1", "target role 2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "location": "location",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null if current",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    { "degree": "degree name", "school": "school name", "year": "graduation year" }
  ],
  "certifications": ["cert1", "cert2"],
  "years_experience": number,
  "salary_estimate_min": number (USD, estimated based on role/experience),
  "salary_estimate_max": number (USD)
}

CV Text:
${extractedText.slice(0, 8000)}`,
          },
        ],
      });

      // Safely extract text — handles multi-block responses (extended thinking, tool use)
      const aiText = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      try {
        const profile = JSON.parse(aiText);
        return NextResponse.json({
          success: true,
          extractedText: extractedText.slice(0, 3000),
          profile,
          aiAnalyzed: true,
        });
      } catch {
        // AI response wasn't valid JSON, fall back to text-only
      }
    } catch {
      // AI call failed, fall back to text-only extraction
    }
  }

  // 3. Fallback: basic text extraction without AI
  const profile = extractBasicProfile(extractedText);
  return NextResponse.json({
    success: true,
    extractedText: extractedText.slice(0, 3000),
    profile,
    aiAnalyzed: false,
  });
}

// Structured text-based profile extraction (no AI needed)
function extractBasicProfile(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const textLower = text.toLowerCase();

  // --- Name: first non-empty line that looks like a name ---
  const name = lines[0] || "Unknown";

  // --- Email & phone ---
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  const phoneMatch = text.match(/\+?[\d\s()./-]{10,}/);

  // --- Headline: look for a line near the top that describes the role ---
  let headline = "";
  for (let i = 1; i < Math.min(lines.length, 8); i++) {
    const line = lines[i];
    // Skip lines that are just contact info
    if (line.includes("@") || line.match(/^\+?\d[\d\s()./-]+$/) || line.match(/linkedin\.com/i)) continue;
    // A headline is typically a short professional title
    if (line.length > 5 && line.length < 120 && !line.match(/^(http|www\.)/i)) {
      headline = line;
      break;
    }
  }

  // --- Skills ---
  const skillKeywords = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "CI/CD", "Terraform",
    "Figma", "Sketch", "Adobe", "Photoshop", "Illustrator", "InDesign", "After Effects",
    "HTML", "CSS", "Tailwind", "SASS", "REST", "GraphQL", "API", "Microservices",
    "Agile", "Scrum", "Jira", "Confluence", "Product Management", "UX", "UI",
    "Design Systems", "User Research", "Prototyping", "Wireframing", "A/B Testing",
    "Data Analysis", "Machine Learning", "AI", "Deep Learning", "NLP", "Computer Vision",
    "Marketing", "SEO", "SEM", "PPC", "Analytics", "Excel", "Tableau", "Power BI", "Looker",
    "Google Ads", "Meta Ads", "Facebook Ads", "Instagram Ads", "TikTok Ads", "LinkedIn Ads",
    "Growth Marketing", "Content Marketing", "Email Marketing", "CRM", "Salesforce", "HubSpot",
    "Paid Media", "Social Media", "Google Analytics", "GA4", "GTM", "Google Tag Manager",
    "Shopify", "WordPress", "Webflow", "Zapier", "Notion", "Slack",
    "Sales", "Account Management", "Business Development", "Strategy",
    "Communication", "Leadership", "Team Management", "Project Management", "Stakeholder Management",
    "Ecommerce", "E-commerce", "Conversion Rate Optimization", "CRO", "Performance Marketing",
    "Budget Management", "ROAS", "ROI", "KPI", "Funnel Optimization",
  ];

  const foundSkills = skillKeywords.filter((skill) =>
    textLower.includes(skill.toLowerCase())
  );

  // --- Roles: derive from headline and common patterns ---
  const roles: string[] = [];
  if (headline) {
    // Split headline by / or | or , to get multiple roles
    headline.split(/[/|,]/).forEach((part) => {
      const role = part.trim();
      if (role.length > 3 && role.length < 60) roles.push(role);
    });
  }

  // --- Experience: look for company/role patterns ---
  const experience: { title: string; company: string; location: string; start_date: string; end_date: string | null; bullets: string[] }[] = [];

  // Common section headers
  const expSectionRegex = /^(experience|work\s*experience|professional\s*experience|employment|work\s*history)/i;
  const eduSectionRegex = /^(education|academic|qualification|degree)/i;
  const skillSectionRegex = /^(skills|technical\s*skills|core\s*competencies|expertise)/i;
  const datePattern = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*\d{4}|\d{4})\s*[-–—to]+\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*\d{4}|\d{4}|present|current|now)/i;
  const yearMonthPattern = /(\d{4}[-/]\d{2}|\d{2}[-/]\d{4})/;

  // Find experience entries by looking for date ranges
  let inExperienceSection = false;
  let currentExp: { title: string; company: string; location: string; start_date: string; end_date: string | null; bullets: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // Detect section transitions
    if (expSectionRegex.test(line)) { inExperienceSection = true; continue; }
    if (eduSectionRegex.test(line) || skillSectionRegex.test(line)) {
      if (currentExp) { experience.push(currentExp); currentExp = null; }
      inExperienceSection = false;
      continue;
    }

    // Look for date ranges (strong signal of a job entry)
    const dateMatch = line.match(datePattern) || line.match(yearMonthPattern);

    if (dateMatch) {
      // Save previous entry
      if (currentExp) experience.push(currentExp);

      // Parse dates
      const fullDateMatch = line.match(datePattern);
      let startDate = "";
      let endDate: string | null = null;

      if (fullDateMatch) {
        startDate = normalizeDate(fullDateMatch[1]);
        const endRaw = fullDateMatch[2].toLowerCase();
        endDate = (endRaw === "present" || endRaw === "current" || endRaw === "now") ? null : normalizeDate(fullDateMatch[2]);
      }

      // The title/company is usually on this line or the line before
      let title = "";
      let company = "";

      // Remove the date portion to get role info
      const withoutDate = line.replace(datePattern, "").replace(yearMonthPattern, "").trim();
      const parts = withoutDate.split(/\s*[|–—-]\s*|\s+at\s+|\s*@\s*/i).map((p) => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        title = parts[0];
        company = parts[1];
      } else if (parts.length === 1) {
        title = parts[0];
        // Check previous line for company
        if (i > 0 && !lines[i - 1].match(datePattern)) {
          company = lines[i - 1];
        }
      } else {
        // Date was the whole line — check surrounding lines
        if (i > 0) title = lines[i - 1];
        if (i > 1) company = lines[i - 2];
      }

      // If title looks like a company and vice versa, try to swap
      // Companies often have Inc, Ltd, Corp, etc.
      if (title && /\b(inc|ltd|corp|llc|co\b|company|group)\b/i.test(title) && company) {
        [title, company] = [company, title];
      }

      currentExp = {
        title: title.replace(/[,|]$/, "").trim(),
        company: company.replace(/[,|]$/, "").trim(),
        location: "",
        start_date: startDate,
        end_date: endDate,
        bullets: [],
      };

      inExperienceSection = true;
    } else if (currentExp && inExperienceSection) {
      // Collect bullets: lines that start with •, -, *, or are descriptive sentences
      const trimmed = line.replace(/^[•\-\*▪▸→]\s*/, "").trim();
      if (trimmed.length > 15 && trimmed.length < 500) {
        currentExp.bullets.push(trimmed);
      }
    }
  }

  if (currentExp) experience.push(currentExp);

  // --- Education ---
  // Tight degree regex with closing word boundaries — does NOT match "Manager" or "Marketing".
  // Multi-letter abbreviations require an explicit closing word boundary on the alternation group.
  const degreePattern = /\b(bachelor(?:'s|s)?(?:\s+of\s+\w+)?|master(?:'s|s)?(?:\s+of\s+\w+)?|doctorate|associate(?:'s|s)?|diploma|ph\.?d\.?|m\.?b\.?a\.?|b\.?sc\.?|m\.?sc\.?|b\.?eng\.?|m\.?eng\.?|b\.?a\.?(?=\W|$)|m\.?a\.?(?=\W|$)|b\.?s\.?(?=\W|$)|m\.?s\.?(?=\W|$))\b/i;

  // Reject lines that contain typical job-title noise even if a degree pattern matches by accident
  const jobTitleNoise = /\b(manager|engineer|designer|developer|specialist|analyst|director|consultant|founder|coordinator|architect|administrator|lead|head\s+of)\b/i;

  // Section-based extraction: find the EDUCATION header, then capture lines until
  // the next section header. No greedy "anything with a year is education" behavior.
  const education: { degree: string; school: string; year: string }[] = [];
  const eduStart = lines.findIndex((l) => /^(education|academic|qualifications?)\b/i.test(l.trim()));

  if (eduStart >= 0) {
    // Find where the education section ends — at the next major section header
    let eduEnd = lines.length;
    for (let i = eduStart + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (
        expSectionRegex.test(l) ||
        skillSectionRegex.test(l) ||
        /^(awards?|certifications?|projects?|publications?|interests?|references?|languages?)\b/i.test(l)
      ) {
        eduEnd = i;
        break;
      }
    }

    // Within the education slice, pull lines that look like real education entries
    for (let i = eduStart + 1; i < eduEnd; i++) {
      const line = lines[i];
      // Must contain a degree keyword. Reject if it also looks like a job title.
      if (!degreePattern.test(line) || jobTitleNoise.test(line)) continue;

      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      // Many CVs put "MBA – School (Year)" on one line, OR split degree/school across two lines.
      // Try to parse single-line first (split on common separators).
      let degree = line;
      let school = "";

      const splitMatch = line.split(/\s*[|–—-]\s+|\s+at\s+|\s*,\s+/).filter(Boolean);
      if (splitMatch.length >= 2) {
        degree = splitMatch[0].trim();
        school = splitMatch[1].replace(/\(.*?\)/g, "").trim();
      } else if (i + 1 < eduEnd) {
        const next = lines[i + 1];
        // Only treat next line as school if it doesn't itself look like another degree
        if (!degreePattern.test(next) && next.length < 100 && !jobTitleNoise.test(next)) {
          school = next.replace(/\b(19|20)\d{2}\b/g, "").replace(/\(.*?\)/g, "").trim();
        }
      }

      degree = degree.replace(/\b(19|20)\d{2}\b/g, "").replace(/[(),|]/g, " ").replace(/\s+/g, " ").trim();
      school = school.replace(/[(),|]/g, " ").replace(/\s+/g, " ").trim();

      // Last sanity check — if degree text is implausibly long or short, skip
      if (degree.length < 2 || degree.length > 150) continue;

      education.push({
        degree,
        school,
        year: yearMatch?.[0] || "",
      });
    }
  }

  // --- Summary: generate from headline + skills ---
  let summary = "";
  if (headline) {
    const skillList = foundSkills.slice(0, 5).join(", ");
    summary = `${headline} with expertise in ${skillList || "various domains"}.`;
    if (experience.length > 0) {
      summary += ` ${experience.length} professional role${experience.length > 1 ? "s" : ""} identified.`;
    }
  }

  return {
    name,
    headline,
    location: "",
    summary,
    skills: foundSkills,
    roles,
    experience,
    education,
    certifications: [],
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0]?.trim() || "",
    years_experience: experience.length > 0 ? estimateYears(experience) : 0,
    salary_estimate_min: 0,
    salary_estimate_max: 0,
  };
}

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  // Try YYYY-MM or YYYY format
  if (/^\d{4}[-/]\d{2}$/.test(trimmed)) return trimmed.replace("/", "-");
  // Try "Month YYYY" format
  const monthMatch = trimmed.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.,]*(\d{4})$/i);
  if (monthMatch) {
    const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    return `${monthMatch[2]}-${months[monthMatch[1].toLowerCase().slice(0, 3)]}`;
  }
  // Just a year
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function estimateYears(experience: { start_date: string; end_date: string | null }[]): number {
  let total = 0;
  for (const exp of experience) {
    const start = parseInt(exp.start_date.slice(0, 4));
    const end = exp.end_date ? parseInt(exp.end_date.slice(0, 4)) : new Date().getFullYear();
    if (!isNaN(start) && !isNaN(end)) total += Math.max(end - start, 0);
  }
  return total;
}
