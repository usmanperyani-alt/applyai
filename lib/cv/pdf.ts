import puppeteer from "puppeteer";
import type { CVContent } from "@/types";

/**
 * Generate a PDF from structured CV content using Puppeteer.
 * Renders an HTML template in a headless browser and exports to PDF.
 */
export async function generatePDF(content: CVContent): Promise<Buffer> {
  const html = renderCVToHTML(content);

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

function renderCVToHTML(cv: CVContent): string {
  const experienceHTML = cv.experience
    .map(
      (exp) => `
      <div class="experience">
        <div class="exp-header">
          <div>
            <strong>${exp.title}</strong>
            <span class="company">${exp.company} · ${exp.location}</span>
          </div>
          <span class="dates">${exp.start_date} – ${exp.end_date || "Present"}</span>
        </div>
        <ul>
          ${exp.bullets.map((b) => `<li>${b}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const educationHTML = cv.education
    .map(
      (edu) => `
      <div class="education">
        <strong>${edu.degree}</strong>
        <span class="school">${edu.school} · ${edu.year}</span>
      </div>`
    )
    .join("");

  const skillsHTML = cv.skills
    .map((s) => `<span class="skill">${s}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
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
  <h1>Candidate CV</h1>

  <h2>Summary</h2>
  <p class="summary">${cv.summary}</p>

  <h2>Experience</h2>
  ${experienceHTML}

  <h2>Education</h2>
  ${educationHTML}

  <h2>Skills</h2>
  <div class="skills-row">${skillsHTML}</div>

  ${cv.certifications.length > 0 ? `
  <h2>Certifications</h2>
  <ul>${cv.certifications.map((c) => `<li>${c}</li>`).join("")}</ul>
  ` : ""}
</body>
</html>`;
}
