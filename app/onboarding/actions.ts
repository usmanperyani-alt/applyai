"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  advanceOnboardingStep,
  completeOnboarding,
  pathForStep,
} from "@/lib/onboarding/state";

// Advance to a specific step number, then redirect to the next page.
export async function advanceToStep(step: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await advanceOnboardingStep(user.id, step);
  redirect(pathForStep(step));
}

// Mark onboarding done (used by skip + scan completion).
export async function finishOnboarding(redirectTo: string = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await completeOnboarding(user.id);
  redirect(redirectTo);
}
