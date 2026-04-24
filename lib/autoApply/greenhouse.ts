import { chromium, type Browser, type Page } from "playwright";

interface ApplicantInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  resumePath: string; // path to PDF file
  coverLetter?: string;
}

interface ApplyResult {
  success: boolean;
  message: string;
}

/**
 * Auto-fill and submit a Greenhouse application form.
 * Requires the job application URL and applicant details.
 *
 * IMPORTANT: This should only be called after explicit user confirmation.
 */
export async function applyToGreenhouse(
  applicationUrl: string,
  applicant: ApplicantInfo
): Promise<ApplyResult> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(applicationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for the application form
    await page.waitForSelector("#application_form, form#application", {
      timeout: 10000,
    });

    // Fill basic fields
    await fillField(page, "#first_name", applicant.firstName);
    await fillField(page, "#last_name", applicant.lastName);
    await fillField(page, "#email", applicant.email);
    await fillField(page, "#phone", applicant.phone);

    // LinkedIn URL if field exists
    if (applicant.linkedinUrl) {
      await fillField(
        page,
        'input[name*="linkedin"], input[autocomplete="url"]',
        applicant.linkedinUrl
      ).catch(() => {}); // field may not exist
    }

    // Upload resume
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(applicant.resumePath);
    }

    // Cover letter if field exists and content provided
    if (applicant.coverLetter) {
      await fillField(
        page,
        'textarea[name*="cover_letter"], #cover_letter',
        applicant.coverLetter
      ).catch(() => {});
    }

    // Submit the form
    const submitButton = await page.$(
      'button[type="submit"], input[type="submit"], #submit_app'
    );
    if (!submitButton) {
      return { success: false, message: "Submit button not found" };
    }

    await submitButton.click();

    // Wait for confirmation or error
    await page.waitForTimeout(3000);

    // Check for success indicators
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
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Auto-apply failed: ${message}` };
  } finally {
    await browser?.close();
  }
}

async function fillField(
  page: Page,
  selector: string,
  value: string
) {
  const el = await page.$(selector);
  if (el) {
    await el.click();
    await el.fill(value);
  }
}
