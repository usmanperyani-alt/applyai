// Top-level onboarding layout — intentionally outside (authed) so the sidebar
// shell isn't inherited. proxy.ts gates /onboarding/* to authed users only.
import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
