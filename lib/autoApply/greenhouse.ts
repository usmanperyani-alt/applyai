import { chromium, type Browser, type Page } from "playwright";

export interface ApplicantInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  resumePath: string; // path to PDF file on local filesystem
  coverLetter?: string;
}

export interface ApplyResult {
  success: boolean;
  message: string;
  /** Base64 PNG screenshot of the filled form (always set for dry-run) */
  screenshot?: string;
  /** Map of form field selector → filled value */
  filledFields?: Record<string, string>;
  /** Set of form field labels that were detected but not filled (custom questions, EEO, etc.) */
  unfilledRequiredFields?: string[];
}

export interface ApplyOptions {
  /**
   * When true, fills the form and takes a screenshot but does NOT click submit.
   * Always use dryRun=true for the prepare endpoint; only set false on the
   * confirmed submit endpoint.
   */
  dryRun?: boolean;
}

/**
 * Auto-fill a Greenhouse application form. With dryRun=true (default for safety),
 * fills everything and returns a screenshot — does NOT submit.
 *
 * IMPORTANT: This must only be called with dryRun=false after explicit user confirmation.
 */
export async function applyToGreenhouse(
  applicationUrl: string,
  applicant: ApplicantInfo,
  options: ApplyOptions = {}
): Promise<ApplyResult> {
  const dryRun = options.dryRun !== false; // default to safe
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filledFields: Record<string, string> = {};

    await page.goto(applicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for the application form
    await page.waitForSelector("#application_form, form#application", {
      timeout: 10000,
    });

    // Fill standard fields
    if (await fillField(page, "#first_name", applicant.firstName)) {
      filledFields["first_name"] = applicant.firstName;
    }
    if (await fillField(page, "#last_name", applicant.lastName)) {
      filledFields["last_name"] = applicant.lastName;
    }
    if (await fillField(page, "#email", applicant.email)) {
      filledFields["email"] = applicant.email;
    }
    if (await fillField(page, "#phone", applicant.phone)) {
      filledFields["phone"] = applicant.phone;
    }

    if (applicant.linkedinUrl) {
      const linkedinFilled = await fillField(
        page,
        'input[name*="linkedin"], input[autocomplete="url"]',
        applicant.linkedinUrl
      );
      if (linkedinFilled) filledFields["linkedin"] = applicant.linkedinUrl;
    }

    // Upload resume
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      try {
        await fileInput.setInputFiles(applicant.resumePath);
        filledFields["resume"] = applicant.resumePath.split("/").pop() || applicant.resumePath;
      } catch (err) {
        console.error("Resume upload failed:", err);
      }
    }

    if (applicant.coverLetter) {
      const coverFilled = await fillField(
        page,
        'textarea[name*="cover_letter"], #cover_letter',
        applicant.coverLetter
      );
      if (coverFilled) filledFields["cover_letter"] = `${applicant.coverLetter.slice(0, 80)}...`;
    }

    // Detect unfilled required fields (custom questions, EEO, etc.)
    const unfilledRequiredFields = await page.$$eval(
      'label:has-text("*"), label.required, [aria-required="true"]',
      (els) =>
        els
          .map((el) => el.textContent?.trim() || "")
          .filter((label) => label && label.length < 200)
          .slice(0, 20)
    ).catch(() => [] as string[]);

    // Take screenshot of filled form
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshot = `data:image/png;base64,${Buffer.from(screenshotBuffer).toString("base64")}`;

    // Stop here for dry run — never click submit
    if (dryRun) {
      return {
        success: true,
        message: "Form prepared. Review the screenshot before submitting.",
        screenshot,
        filledFields,
        unfilledRequiredFields,
      };
    }

    // Real submission
    const submitButton = await page.$(
      'button[type="submit"], input[type="submit"], #submit_app'
    );
    if (!submitButton) {
      return { success: false, message: "Submit button not found", screenshot, filledFields };
    }

    await submitButton.click();
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent("body");
    const isSuccess =
      pageContent?.toLowerCase().includes("thank you") ||
      pageContent?.toLowerCase().includes("application submitted") ||
      pageContent?.toLowerCase().includes("successfully");

    return {
      success: isSuccess || false,
      message: isSuccess
        ? "Application submitted successfully"
        : "Form submitted but confirmation unclear",
      screenshot,
      filledFields,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Auto-apply failed: ${message}` };
  } finally {
    await browser?.close();
  }
}

async function fillField(page: Page, selector: string, value: string): Promise<boolean> {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.click();
      await el.fill(value);
      return true;
    }
  } catch {
    // selector miss
  }
  return false;
}

/** Detect ATS type from a job application URL. */
export function detectATS(url: string): "greenhouse" | "lever" | "ashby" | "unknown" {
  if (url.includes("greenhouse.io") || url.includes("job-boards.greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("ashbyhq.com")) return "ashby";
  return "unknown";
}
