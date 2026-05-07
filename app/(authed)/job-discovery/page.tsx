import { redirect } from "next/navigation";

// Phase D: Job Discovery folded into Jobs as a tab. This route stays as a
// redirect for any old bookmarks. Delete the entire folder when comfortable.
export default function JobDiscoveryRedirect() {
  redirect("/jobs?tab=sources");
}
