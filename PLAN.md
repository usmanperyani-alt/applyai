# ApplyAI — Implementation Plan (post design IA cleanup)

**Date:** 2026-04-28
**Branch:** main
**Repo:** /Users/usman/claude_agent_teams/Job_agent/applai
**Author:** usman (with Claude)

## Context

ApplyAI is an AI-powered job hunting web app. Current state of the codebase:

- **What works:** Supabase auth (email), proxy.ts session refresh, Greenhouse scraper, CV upload + parse + tailor + PDF, applications tracker, dashboard. Dual-mode persistence (Supabase when authed, localStorage otherwise). z.ai (GLM-4.6) for tailoring with Anthropic fallback. Login screen implemented with new editorial design.
- **What's designed but not built:** 30 desktop screens in `Designs/pencil-new.pen`, organized in user-journey grid after the recent IA cleanup (steps 1-3).
- **Open code issues:** Login overlap (floating CV mock), OAuth buttons are placeholders, no Forgot password flow.

The design system is now in `Designs/pencil-new.pen` with these journey rows:
1. Auth · Onboarding (Login → Forgot → Check email → Reset → Onb1 → Onb2)
2. Onboarding · First arrival · Browse (Onb3 → Onb4 → Empty Dashboard → Dashboard → Empty Jobs cold-start → Jobs → Empty Jobs filter)
3. Job detail · Tailor · Auto-apply Review (Job detail → S1 → S2 → S3 → S4 → Auto-apply Review)
4. Apply · Track · CV · Preferences (Auto-apply Submitting → Applications → Empty Applications → Application Detail → CV Editor → Preferences)
5. Power user · Admin (Activity → Settings → Analytics → Interview prep → Command palette)

## Goals

1. Ship the new editorial design end-to-end so the app feels intentional, not generated.
2. Reduce sidebar from 8 nav items to 5 (kill Job Discovery, Compare, Billing as top-level pages — fold into Jobs and Settings).
3. Wire OAuth so users don't have to type passwords.
4. Move tailor flow inside `(authed)` shell so it doesn't feel like a separate app.
5. Ship Activity (merged Notifications + Agent Activity), Application Detail, Command palette as first-class pages.

## Out of scope

- Mobile screens (designed but holding off — desktop-first this round).
- Voyage AI embeddings (column exists, never populated).
- BullMQ worker runtime (scaffold exists, not running).
- Lever / Ashby auto-apply (only Greenhouse wired).
- Gmail status parsing.
- Interview prep auto-creation when application moves to Interview status.

## Implementation phases — in user-encounter order

### Phase A · Login + Auth recovery — ✅ SHIPPED 2026-04-28

**Files touched:**
- `app/login/page.tsx` — overlap fix + OAuth wiring + Forgot link routes to `/auth/forgot`
- `components/auth/AuthShell.tsx` — NEW shared 2-col editorial layout for the 3 forgot/reset pages
- `app/auth/forgot/page.tsx` — NEW
- `app/auth/check-email/page.tsx` — NEW (resend countdown 45s)
- `app/auth/reset/page.tsx` — NEW (4-segment password strength meter)
- `proxy.ts` — unchanged (`PUBLIC_PATHS` already prefix-matched `/auth`)

**What shipped:**
1. ✅ Login overlap — floating CV mock now `hidden xl:block`. On `lg` (1024-1279px) the mock disappears so hero copy has the column to itself; on `xl+` it shows at `right-10 bottom-16 w-[280px] h-[360px]`.
2. ✅ OAuth wired via `supabase.auth.signInWithOAuth({provider, options: { redirectTo: /auth/callback?next=… }})`. Buttons call with `"google"` and `"linkedin_oidc"`.
3. ✅ `/auth/forgot` → `resetPasswordForEmail` → routes to `/auth/check-email?email=…`.
4. ✅ `/auth/check-email` — Mail icon hero, "Open Gmail" CTA (target=_blank), 0:45 resend countdown.
5. ✅ `/auth/reset` — new+confirm password fields, show/hide toggle, 4-segment strength meter, `updateUser({password})`, redirect to `/dashboard`.

**Verified:**
- `npm run build` clean
- `curl` returns 200 on all 3 new routes + `/login`
- Visual diff against `Designs/pencil-new.pen` (FRvX8 / 1KXOV / rdJnE) — matches editorial pattern

**Open items deferred to user:**
- ⚠️ Google + LinkedIn OAuth provider config in Supabase dashboard NOT done. OAuth buttons will fail until configured. See [CLAUDE.md](CLAUDE.md) for setup steps.
- ⚠️ Supabase password-reset email template still default — match to brand later.
- ⚠️ LinkedIn OIDC scope needs app review on LinkedIn Developer console.

**Risks discovered (none blocking):** No proxy redirect loops because `/auth` was already public. No storage upload limits encountered (no CV uploads in this phase).

### Phase B · Onboarding + initial arrival — ✅ SHIPPED 2026-04-28

**Deviation from plan:** Onboarding lives at `app/onboarding/` (top-level), NOT inside `(authed)/`. Reason: nested layouts in Next.js 16 compound rather than override, so the (authed) sidebar would have wrapped onboarding too. Top-level placement gets a clean no-sidebar layout. proxy.ts still gates `/onboarding/*` to authed users.

**Files touched:**
- `supabase/schema.sql` — added `onboarding_step` (int, default 0) and `onboarding_completed_at` (timestamptz) to `profiles`. Idempotent migration block included.
- `lib/onboarding/state.ts` — NEW server helpers: `getOnboardingState`, `advanceOnboardingStep`, `completeOnboarding`, `pathForStep`.
- `proxy.ts` — added redirect logic: signed-in users with `onboarding_completed_at IS NULL` get pushed to `/onboarding/<step>`. Skips `/onboarding/*`, `/auth/*`, `/api/*` to avoid loops.
- `app/onboarding/layout.tsx` — pass-through layout (intentionally outside (authed)).
- `app/onboarding/actions.ts` — server actions `advanceToStep(n)` and `finishOnboarding(redirectTo)`.
- `app/onboarding/welcome/page.tsx` — server component, dark forest hero, "Welcome, {firstName}", 3-step preview on right.
- `app/onboarding/cv/page.tsx` — client, drop-zone or file-picker → POSTs `/api/cv/upload` → `saveMasterCV` → `advanceToStep(2)`. Skip link → `finishOnboarding("/dashboard")`.
- `app/onboarding/preferences/page.tsx` — client, target roles (chip input + suggestions), location, salary min/max sliders, remote toggle, right-side preview pane with estimated job count. Saves via `saveProfile` → `advanceToStep(3)`.
- `app/onboarding/scan/page.tsx` — client, fires `/api/jobs/discover` (Greenhouse) in background, animates a counter ring 0→723 over ~3.5s with cycling source pills, then `finishOnboarding("/dashboard")`. Background scan keeps running after redirect.
- `components/dashboard/EmptyDashboard.tsx` — NEW (file icon + "Your dashboard is waiting" + Upload CTA). Shown by dashboard when `cvLoaded && !masterCV`.
- `app/(authed)/dashboard/page.tsx` — added `cvLoaded` state, early-returns `<EmptyDashboard />` when no master CV (covers the skip-onboarding path).

**Verified:**
- `npm run build` clean — 4 onboarding routes show in output (welcome dynamic, others static).
- `curl -L` returns 200 on all 4 routes.

**⚠️ Action required by user:**
- Re-run `supabase/schema.sql` in the Supabase SQL Editor so the 2 new columns exist on `profiles`. Idempotent — safe to re-run.

**Open items deferred to user:**
- Estimated job count on Preferences screen is a heuristic (`320 + roles*240 + remote?220:0`). Replace with a real count query once embeddings or a job-count endpoint exists.
- Onboarding 4 returns 0 jobs case — currently still redirects to dashboard which shows Empty Jobs. Could surface a "0 results, broaden your filters?" message before redirect. Deferred.
- LinkedIn URL paste on Onboarding 2 is shown disabled (per design intent). Wire later when LinkedIn integration ships.

**Risks discovered:**
- Server-action `redirect()` from a client component throws `NEXT_REDIRECT` which Next handles transparently, but defensive `try/catch` blocks need to ignore that error string. All 3 client pages do this.
- Confirmed no proxy redirect loops because `/onboarding/*` and `/api/*` are exempted from the gate.

### Phase C · Sidebar + nav restructure — ✅ SHIPPED 2026-04-29

**Files touched:**
- `components/layout/Sidebar.tsx` — nav reduced from 6 → 5 items. "Job Discovery" (which incorrectly routed to /jobs) renamed to "Jobs". Analytics removed from main nav (moved into UserMenu). Inline Sign out button replaced with the new UserMenu component.
- `components/layout/UserMenu.tsx` — NEW. Click the user pill → popover (opens upward) with Settings (disabled, "Soon"), Activity (disabled, "Soon"), Analytics (live, links to /analytics), Sign out. Click-outside + Escape close. Unread dot on the pill avatar wired via `hasUnread` prop (always false until Phase G ships).

**What shipped:**
1. ✅ Sidebar = 5 items: Dashboard, Jobs, Applications, CV Editor, Preferences.
2. ✅ Settings + Activity render in UserMenu but disabled with "Soon" badge — they get wired in Phases I and G respectively.
3. ✅ Analytics moved to UserMenu (route still works at /analytics, just relocated in the IA).
4. ✅ Sign out works via the existing `supabase.auth.signOut()` flow.
5. ✅ Unread badge UI in place, prop-driven, currently false.

**Verified:**
- `npm run build` clean — no new pages, only component edits.
- Route table unchanged (no routes added/removed).

**Open items / deferred:**
- "Agent active" status card at the bottom of the sidebar (visible in design `MeKNp`) is not yet implemented. It's a polish item, not part of this phase's scope.
- `/job-discovery` route still exists in the codebase. It's no longer linked from the sidebar but the file at `app/(authed)/job-discovery/page.tsx` is still served. It gets fully removed (folded into Jobs as a Sources tab) in Phase D.

### Phase D · Jobs page absorption — ✅ SHIPPED 2026-04-29

**Files touched:**
- `app/(authed)/jobs/page.tsx` — full rewrite. Tabbed layout (Browse / Sources), Compare mode (checkboxes + sticky action bar + modal), cold-start empty state, sort dropdown (best / newest / salary), Suspense wrapper for `useSearchParams`.
- `app/(authed)/jobs/SourcesTab.tsx` — NEW. Agent control center: dark forest hero with current job count + "Run sweep now" CTA, 4 source cards (Greenhouse active with live count, others "Coming soon"), recent-sweeps placeholder.
- `app/(authed)/jobs/CompareModal.tsx` — NEW. 2-3 jobs side-by-side with match %, salary, location, source, what-they-want chips, gaps, and per-card "Tailor + apply" CTAs. Click backdrop or close icon to dismiss.
- `app/(authed)/jobs/ColdStartEmpty.tsx` — NEW. Radar icon + "No jobs scraped yet" + "Run first sweep" CTA. Shown when DB has zero jobs AND user has a CV.
- `app/(authed)/jobs/[id]/page.tsx` — NEW. Server component, fetches job by id from Supabase, renders hero + sanitized HTML description + match-analysis right rail.
- `app/(authed)/jobs/[id]/JobActions.tsx` — NEW client island. Sticky bottom bar with Tailor + Apply buttons that reuse the dashboard's TailorModal and ApplyConfirmModal.
- `app/(authed)/job-discovery/page.tsx` — redirect target updated from `/jobs` to `/jobs?tab=sources`.

**What shipped:**
1. ✅ Tabs `?tab=browse` (default) and `?tab=sources`. URL-driven via `router.replace`.
2. ✅ Compare mode toggle in the topbar. Up to 3 jobs selected. Sticky action bar at bottom. Modal renders side-by-side cards.
3. ✅ Cold-start empty state with "Run first sweep" CTA that calls `/api/jobs/discover`.
4. ✅ Filter-empty state preserved ("No jobs match your filters · Try removing constraints").
5. ✅ Job detail page at `/jobs/[id]`. Server-rendered with the editorial design (hero + JD + right-rail match analysis). Sticky footer for Tailor + Apply.
6. ✅ `/job-discovery` redirects to `/jobs?tab=sources`. Old bookmarks land in the right place.
7. ✅ Sort control added (best match / newest / salary high-to-low).

**Verified:** `npm run build` clean. Route table shows `/jobs/[id]` as dynamic and `/jobs` as static.

**Open items / deferred:**
- `/job-discovery` folder still exists as a redirect for back-compat. Safe to delete entirely once no one has the bookmark.
- "Recent sweeps" history table in Sources tab is a placeholder. Real history requires a `sweep_log` table — out of scope for this round.
- Compare modal's per-card "Tailor + apply" button is a stub (`onTailor` not wired since we'd need to pop a TailorModal from the modal context). Users can close compare and tailor from the job detail / jobs list instead.
- Job count in Sources tab pulls from `/api/jobs` rather than a per-source DB query. Fine for current scale; revisit when we have multiple active sources.

### Phase E · Tailor flow restructure — ✅ SHIPPED 2026-04-29

**Files touched:**
- `app/(authed)/jobs/[id]/tailor/page.tsx` — NEW. Server component, fetches job, renders breadcrumb header, hands off to client orchestrator.
- `app/(authed)/jobs/[id]/tailor/TailorOrchestrator.tsx` — NEW. State machine driving Setup → Generating → Review → Saved.
- `components/tailor/TailorSetup.tsx` — NEW (S1). Hero + master-CV card + dark role-brief card with inline strong/partial/gap chips. Sticky footer with "Skip · apply with master CV" + "Generate tailored version".
- `components/tailor/TailorGenerating.tsx` — NEW (S2). Wraps `<ProgressTakeover>` with the 5 tailoring steps.
- `components/tailor/TailorReview.tsx` — NEW (S3). Sectioned tabs (Summary / Experience / Skills), per-section diff cards (before strikethrough + after highlight), right rail with 94% confidence callout + change list, sticky footer with Discard / Save / Save-and-apply.
- `components/tailor/TailorSaved.tsx` — NEW (S4). Success treatment with Apply primary + Download ghost (per CTA-hierarchy fix), PDF preview card on right.
- `components/shared/ProgressTakeover.tsx` — NEW. Reusable dark-card-with-ring + step checklist + cancel button. Used by S2, will be reused by Auto-apply Submitting in Phase F.
- `app/(authed)/jobs/[id]/JobActions.tsx` — Tailor button now navigates to `/jobs/[id]/tailor` instead of opening TailorModal. Apply button still uses ApplyConfirmModal.

**What shipped:**
1. ✅ Tailor route lives at `/jobs/[id]/tailor` inside `(authed)` shell — sidebar visible throughout.
2. ✅ 4 step components, state machine in TailorOrchestrator. Steps: setup → generating → review → saved.
3. ✅ S1 density-fixed: no separate match analysis row, strong/partial/gap counts inline in the dark role-brief card.
4. ✅ S3 diff view preserved + extended (3 section tabs, before/after diff cards, change list). 94% confidence callout in right rail.
5. ✅ S4 Saved with Apply primary, Download as ghost link. "Save and apply now" auto-redirects to `/jobs/[id]/auto-apply` 1.5s after landing.
6. ✅ `<ProgressTakeover>` extracted in `components/shared/` for reuse.
7. Sidebar active state: still highlights Dashboard during tailor flow. Improvement deferred (would need a path-aware override in Sidebar component).

**Verified:** `npm run build` clean. `/jobs/[id]/tailor` shows as dynamic route.

**Open items / deferred:**
- Sidebar doesn't highlight Jobs while inside `/jobs/[id]/tailor`. Cosmetic — fix when we touch Sidebar next.
- TailorReview's per-section "Edit / Revert" buttons from the design are not yet wired (changes shown read-only). Inline editing was a stretch goal; current flow is approve-or-discard.
- Old `TailorModal` in `components/dashboard/` is still used by the Dashboard page. Not deleted — dashboard's quick-tailor flow stays as a faster modal path. The new full-page route is canonical for /jobs/[id].
- `/jobs/[id]/auto-apply` route doesn't exist yet (Phase F). Apply CTA navigates to it; will 404 until F ships.

### Phase F · Auto-apply review surface — ✅ SHIPPED 2026-04-29

**Files touched:**
- `app/(authed)/jobs/[id]/auto-apply/page.tsx` — NEW. Server component fetches job, renders breadcrumb + ⚠ banner, hands off to client orchestrator.
- `app/(authed)/jobs/[id]/auto-apply/AutoApplyOrchestrator.tsx` — NEW. State machine: loading → review (prep ok) | manual (prep failed) → submitting → success/error.
- `components/autoApply/FormSnapshot.tsx` — NEW. Screenshot card with metadata strip + ATS link. Falls back to "no screenshot" placeholder when prep can't render.
- `components/autoApply/FillChecklist.tsx` — NEW. Right-rail summary (filled / needs input / CV attached) plus a "Why this role?" textarea that becomes the cover letter on submit.
- `components/autoApply/SubmittingTakeover.tsx` — NEW. Wraps `<ProgressTakeover>` with submit-specific steps. No cancel button (once submit fires, we let it finish).

**What shipped:**
1. ✅ Prep call hits `/api/auto-apply/prepare` on mount with profile-derived applicant. Renders screenshot + filledFields + unfilledRequiredFields.
2. ✅ Big amber "⚠ Before you submit" callout when `unfilledRequiredFields.length > 0`. Submit button stays disabled until the user types in "Why this role?" (becomes the cover letter).
3. ✅ Submit hits `/api/auto-apply/submit` with `confirmed: true`, jobId, and any cover letter. Records the application locally on success and routes to `/applications`.
4. ✅ Submitting takeover reuses `<ProgressTakeover>` from Phase E.
5. ✅ Manual-fallback mode: if prepare errors (non-Greenhouse ATS, no resume materialized, missing profile), shows "Open original posting" + "Mark as applied" CTAs so the user is never stuck.

**Verified:** `npm run build` clean. `/jobs/[id]/auto-apply` is in the route table as dynamic.

**Open items / deferred:**
- **Resume materialization:** auto-apply API requires `resumePath` to be a local FS path. We currently pass a placeholder. Real implementation needs to download the tailored CV's PDF from the `cv-pdfs` Storage bucket to a temp file before calling prepare/submit. Without it, prepare will reject and the page falls through to manual mode. This is the main thing blocking real end-to-end auto-apply in dev/local — but the UX surface is correct.
- **Routing on success:** currently routes to `/applications` (list view). Once Phase G adds Application Detail at `/applications/[id]`, route there instead with the new application id.
- **Cover-letter field merging:** the API takes a top-level `coverLetter` on `applicant`. We pass it through. Greenhouse's actual form may or may not have a cover-letter field — Playwright fills if present, ignores otherwise.
- **Multi-field unfilled handling:** currently one big "Why this role?" textarea regardless of how many fields are unfilled. Future improvement: per-field inputs that map back to specific selectors.

### Phase F.5 · Dashboard editorial redesign — ✅ SHIPPED 2026-04-29

**Files touched:**
- `components/dashboard/AgentStatusCard.tsx` — NEW. Small dark forest pill in sidebar bottom: status dot + "AGENT ACTIVE / SCANNING NOW / AGENT PAUSED" + last sweep relative time. Reads pause state via `agentPausedChange` event.
- `components/dashboard/AgentLog.tsx` — NEW. Right-rail ticker. Renders log entries with kind-colored glyphs (scrape, tailor, submit, interview, match). Greys out when paused. Empty state message when no entries.
- `components/dashboard/CVHealthCard.tsx` — NEW. Replaces CVPanel for dashboard. Score ring on left, 3 sub-rows (skills coverage / story clarity / metrics density) on right. Color tone bands (strong / solid / needs work) based on score.
- `components/dashboard/MetricCard.tsx` — UPDATED. Added `dark` variant prop for the anchor stat (forest-900 bg + brand-500 label). Editorial style applied to default variant too (bigger value, uppercase tracked label).
- `components/layout/TopBar.tsx` — UPDATED. Optional `greeting` prop renders an editorial greeting line above the title. Backward-compatible: existing callers (Jobs, Applications, etc.) keep their compact title style.
- `components/layout/Sidebar.tsx` — UPDATED. AgentStatusCard slotted above the UserMenu, hydrates pause state from localStorage and listens for `agentPausedChange`/`storage` events.
- `app/(authed)/dashboard/page.tsx` — UPDATED. New greeting "Good {morning/afternoon/evening}, {firstName}". Pause persists to localStorage + dispatches event. New 4 metrics (Jobs discovered, Top matches, **Applied — dark anchor**, Response rate). Right rail rebuilt: PipelinePanel + CVHealthCard + AgentLog. Log entries synthesized from current job/applied/tailored data.

**What shipped:**
1. ✅ Greeting topbar with time-of-day computed in client. "Refine preferences" link + "Pause/Resume agent" toggle on the right.
2. ✅ 4 stat cards in editorial style. Applied is the dark forest anchor.
3. ✅ Pipeline panel kept (already editorial-ish). CV Health card replaces CVPanel. Agent log feed added below.
4. ✅ Agent log entries reconstruct what happened from current data: scrape count, top match count, applied count, tailored count.
5. ✅ AgentStatusCard at sidebar bottom — visible on every (authed) page.
6. ✅ Pause persists to localStorage. When paused, sidebar card and agent log both reflect it. Dashboard's auto-fetch is also gated by paused (existing logic preserved).

**Verified:** `npm run build` clean. Dashboard route static-rendered.

**Open items / deferred:**
- **Last sweep time on AgentStatusCard** — currently passes `lastSweepAt` undefined ("No sweeps yet" string). Would need either Sidebar to fetch, or dashboard to push via context. Deferred to keep Sidebar lean.
- **Search input in TopBar** — design shows a search input but ⌘K (Phase J) will replace this anyway. Skipped.
- **CVHealthCard scores** are heuristic (skills count, presence of summary, experience count). Real scoring algorithm could land later.
- **Agent log persistence** — entries are synthesized per-render. Real `agent_log` table can replace this; the AgentLog component takes a generic `entries` prop so the swap is clean.
- **`/preferences` link in topbar** — users can pause their agent + tweak filters. Future: an inline "Refine" sheet that doesn't require a full page navigation.

### Phase F.6 · Dashboard fidelity pass — ✅ SHIPPED 2026-04-29

Tightens the dashboard against `Designs/pencil-new.pen` `MeKNp`. Triggered by a UI bug where match scores rendered as bare "% match" with no number when the user's profile had no extracted skills.

**Files touched:**
- `components/dashboard/JobRow.tsx` — REWRITE. 42×42 letter avatar (dark anchor for the top row), big right-aligned match-score number with "% MATCH" caption, single "Tailor" pill replacing the old Skipped/Auto-apply/arrow row. Hides the score block entirely when `match_score` is missing instead of rendering "% match" with no number. Adds `onTailor` and `emphasized` props.
- `components/dashboard/MetricCard.tsx` — Adds optional `icon` slot rendered top-right of the header (matches stat1H–stat4H in the design). Padding bumped to 5 to match the design's 20×22.
- `app/(authed)/dashboard/page.tsx` — (a) Always calls `/api/jobs/match-profile` whenever a profile is loaded, even if `skills` is empty (the API gracefully degrades to baseline scoring). (b) Fallback hash-derived score for any job that still arrives unscored — never renders a null score. (c) Replaces the source-toggle pills (Greenhouse/LinkedIn/Indeed/Lever) with the design's All/Remote/≥90%/New filter pills; source switching has moved entirely to `/jobs?tab=sources`. (d) New `Top matches` header copy ("Hand-picked from today's sweep · sorted by fit"). (e) Wires `onTailor` through to the existing `TailorModal`. (f) New "View N more matches →" footer styling. (g) Lucide-style inline SVG icons piped to the four MetricCards.

**Why match_score was null:** Supabase upsert path leaves `match_score` as the column default (NULL) because the discover route doesn't populate it. The dashboard previously skipped the match-profile call when `profile.skills.length === 0`, so jobs surfaced unscored and the "{score}% match" string rendered as "% match". Both legs are now fixed: match-profile is always called, and any job that still slips through gets a deterministic baseline.

**Verified:** `tsc --noEmit -p tsconfig.json` clean. Auth-gated route, so visual verification deferred to next signed-in session.

### Phase G · Applications + Application Detail + Activity (~1.5 days)

**Files:**
- `app/(authed)/applications/page.tsx` (UPDATE — add Pipeline indicator from Dashboard)
- `app/(authed)/applications/[id]/page.tsx` (already exists, needs redesign to match S5 Recall layout)
- `app/(authed)/activity/page.tsx` (NEW — merged Notifications + Agent Activity)
- `lib/store/activity.ts` (NEW — unified activity stream)

**Tasks:**
1. Add Pipeline indicator (Discovered → Reviewed → Tailored → Applied → Interview funnel) to Applications page top.
2. Redesign Application Detail to match the S5 Recall design (job context + CV that was sent + status timeline at bottom).
3. Build Activity page combining notifications and agent activity in one feed. Filter chips: All / Unread / Agent / Notifications.
4. Wire unread state on Activity items.

**Verification:** Apply to a job, check it appears on Applications page, click into it, verify CV-that-was-sent renders, check Activity has the new application listed.

### Phase H · CV Editor + Preferences (mostly polish) (~0.5 day)

**Tasks:**
1. CV Editor already two-column edit/preview. Update to match design system tokens (forest, cream).
2. Preferences already has the auto-apply card with threshold slider — just verify visual matches design.
3. Both pages add the agent-voiced subtitle to the page header.

### Phase I · Settings + Billing + Analytics + Interview prep (~1.5 days)

**Files:**
- `app/(authed)/settings/page.tsx` (NEW — tabbed: Account / Connected / Billing / Privacy)
- `app/(authed)/settings/AccountTab.tsx`
- `app/(authed)/settings/ConnectedTab.tsx` (Gmail, LinkedIn connections)
- `app/(authed)/settings/BillingTab.tsx` (3-tier pricing)
- `app/(authed)/settings/PrivacyTab.tsx` (data export, delete account)
- `app/(authed)/analytics/page.tsx` (UPDATE — match design)
- `app/(authed)/interview-prep/page.tsx` (NEW — auto-created when application → Interview status, but route is always navigable)

**Tasks:**
1. Build Settings as a tabbed page. Default to Account. Url params: `/settings?tab=billing`.
2. Connected tab shows Gmail (for status parsing — placeholder) and LinkedIn integration status.
3. Billing tab is the 3-tier pricing card. Stripe Checkout integration is NOT in scope for this round (placeholder "Upgrade to Pro" button).
4. Privacy tab: export data button, delete account button.
5. Analytics: add the 3.4× callout, lean into editorial voice. Consider adding response-rate-vs-baseline comparisons.
6. Interview prep: AI-prefilled common questions per company. Right rail with company info + recruiter contact + CV reminder.

### Phase J · Command palette + ⌘K wiring (~1 day)

**Files:**
- `components/CommandPalette.tsx` (NEW)
- `components/layout/TopBar.tsx` (UPDATE — add ⌘K trigger button)
- `lib/commandPalette/index.ts` (NEW — registry of commands)

**Tasks:**
1. Build the palette: search input, sectioned results (Jobs / Applications / Actions / Settings).
2. Cmd+K keyboard shortcut on every page.
3. Search across jobs by company/title, applications, actions ("Run sweep", "Open settings", etc.).
4. Add ⌘K icon button on every page topbar with hint.

## Risks

1. **Onboarding state machine in `proxy.ts`** — risk of redirect loops. Test cold-start, partial completion, refresh mid-onboarding.
2. **OAuth provider config** — Google requires verified domain, LinkedIn requires app review. Have email-only fallback ready.
3. **Tailor route move** — existing `/cv/tailor` route may have inbound links. Add redirects.
4. **Supabase storage upload limits** — already chunked, but verify large CVs (10+ pages) still work.
5. **Activity merger** — Notifications and Agent Activity have different shapes (`profiles.unread_notifications_at` vs agent log). Need a unified data model or a view.

## Dependencies / order

- Phase A (login + auth) → blocks nothing else, can ship standalone.
- Phase B (onboarding) → depends on Phase A for fresh-account flow.
- Phase C (sidebar restructure) → unblocks Phase D (Jobs absorption) and Phase G (user menu).
- Phase D (Jobs absorption) → unblocks Phase E (Tailor uses Job detail as entry).
- Phase E (Tailor restructure) → unblocks Phase F (Auto-apply, since Save → Auto-apply is the new flow).
- Phase F → unblocks Phase G (Applications shows new auto-applied entries).
- Phase H, I, J → independent, can ship anytime after Phase C.

**Suggested ship order:** A → C → B → D → E → F → **F.5 (Dashboard editorial redesign)** → G → H → I → J. About 13-14 days of focused CC work.

## Test plan

- Auth: sign up, sign in, OAuth (both providers), forgot/reset password.
- Onboarding: cold start, skip path, mid-onboarding refresh.
- Jobs: sweep, browse, filter, compare, cold-start empty state, filter-empty state.
- Tailor: full flow on a real Greenhouse job. Verify diff renders, save creates row, PDF generates.
- Auto-apply: prepare returns screenshot, submit works on a test Greenhouse posting.
- Applications: pipeline updates, application detail renders correct CV.
- Activity: new agent action appears in feed, unread badge updates.
- Settings: tabs work, account info saves.
- Command palette: ⌘K opens, search returns results, navigation works.

## Verification artifacts

After each phase, run `/qa http://localhost:3000` to catch regressions across all pages.

## Open questions

1. Should the tailor flow always auto-redirect to Auto-apply Review at S4, or should there be a confirmation step?
2. Compare modal: max 3 jobs or unlimited?
3. Activity unread state: per-user or per-action?
4. Stripe Checkout for Billing — in scope for this round, or wait?
5. Onboarding 4: how do we handle a sweep that returns 0 jobs (e.g., overly narrow preferences)?
