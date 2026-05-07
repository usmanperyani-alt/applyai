# gstack — full command reference

All 43 slash commands installed via [gstack](https://github.com/garrytan/gstack), grouped by workflow stage. Source of truth for any command is its `SKILL.md` at `~/.claude/skills/<name>/SKILL.md`.

**Global requirements:**
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- [Bun](https://bun.sh/) v1.0+ (used by every skill — installed via `brew install oven-sh/bun/bun`)
- [Git](https://git-scm.com/) — most skills assume a git repo
- Some skills additionally need: `gh` CLI, `codex` CLI, Playwright Chromium (auto-installed by gstack setup)

To use a skill in a session: type `/<name>`. If the Skill tool says "Unknown skill", restart Claude Code so the registry picks it up.

---

## 1 · Project setup (one-time per project)

### `/setup-deploy`
Configure deployment settings for `/land-and-deploy`. Detects platform (Fly.io, Render, Vercel, Netlify, Heroku, GH Actions, custom), production URL, health checks, and writes config to CLAUDE.md.
- **When:** First time wiring up automated deploys for a project.
- **Requires:** A working deploy somewhere (the skill detects the existing setup).
- **Aliases:** "setup deploy", "configure deployment".

### `/setup-gbrain`
Install GBrain (cross-machine memory) for this agent. Initializes a local PGLite or Supabase brain, registers MCP, captures per-remote trust policy.
- **When:** You want gstack memory to sync across machines.
- **Requires:** GitHub account if using the remote sync option.
- **Aliases:** "setup gbrain", "install gbrain".

### `/setup-browser-cookies`
Import cookies from your real Chromium browser into the headless `/browse` session. Interactive picker UI for selecting domains.
- **When:** Before running `/qa` on authenticated pages.
- **Requires:** A real Chromium browser already logged into the target site.
- **Aliases:** "import cookies", "login to the site".

### `/design-consultation`
Design system bootstrap. Researches the landscape, proposes a complete system (typography, color, layout, motion), generates font + color preview pages, writes `DESIGN.md`.
- **When:** Starting a new project's UI from scratch with no existing design system.
- **Requires:** A general sense of the product. Best paired with `/office-hours` first.
- **Aliases:** "design system", "create DESIGN.md".

---

## 2 · Planning (before writing code)

### `/office-hours`
YC Office Hours methodology. Two modes:
- **Startup mode:** 6 forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit).
- **Builder mode:** Design thinking for side projects, hackathons, learning, OSS.
Saves a design doc.
- **When:** New product idea, exploring whether something is worth building, design questions for things that don't exist yet.
- **Requires:** Nothing.
- **Aliases:** "brainstorm this", "I have an idea", "is this worth building".
- **Auto-invokes:** YES — when user describes a new product idea or asks "is this worth building".

### `/plan-ceo-review`
CEO/founder-mode plan review. Rethink the problem, find the 10-star product, expand scope when it creates a better product. Four modes: SCOPE EXPANSION / SELECTIVE EXPANSION / HOLD SCOPE / SCOPE REDUCTION.
- **When:** You have a plan and want to challenge ambition + scope.
- **Requires:** A written plan file or document.
- **Aliases:** "think bigger", "expand scope", "strategy review".

### `/plan-eng-review`
Eng manager-mode plan review. Lock in execution plan: architecture, data flow, diagrams, edge cases, test coverage, performance.
- **When:** Plan is settled at the strategy level, about to start coding.
- **Requires:** A written plan file or design doc.
- **Aliases:** "tech review", "review the architecture", "lock in the plan".

### `/plan-design-review`
Designer's eye plan review. Rates each design dimension 0-10, explains what makes it a 10, fixes the plan to get there.
- **When:** Plan has UI/UX components that need critique before implementation.
- **Requires:** A written plan file with UI scope.
- **Different from `/design-review`:** This is plan-mode (before coding). `/design-review` is for live sites.
- **Aliases:** "review the design plan", "design critique".

### `/plan-devex-review`
Interactive developer experience plan review. Explores personas, benchmarks against competitors, designs magical moments, traces friction. Three modes: DX EXPANSION / DX POLISH / DX TRIAGE.
- **When:** Plan describes a developer-facing product (API, CLI, SDK, library, platform, docs).
- **Requires:** A written plan file with developer-facing scope.
- **Aliases:** "DX review", "API design review".

### `/autoplan`
**The mega-command.** Reads CEO + design + eng + DX review skills from disk and runs them sequentially with auto-decisions using 6 decision principles. Surfaces only the genuinely close calls at a final approval gate.
- **When:** You have a plan file and don't want to answer 15-30 intermediate questions.
- **Requires:** A written plan file. Optionally `codex` CLI for dual-voice review.
- **Tradeoff:** Saves you ~20 questions; takes ~15-20 min for the agent to run.
- **Aliases:** "auto plan", "run all reviews", "auto review".

### `/plan-tune`
Configure question sensitivity per-skill. Set never-ask / always-ask / ask-only-for-one-way preferences. Inspect the dual-track profile (declared vs behavioral).
- **When:** A specific question keeps firing and annoying you.
- **Requires:** Have used some skills already so there's data to tune.
- **Aliases:** "stop asking me that", "too many questions", "tune questions".

---

## 3 · Building (writing code)

### `/design-html`
Generates production-quality Pretext-native HTML/CSS. Text reflows, heights are computed, layouts are dynamic. 30KB overhead, zero deps. Smart API routing picks the right Pretext patterns per design type.
- **When:** You've approved a mockup from `/design-shotgun` or have a plan from `/plan-ceo-review` and want code.
- **Requires:** Approved design or clear description.
- **Aliases:** "build the design", "code the mockup", "make it real".

### `/design-shotgun`
Generates multiple AI design variants, opens a comparison board, collects structured feedback, iterates.
- **When:** You haven't decided what something should look like yet.
- **Requires:** A description of the UI feature.
- **Aliases:** "explore designs", "show me options", "design variants".

### `/codex`
OpenAI Codex CLI wrapper — three modes:
- **Code review:** independent diff review with pass/fail gate
- **Challenge:** adversarial mode that tries to break your code
- **Consult:** ask codex anything, session continuity for follow-ups
- **When:** Want a "200 IQ second opinion" from a different model.
- **Requires:** `codex` CLI installed (`brew install codex` or `npm i -g @openai/codex-cli`) + auth (`codex login` or `$CODEX_API_KEY`).
- **Aliases:** "codex review", "second opinion", "ask codex".

---

## 4 · Browser & QA tools

### `/browse <url>`
Fast headless browser (~100ms per command). Navigate URLs, click, type, screenshot, diff, assert state.
- **When:** Need to test a feature, verify a deploy, dogfood a flow, file a bug with evidence.
- **Requires:** Playwright Chromium (auto-installed by gstack setup).
- **Aliases:** "open in browser", "test the site", "take a screenshot".

### `/connect-chrome` (alias: `/open-gstack-browser`)
Launches GStack Browser — visible AI-controlled Chromium with a sidebar extension. You watch every action live.
- **When:** Want to see what the agent is doing in the browser, or need anti-bot stealth.
- **Requires:** Nothing (gstack ships its own Chromium).
- **Aliases:** "launch browser", "real browser", "show me the browser".

### `/qa <url>`
Systematic web app QA. Runs tests, then iteratively fixes bugs in source code, committing each fix, re-verifying. Three tiers: Quick / Standard / Exhaustive.
- **When:** Feature ready for testing. "Does this work?"
- **Requires:** App running at the URL. Cookies via `/setup-browser-cookies` for authed pages.
- **Aliases:** "qa this", "test and fix", "find bugs".
- **Auto-invokes:** YES — when user says a feature is ready.

### `/qa-only`
Same as `/qa` but report-only. Produces health score + screenshots + repro steps. Never fixes anything.
- **When:** Want a bug report without code changes.
- **Requires:** Same as `/qa`.
- **Aliases:** "just check for bugs", "qa report only".

### `/design-review`
Designer's eye QA on a **live site**. Finds visual inconsistency, spacing, hierarchy, AI slop, slow interactions. Iteratively fixes in source, commits each fix, re-verifies with before/after screenshots.
- **When:** Live site needs visual polish.
- **Requires:** App running, source code, cookies for authed pages.
- **Different from `/plan-design-review`:** That's plan-mode (before code). This is live-site (after code).
- **Aliases:** "audit the design", "visual QA", "design polish".

### `/devex-review`
Live developer experience audit. Browses your docs, tries the getting-started flow, times TTHW, screenshots error messages, evaluates CLI help. Produces a DX scorecard with evidence.
- **When:** Just shipped a developer-facing feature.
- **Requires:** App running.
- **Boomerang:** If `/plan-devex-review` ran earlier, compares "plan said 3 min" vs "reality says 8 min".
- **Aliases:** "test the DX", "DX audit".

### `/pair-agent`
Pair a remote AI agent with your browser. One command generates a setup key + instructions for the other agent. Works with OpenClaw, Hermes, Codex, Cursor, or any HTTP-capable agent.
- **When:** Want to share your browser with another agent.
- **Requires:** Browser running.
- **Aliases:** "pair agent", "share my browser", "remote browser access".

### `/benchmark <url>`
Performance regression detection via the browse daemon. Establishes baselines for page load, Core Web Vitals, resource sizes. Compares before/after on every PR. Tracks trends.
- **When:** Performance matters for this feature.
- **Requires:** App running.
- **Aliases:** "speed test", "lighthouse", "web vitals", "bundle size".

### `/benchmark-models`
Cross-model benchmark for gstack skills. Runs the same prompt through Claude, GPT (via Codex), Gemini side-by-side. Compares latency, tokens, cost, quality (LLM judge).
- **When:** Choosing which model to use for a specific skill.
- **Requires:** Auth tokens for each model you want to compare.
- **Aliases:** "compare models", "model shootout".

---

## 5 · Code review

### `/review`
Pre-landing PR review. Analyzes diff against base branch for SQL safety, LLM trust boundary violations, conditional side effects, structural issues.
- **When:** Before merging a PR. Before running `/ship`.
- **Requires:** Git repo with uncommitted/branch changes vs base.
- **Aliases:** "review this PR", "code review", "check my diff".
- **Auto-invokes:** YES — when user is about to merge.

### `/cso`
Chief Security Officer mode. Two flavors:
- **Daily** (zero-noise, 8/10 confidence gate)
- **Comprehensive** (monthly deep scan, 2/10 bar)
Covers: secrets archaeology, dependency supply chain, CI/CD security, LLM/AI security, skill supply chain, OWASP Top 10, STRIDE threat model, active verification.
- **When:** Before exposing app publicly. Periodic security review. Touching auth/secrets code.
- **Requires:** Git repo. `gh` CLI for CI scanning.
- **Aliases:** "see-so", "security audit", "OWASP review", "vulnerability scan".

### `/health`
Code quality dashboard. Wraps your project's type checker, linter, test runner, dead code detector, shell linter. Computes weighted composite 0-10. Tracks trends.
- **When:** Need a single number for codebase health. Regular check-in.
- **Requires:** Project tools configured (tsc, eslint, jest, etc.).
- **Aliases:** "health check", "code quality", "quality score".

---

## 6 · Shipping

### `/ship`
Detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, create PR.
- **When:** Code is ready, want a PR up.
- **Requires:** Git repo, `gh` CLI for PR creation, push permissions.
- **Aliases:** "ship", "create a PR", "push to main".
- **Auto-invokes:** YES — when user says code is ready.

### `/land-and-deploy`
Takes over after `/ship` creates the PR. Merges, waits for CI + deploy, verifies production via canary checks.
- **When:** PR is approved and ready to merge.
- **Requires:** `/setup-deploy` run beforehand. CI pipeline configured.
- **Aliases:** "merge and verify", "land it", "ship it to production".

### `/canary`
Post-deploy monitoring. Watches the live app for console errors, performance regressions, page failures via browse daemon. Periodic screenshots, baseline comparisons, alerts on anomalies.
- **When:** Just deployed and want to confirm production is healthy.
- **Requires:** Live URL.
- **Aliases:** "monitor deploy", "canary", "watch production".

### `/landing-report`
Read-only queue dashboard for workspace-aware ship. Shows VERSION slots claimed by open PRs, sibling Conductor workspaces with WIP, what slot `/ship` would pick next.
- **When:** Multiple PRs in flight, need to coordinate.
- **Requires:** Git repo with `gh` access.
- **Aliases:** "landing report", "what's in the queue".

---

## 7 · Post-ship

### `/document-release`
Reads all project docs, cross-references the diff, updates README / ARCHITECTURE / CONTRIBUTING / CLAUDE.md to match what shipped. Polishes CHANGELOG, cleans TODOS, optionally bumps VERSION.
- **When:** PR merged or code shipped.
- **Requires:** Git repo with merged commits to document.
- **Aliases:** "update the docs", "sync documentation", "post-ship docs".
- **Auto-invokes:** YES — after merge/ship.

### `/retro`
Weekly engineering retrospective. Analyzes commit history, work patterns, code quality. Persistent history + trend tracking. Team-aware: per-person breakdown with praise + growth.
- **When:** End of week or sprint.
- **Requires:** Git repo with at least a week of commits.
- **Aliases:** "weekly retro", "what did we ship".
- **Auto-invokes:** YES — at end of work week.

---

## 8 · Investigation & debugging

### `/investigate`
Systematic debugging. Four phases: investigate → analyze → hypothesize → implement. Iron Law: no fixes without root cause.
- **When:** Bug, error, stack trace, "it was working yesterday", unexpected behavior.
- **Requires:** Reproducible issue or error message.
- **Aliases:** "debug this", "why is this broken", "root cause analysis".
- **Auto-invokes:** YES — when user reports errors. Do NOT debug directly without `/investigate`.

### `/learn`
Manage project learnings. Review, search, prune, export what gstack has learned across sessions.
- **When:** "Didn't we fix this before?" Onboarding new collaborators. Pruning stale knowledge.
- **Requires:** Some history of gstack usage in the project.
- **Aliases:** "what have we learned", "show learnings".

---

## 9 · Session management

### `/context-save`
Saves working context: git state, decisions made, remaining work. Future sessions can pick up without losing context.
- **When:** End of a session, switching tasks, before context compaction.
- **Requires:** Nothing.
- **Aliases:** "save progress", "save state".

### `/context-restore`
Loads the most recent saved state. Works across Conductor workspace handoffs.
- **When:** Resuming work after a break or handoff.
- **Requires:** Previous `/context-save`.
- **Aliases:** "resume", "where was I", "pick up where I left off".

---

## 10 · Safety & scope control

### `/careful`
Warns before destructive commands: `rm -rf`, `DROP TABLE`, `git push --force`, `git reset --hard`, `kubectl delete`, similar.
- **When:** Touching prod, debugging live systems, shared environment.
- **Requires:** Nothing.
- **Aliases:** "be careful", "safety mode", "prod mode".

### `/freeze <directory>`
Restricts Edit + Write to a specific directory for the session. Prevents accidentally "fixing" unrelated code.
- **When:** Debugging or scoped refactor where you want hard guardrails.
- **Requires:** Nothing.
- **Aliases:** "freeze", "lock down edits", "only edit this folder".

### `/unfreeze`
Clears the freeze boundary. Widens edit scope without ending the session.
- **When:** Done with the scoped work, want to edit elsewhere again.
- **Requires:** `/freeze` was previously active.
- **Aliases:** "unfreeze", "unlock edits".

### `/guard`
Combines `/careful` + `/freeze`. Maximum safety mode.
- **When:** Touching prod or live systems and want both warnings + scope lock.
- **Requires:** Specify which directory to lock.
- **Aliases:** "guard mode", "full safety", "lock it down".

---

## 11 · Utilities

### `/make-pdf <file.md>`
Markdown → publication-quality PDF. 1in margins, intelligent page breaks, page numbers, cover page, running headers, curly quotes, em dashes, clickable TOC, optional DRAFT watermark.
- **When:** Need to share a doc as PDF.
- **Requires:** A markdown file.
- **Aliases:** "make a PDF", "export to PDF", "turn this into a PDF".

### `/gstack-upgrade`
Upgrade gstack itself. Detects global vs vendored install, runs the upgrade, shows what's new.
- **When:** Periodic. Run monthly.
- **Requires:** Network access.
- **Aliases:** "upgrade gstack", "update gstack", "g-stack upgrade".

---

## Dependency map (which skill calls which)

| Use this for | First run |
|---|---|
| `/qa` on authed pages | `/setup-browser-cookies` |
| `/land-and-deploy` | `/setup-deploy` |
| `/canary` | `/setup-deploy` |
| `/design-html` | `/design-shotgun` or `/plan-design-review` |
| `/devex-review` boomerang scoring | `/plan-devex-review` first |
| `/autoplan` dual voices | `/codex` (CLI installed) |
| `/codex` | `codex` CLI installed |

---

## Workflow recipes

**New product idea → first ship**
```
/office-hours        → save the design doc
/design-consultation → DESIGN.md + tokens
/plan-ceo-review     → strategy critique (or /autoplan for the full pipeline)
/plan-eng-review     → architecture lock
/design-shotgun      → mockup variants
/design-html         → code the chosen mockup
/qa                  → test + fix
/cso                 → security audit
/review              → diff review
/ship                → PR
/land-and-deploy     → merge + verify
/canary              → post-deploy watch
/document-release    → sync docs
```

**Existing product → bug came in**
```
/investigate         → root cause
/learn               → check if we've seen it before
(implement fix)
/qa                  → verify + catch regressions
/review              → diff review
/ship
```

**Existing product → polish pass**
```
/design-review       → visual fixes
/devex-review        → DX fixes (if devtool)
/health              → quality score
/benchmark           → performance check
```

**End of week**
```
/retro               → what we shipped
/learn               → what we learned
```

---

## ApplyAI-specific suggestions (April 2026)

Given the current state of the ApplyAI project, the most valuable commands right now:

| Command | Why useful for ApplyAI now |
|---|---|
| `/browse http://localhost:3000` | Visually verify the new login + auth pages we just shipped |
| `/qa http://localhost:3000` | Full QA pass after each phase from PLAN.md |
| `/cso` | Security audit before exposing publicly (auth, secrets, RLS) |
| `/review` | Pre-PR review on each phase's branch |
| `/ship` | When ready to push the auth phase |
| `/document-release` | After each phase ships, sync docs |

Less useful right now (no project fit yet):
- `/setup-deploy` — we haven't picked a host yet
- `/land-and-deploy` / `/canary` — no prod environment
- `/retro` — solo project, weekly retro is overkill
- `/pair-agent` — solo work, no other agents involved

---

## Notes & caveats

- **Skills install on disk under `~/.claude/skills/`** — but Claude Code only registers them at session start. After install, restart Claude Code or the Skill tool will say "Unknown skill".
- **Voice triggers** (where listed) are speech-to-text aliases. Useful when dictating instead of typing.
- **Auto-invokes** (where listed) means gstack will proactively suggest the skill rather than waiting for you to type the command.
- **`(gstack)` suffix** in skill descriptions identifies skills as part of the gstack pack.
