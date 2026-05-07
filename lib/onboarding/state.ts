import "server-only";
import { getServerClient } from "@/lib/supabase/server";

export const ONBOARDING_STEPS = ["welcome", "cv", "preferences", "scan"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Step ordering: 0 = not started, 1 = welcome done, 2 = cv done, 3 = prefs done, 4 = scan done
export function pathForStep(step: number): string {
  if (step <= 0) return "/onboarding/welcome";
  if (step >= ONBOARDING_STEPS.length) return "/dashboard";
  return `/onboarding/${ONBOARDING_STEPS[step]}`;
}

type OnboardingState = {
  step: number;
  completedAt: string | null;
};

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  return {
    step: data?.onboarding_step ?? 0,
    completedAt: data?.onboarding_completed_at ?? null,
  };
}

export async function advanceOnboardingStep(userId: string, step: number) {
  const supabase = await getServerClient();
  await supabase
    .from("profiles")
    .update({ onboarding_step: step, updated_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function completeOnboarding(userId: string) {
  const supabase = await getServerClient();
  await supabase
    .from("profiles")
    .update({
      onboarding_step: ONBOARDING_STEPS.length,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
