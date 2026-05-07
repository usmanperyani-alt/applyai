import puppeteer from "puppeteer";
import type { CVContent } from "@/types";

export interface CVHeader {
  name?: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
}

/**
 * Generate a PDF from structured CV content using Puppeteer.
 * Renders an HTML template in a headless browser and exports to PDF.
 */
export async function generatePDF(content: CVContent, header: CVHeader = {}): Promise<Buffer> {
  const html = renderCVToHTML(content, header);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    margin: { top: "48px", right: "48px", bottom: "48px", left: "48px" },
    printBackground: true,
  });

  await browser.close();

  return Buffer.from(pdf);
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCVToHTML(cv: CVContent, header: CVHeader): string {
  const experienceHTML = cv.experience
    .map(
      (exp) => `
      <div class="experience">
        <div class="exp-header">
          <div>
            <strong>${escapeHTML(exp.title || "")}</strong>
            <span class="company">${escapeHTML(exp.company || "")}${exp.location ? " · " + escapeHTML(exp.location) : ""}</span>
          </div>
          <span class="dates">${escapeHTML(exp.start_date || "")} – ${escapeHTML(exp.end_date || "Present")}</span>
        </div>
        <ul>
          ${(exp.bullets || []).filter(Boolean).map((b) => `<li>${escapeHTML(b)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const educationHTML = cv.education
    .map(
      (edu) => `
      <div class="education">
        <strong>${escapeHTML(edu.degree || "")}</strong>
        <span class="school">${escapeHTML(edu.school || "")}${edu.year ? " · " + escapeHTML(edu.year) : ""}</span>
      </div>`
    )
    .join("");

  const skillsHTML = cv.skills
    .map((s) => `<span class="skill">${escapeHTML(s)}</span>`)
    .join("");

  const contactPieces = [header.email, header.phone, header.location, header.linkedin_url]
    .filter(Boolean)
    .map((s) => escapeHTML(String(s)));

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 2px; }
  .headline { font-size: 12px; color: #444; margin-bottom: 6px; }
  .contact { font-size: 10px; color: #666; margin-bottom: 12px; }
  .contact span + span::before { content: " · "; color: #ccc; }
  h2 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #0F6E56; border-bottom: 1px solid #e0e0d8; padding-bottom: 4px; margin: 16px 0 8px; }
  .summary { color: #444; margin-bottom: 4px; }
  .experience { margin-bottom: 12px; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .company { color: #666; margin-left: 4px; }
  .dates { color: #888; font-size: 10px; white-space: nowrap; }
  ul { padding-left: 16px; }
  li { margin-bottom: 2px; color: #333; }
  .education { margin-bottom: 6px; }
  .school { color: #666; margin-left: 4px; }
  .skills-row { display: flex; flex-wrap: wrap; gap: 4px; }
  .skill { padding: 2px 8px; border-radius: 12px; background: #E1F5EE; color: #0F6E56; font-size: 10px; }
</style>
</head>
<body>
  <h1>${escapeHTML(header.name || "Candidate CV")}</h1>
  ${header.headline ? `<div class="headline">${escapeHTML(header.headline)}</div>` : ""}
  ${contactPieces.length ? `<div class="contact">${contactPieces.map((c) => `<span>${c}</span>`).join("")}</div>` : ""}

  ${cv.summary ? `<h2>Summary</h2><p class="summary">${escapeHTML(cv.summary)}</p>` : ""}

  ${cv.experience.length > 0 ? `<h2>Experience</h2>${experienceHTML}` : ""}

  ${cv.education.length > 0 ? `<h2>Education</h2>${educationHTML}` : ""}

  ${cv.skills.length > 0 ? `<h2>Skills</h2><div class="skills-row">${skillsHTML}</div>` : ""}

  ${cv.certifications.length > 0 ? `
  <h2>Certifications</h2>
  <ul>${cv.certifications.map((c) => `<li>${escapeHTML(c)}</li>`).join("")}</ul>
  ` : ""}
</body>
</html>`;
}
