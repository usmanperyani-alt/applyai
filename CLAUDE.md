@AGENTS.md

# ApplyAI

An AI-powered job hunting web app. Discovers jobs from public sources, scores them against the user profile, AI-tailors the CV per role, can auto-apply, and tracks the application pipeline.

Stealth-mode product (no public branding in the UI).

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (Next.js 16 + Turbopack)
npm run build
npm run start
```

No env vars required for the first run — the app falls back to a fully local mode (localStorage + in-memory job scrape). Add keys to `.env.local` to unlock features:

```
ZAI_API_KEY=...                          # AI tailoring + matching (preferred)
ANTHROPIC_API_KEY=...                    # Anthropic fallback
NEXT_PUBLIC_SUPABASE_URL=...             # DB persistence
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...            # server only — bypasses RLS
```

`.env.local` is gitignored. Never paste the service-role key in chat.

## Stack

- **Next.js 16** (App Router, Turbopack) — see `AGENTS.md`: this version has breaking changes vs. older Next.js. When in doubt read `node_modules/next/dist/docs/`.
- **Tailwind CSS v4** — config lives in CSS via `@theme` in [app/globals.css](app/globals.css), NOT in `tailwind.config.js`. Brand tokens are CSS custom properties (`--color-brand-500`, etc.). Editorial palette (forest, cream, warm, ink, brand-soft) was added for the redesigned auth/marketing surfaces.
- **TypeScript**, strict.
- **z.ai (GLM-4.6 / 4.5-air)** for AI; Anthropic Claude as fallback.
- **Supabase** (Postgres + pgvector + RLS + Storage + Auth via `@supabase/ssr`) for persistence and sign-in.
- **Playwright** for browser-based scraping (Indeed, LinkedIn) and auto-apply form fill.
- **Puppeteer** for HTML→PDF CV export.
- **pdf-parse v1.1.1** (NOT v2 — see [Gotchas](#gotchas)).
- **BullMQ** worker scaffolded but not yet wired into a running queue.

## Project layout

```
proxy.ts                  # Next.js 16 replacement for middleware.ts — refreshes Supabase session, gates
                          # routes, allows /login + /auth through. matcher excludes _next/static, api, images.

app/
  layout.tsx              # Bare html+body shell (no sidebar — that lives in the (authed) group)
  globals.css             # Tailwind v4 @theme tokens (brand + editorial palette)
  page.tsx                # Redirect → /dashboard
  login/                  # Public — two-column editorial sign-in/sign-up. Floating CV
                          # mock is xl+ only (hidden lg) to avoid overlapping hero copy.
  auth/callback/          # Supabase OAuth + email-confirm + password-reset code exchange.
                          # Accepts ?next= to redirect after exchange.
  auth/forgot/            # Email input → resetPasswordForEmail → /auth/check-email
  auth/check-email/       # Confirmation screen with "Open Gmail" + 0:45 resend countdown
  auth/reset/             # New password form, 4-segment strength meter, updateUser, → /dashboard
  onboarding/             # Top-level (NOT inside (authed)) — no sidebar shell.
                          # Gated by proxy.ts when onboarding_completed_at is null.
    layout.tsx            # Pass-through (intentionally minimal).
    actions.ts            # Server actions: advanceToStep(n), finishOnboarding(redirectTo)
    welcome/              # Onboarding 1 — dark hero, "Welcome, {firstName}".
    cv/                   # Onboarding 2 — drop-zone, POST /api/cv/upload, skip link.
    preferences/          # Onboarding 3 — roles + location + salary + remote, right preview.
    scan/                 # Onboarding 4 — animated counter ring, fires discover, redirect mid-scan.
  (authed)/               # Route group — layout.tsx wraps these with the Sidebar/TopBar shell
    dashboard/            # Main page — job discovery + pipeline + CV summary
    jobs/                 # Tabbed: Browse (default) + Sources. Compare mode (checkbox + modal),
                          # cold-start empty state, sort dropdown.
      page.tsx            # Tab routing via ?tab=, suspense-wrapped for useSearchParams.
      SourcesTab.tsx      # Agent control center — was /job-discovery as a standalone page.
      CompareModal.tsx    # 2-3 jobs side-by-side, opened from Compare action bar.
      ColdStartEmpty.tsx  # "No jobs scraped yet" CTA, fires /api/jobs/discover.
      [id]/               # Job detail page — server component + JobActions client island.
                          # Tailor button links to /jobs/[id]/tailor; Apply links to auto-apply.
        tailor/           # 4-step tailor flow (Setup → Generating → Review → Saved).
                          # Sidebar visible. State machine in TailorOrchestrator.
        auto-apply/       # Auto-apply review surface. Calls /api/auto-apply/prepare on mount,
                          # shows screenshot + checklist, sticky Submit footer. Falls back to
                          # manual mode if prep fails (non-Greenhouse ATS, missing resume).
    job-discovery/        # Redirects to /jobs?tab=sources for back-compat. Safe to delete later.
    applications/         # Application tracker
      [id]/               # Server component — JD + the exact CV that was sent + PDF download
    cv/                   # CV editor (upload, parse, edit, export). Debounced 600ms autosave.
    preferences/          # Profile + scoring preferences
    analytics/            # Stats
  api/
    jobs/discover         # Trigger scraping → upsert (chunks of 100, ON CONFLICT (source, external_id))
    jobs/match            # AI-score one job vs. one profile (Supabase mode)
    jobs/match-profile    # Keyword scorer (Phase 1, no AI)
    cv/upload             # PDF → text → structured CVContent (z.ai → Anthropic → regex fallback)
    cv/tailor             # AI-tailor CV for a specific job
    cv/tailor-and-save    # Tailor → insert cvs row → render PDF → upload to Storage → return pdf_url
    cv/[id]/pdf           # Stream a saved tailored CV PDF (RLS-aware)
    cv/export             # PDF export (Supabase mode)
    cv/export-local       # PDF export (inline mode, no DB)
    apply                 # Record manual application
    auto-apply/prepare    # Step 1: dry-run Playwright form fill, return screenshot + filled fields
    auto-apply/submit     # Step 2: actually submit (requires { confirmed: true })
    agent/status          # Status pulse for the dashboard

components/
  auth/                   # AuthShell — shared 2-col editorial layout for /auth/* pages
  layout/                 # Sidebar (5 nav items), TopBar, UserMenu (popover off the user pill)
  dashboard/              # MetricCard (dark `anchor` variant + optional top-right icon slot),
                          # JobRow (42x42 letter avatar, big match-score column, Tailor pill —
                          # hides the score block when match_score is missing), PipelinePanel,
                          # CVHealthCard (replaces CVPanel for dashboard), AgentLog (right-rail
                          # ticker), AgentStatusCard (sidebar pill — visible on every authed
                          # page), TailorModal (legacy quick-modal still used by dashboard),
                          # ApplyConfirmModal, EmptyDashboard (no-CV state), CVPanel (legacy,
                          # kept for back-compat — superseded by CVHealthCard on dashboard)
  tailor/                 # TailorSetup (S1), TailorGenerating (S2), TailorReview (S3),
                          # TailorSaved (S4). Used only by /jobs/[id]/tailor route.
  autoApply/              # FormSnapshot, FillChecklist, SubmittingTakeover.
                          # Used only by /jobs/[id]/auto-apply route.
  shared/                 # ProgressTakeover — dark hero takeover with ring + step list.
                          # Reused by tailor S2 + auto-apply Submitting.
  jobs/                   # JobCard, SourceChip
  ui/                     # Badge, ProgressBar

lib/
  onboarding/
    state.ts              # Server helpers: getOnboardingState, advanceOnboardingStep,
                          # completeOnboarding, pathForStep. Talks to profiles table.
  anthropic.ts            # Provider-agnostic AI: routes to z.ai → Anthropic
  zai.ts                  # z.ai client (fetch-based, no SDK). Disables thinking by default for structured output.
  models.ts               # Centralized model IDs
  supabase.ts             # Universal helpers — only exports hasSupabase()
  supabase/browser.ts     # "use client" — getBrowserClient() via @supabase/ssr
  supabase/server.ts      # "server-only" — getServerClient (cookies), getCurrentUser, getServiceClient
  store/
    cv.ts                 # loadMasterCV / saveMasterCV / clearMasterCV — Supabase when authed, localStorage cache.
                          # Auto-migrates localStorage → Supabase on first authed load.
    profile.ts            # Same pattern. cacheLocal() (silent) is split from writeLocal() (notifies) to
                          # prevent the profileUpdated event from triggering an infinite refetch loop.
  localStore.ts           # Legacy localStorage wrappers (kept for in-memory fallback paths)
  scraper/
    greenhouse.ts         # Public Greenhouse JSON API + canonicalHash() for cross-source dedup
    indeed.ts             # Playwright
    linkedin.ts           # Playwright
  autoApply/
    greenhouse.ts         # Playwright auto-apply with detectATS() + dryRun
  cv/
    tailor.ts             # AI tailoring orchestration
    pdf.ts                # Puppeteer HTML → PDF

types/index.ts            # Profile, Job, Application, CVContent, MatchResult

supabase/
  schema.sql              # Idempotent: 4 tables, RLS, pgvector, embedding RPC, handle_new_user trigger
  storage.sql             # Creates cv-pdfs bucket + RLS policies pinned to <user_id>/<cv_id>.pdf

Designs/
  pencil-new.pen          # 36-frame editorial design system: tailor flow, app shell, onboarding, empty
                          # states, CV upload, auto-apply, job detail, notifications, auth, settings,
                          # billing, command palette, agent activity, plus 8 mobile pairs.

workers/                  # BullMQ workers (scaffolded, not wired)
```

## Architecture: dual-mode persistence

Every API route gates on `hasSupabase()` (or `hasAIProvider()` for AI). When Supabase isn't configured the route returns a local-mode response and the client persists via `lib/localStore.ts`. This means:

- The app is fully demoable with **zero external services**.
- Adding env vars upgrades the app in place — no code changes needed.
- localStorage uses a synthetic per-browser `user_id` (see `getOrCreateUserId()` in `lib/localStore.ts`) so the same code paths work in both modes.

All four tables (`jobs`, `profiles`, `cvs`, `applications`) now write through to Supabase when the user is signed in. `lib/store/cv.ts` and `lib/store/profile.ts` route between Supabase and localStorage based on auth state, and migrate any pre-existing localStorage data into the user's row on first authed load.

## Auth

Sign-in lives at `/login` (public, two-column editorial design). The `proxy.ts` at the project root is the Next.js 16 replacement for `middleware.ts` — it refreshes the Supabase session on every request and redirects unauthenticated users to `/login`. `PUBLIC_PATHS = ["/login", "/auth"]`. The matcher excludes `_next/static`, API routes, and images.

A Postgres trigger (`handle_new_user` in `supabase/schema.sql`) auto-creates a `profiles` row on every `auth.users` insert so the FK from `cvs.user_id` / `applications.user_id` is always satisfied — no separate "create profile" call from the client.

The `proxy.ts` also gates **onboarding**: if a signed-in user has `profiles.onboarding_completed_at IS NULL`, every non-`/onboarding`, non-`/auth`, non-`/api` request gets redirected to the appropriate `/onboarding/<step>`. Steps: `welcome` → `cv` → `preferences` → `scan`. The CV step has a "Skip — I'll add my CV later" link that calls `completeOnboarding` and lets the user through to the dashboard (which then renders `<EmptyDashboard />` until they upload). Once `onboarding_completed_at` is set the gate stops firing — users can return to `/onboarding/*` manually.

Always reach for the right Supabase helper:

- `lib/supabase/browser.ts` — `"use client"`, exports `getBrowserClient()`.
- `lib/supabase/server.ts` — `import "server-only"`, exports `getServerClient()` (cookie-bound), `getCurrentUser()`, `getServiceClient()` (bypasses RLS).
- `lib/supabase.ts` — only the universal `hasSupabase()` gate. Importing browser or server helpers from this file would pull `next/headers` into the client bundle.

OAuth (Google, LinkedIn) is wired in the login page via `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: /auth/callback?next=… } })`. The buttons will fail at runtime until the providers are configured in the Supabase dashboard:

- **Google:** Supabase dashboard → Auth → Providers → Google. Add a Google Cloud OAuth client (Web application). Authorized JavaScript origins: `http://localhost:3000`, `https://<your-prod-domain>`. Authorized redirect URI: the value Supabase shows you in the provider modal (looks like `https://<project>.supabase.co/auth/v1/callback`). Paste the client ID + secret back into Supabase.
- **LinkedIn:** same flow, but use the `linkedin_oidc` provider (NOT the legacy `linkedin`). Requires creating an app on LinkedIn Developer Console and getting the OIDC scope approved (can take a few days). Until then the LinkedIn button will return an error.

Forgot/reset flow: `/auth/forgot` → `/auth/check-email` → email link → `/auth/callback?code=…&next=/auth/reset` → `/auth/reset`. The callback exchanges the recovery code for a session, then `/auth/reset` calls `supabase.auth.updateUser({password})` and redirects to `/dashboard`. The Supabase email template still uses the default — customize it in Auth → Email Templates → Reset Password to match brand voice.

## AI providers

- Default: **z.ai** (Zhipu) via `ZAI_API_KEY`. Models: `glm-4.6` (smart, used for tailoring) and `glm-4.5-air` (cheap, used for match scoring). Reasoning is **disabled** (`thinking: { type: "disabled" }`) for structured output — otherwise GLM-4.6 burns the entire token budget on reasoning and returns nothing.
- Fallback: **Anthropic** via `ANTHROPIC_API_KEY`. Models: `claude-sonnet-4-6` (smart) and `claude-haiku-4-5-20251001` (cheap).
- Model IDs are centralized in [lib/models.ts](lib/models.ts).
- [lib/anthropic.ts](lib/anthropic.ts) (named for backwards compat) is the provider-agnostic entry point.

## Job scraping

- **Greenhouse** is the only fully-wired source. Uses the public JSON API at `boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true` — no auth, no browser. Default companies: `stripe, figma, vercel, airbnb, coinbase, databricks, ramp, brex`. Companies that have moved off Greenhouse (e.g. notion, linear) return 404 and were dropped from the default list.
- **Indeed / LinkedIn** scrapers exist but use Playwright and are easily blocked. Treat as opt-in.
- **Match scoring on the dashboard.** The Supabase upsert path leaves `jobs.match_score` as NULL — discovery doesn't score. The dashboard always calls `/api/jobs/match-profile` after fetching when a profile exists (even if `skills` is empty — match-profile gracefully degrades to a baseline). Anything still unscored after the API round-trip gets a deterministic hash-derived fallback in the dashboard so JobRow never has to render bare "% match". The dashboard surface only shows Greenhouse; the source-toggle pills moved to `/jobs?tab=sources`.
- Cross-source dedup: every scraped job carries a `canonical_hash = sha256(lower(company)||title||location)`. This column is **not unique** — two distinct postings can legitimately produce the same hash (e.g. a role re-listed with a fresh `external_id`), and Postgres `ON CONFLICT` can only resolve against one constraint at a time. The discover route uses `(source, external_id)` as the conflict key, dedups within the batch before upserting, and chunks the upsert at 100 rows so 20 KB descriptions don't blow past Node's fetch timeout. Dedup at query time is sufficient.
- The schema migration block in `supabase/schema.sql` drops the legacy `jobs_canonical_hash_key` UNIQUE constraint if present — re-running the schema is safe.

## Auto-apply safety

Two-step flow, never single-shot submit:

1. `POST /api/auto-apply/prepare` — Playwright loads the application page, fills fields, takes a screenshot, returns `{ screenshot, filledFields, unfilledRequiredFields }`. Defaults to `dryRun: true`.
2. `POST /api/auto-apply/submit` with `{ confirmed: true }` — actually clicks submit. The UI ([components/dashboard/ApplyConfirmModal.tsx](components/dashboard/ApplyConfirmModal.tsx)) requires explicit user confirmation between the two steps.

## Database

Schema is in [supabase/schema.sql](supabase/schema.sql) and is idempotent. Storage policies are in [supabase/storage.sql](supabase/storage.sql). To apply: paste each into the Supabase SQL Editor and run.

Key columns worth knowing:
- `jobs.canonical_hash` — cross-source dedup key (NOT unique — see Job scraping above).
- `jobs.description` (sanitized HTML) vs. `jobs.description_text` (HTML-stripped, used for matching/embedding).
- `jobs.embedding vector(1024)` + `match_jobs_by_embedding` RPC — Phase 2 semantic matching (not yet populated).
- `cvs.tailored_for_job_id` — tailored CVs FK back to the job they were built for. `cv/tailor-and-save` validates this is a real UUID before insert.
- `cvs.pdf_url` — populated by `cv/tailor-and-save` after upload to the `cv-pdfs` Storage bucket.
- `applications.submission_log jsonb` — ATS type, screenshots, error trace.
- `applications.status_history jsonb` — `[{ status, changed_at, source: 'gmail'|'manual'|'webhook' }]`.

## Storage

The `cv-pdfs` bucket holds tailored CV PDFs. RLS policies pin every object to `<user_id>/<cv_id>.pdf`, so users can only read/write their own folder. Streaming downloads go through `/api/cv/[id]/pdf` which uses the authed cookie-bound client (RLS-enforced) rather than the service role.

## Gotchas

- **Next.js 16 is not the Next.js you know.** Read `node_modules/next/dist/docs/` before changing routing, async APIs, or config. (See [AGENTS.md](AGENTS.md).)
- **`middleware.ts` was renamed to `proxy.ts`** in Next.js 16. The file lives at the project root and uses the same `NextRequest` / `NextResponse` API.
- **Tailwind v4 — no `tailwind.config.js`.** Edit `@theme` in [app/globals.css](app/globals.css). Tokens become utilities automatically (`--color-brand-500` → `bg-brand-500`).
- **pdf-parse**: pinned to `v1.1.1`. Imported as `require("pdf-parse/lib/pdf-parse")` to bypass the v1 entry-point's auto-load of a test fixture (which throws ENOENT in production). Don't upgrade to v2 — it's ESM-only and breaks the dynamic require.
- **GLM-4.6 reasoning**: must pass `thinking: { type: "disabled" }` for structured-output prompts. With reasoning on, the entire token budget gets consumed before any JSON is emitted.
- **Supabase client splits.** `lib/supabase/server.ts` carries `import "server-only"` because it touches `next/headers` (cookies). Importing it from a client component fails the build. Use `lib/supabase/browser.ts` from any `"use client"` file. The shared `lib/supabase.ts` only exports `hasSupabase()`.
- **`.env.local` leading whitespace.** A single leading space on `NEXT_PUBLIC_SUPABASE_URL=` will silently prevent the var from loading. Trim before saving.
- **`.next/` cache** can hold stale env values or hydrated HTML. After changing `.env.local` or hitting a hydration mismatch: `rm -rf .next && npm run dev`.
- **Buffer in `NextResponse`**: pass `new Uint8Array(buf)` rather than a raw `Buffer`.
- **Hydration race in CV editor**: `app/(authed)/cv/page.tsx` uses a `hydrated` flag to gate the 600ms-debounced autosave so an empty pre-hydration state doesn't overwrite the persisted CV.
- **Profile store event loop.** `lib/store/profile.ts` splits `cacheLocal()` (silent, used after a load) from `writeLocal()` (dispatches `profileUpdated`, used on actual save). If a load broadcasts the event, listeners trigger another load — infinite refetch.
- **Pencil MCP `.pen` files** are encrypted on disk. Read/write only via the `pencil` MCP tools — `Read`/`Grep` will return garbage.

## Verification

After meaningful changes:

```bash
rm -rf .next && npm run dev
# Smoke-test the four core flows:
curl -s http://localhost:3000/api/jobs | jq '.total'
curl -s "http://localhost:3000/api/jobs/discover?source=greenhouse" | jq '.persisted, .total'
# CV upload + tailor + auto-apply flows are interactive — exercise via the UI.
```

## Currently not wired

- **OAuth provider config in Supabase dashboard** — code is wired, but Google + LinkedIn need provider setup (see Auth section above) before buttons work end-to-end.
- **Voyage AI embeddings** + `match_jobs_by_embedding` RPC usage (column exists, never populated).
- **BullMQ worker runtime** (scaffold exists in `workers/`).
- **Lever / Ashby auto-apply** (only Greenhouse is wired).
- **Gmail response parsing** for `applications.status_history` (token column exists on `profiles`).
- **Activity + Application Detail + remaining designed screens** — Phases A (auth), B (onboarding), C (sidebar restructure), D (Jobs absorption + detail page), E (Tailor full-page flow), F (Auto-apply review surface), and F.5 (Dashboard editorial redesign — greeting topbar, dark Applied anchor, CV Health card, Agent log feed, Agent status pill in sidebar) are shipped. Phases G-J (Activity, Settings, ⌘K, etc.) are tracked in [PLAN.md](PLAN.md).

The `agentPaused` localStorage flag drives both the dashboard's pause toggle and the sidebar's AgentStatusCard. When the dashboard toggles, it dispatches a `agentPausedChange` window event so the Sidebar re-syncs without a full reload. Other pages can read the same flag if they need to gate auto-fetch behavior.
