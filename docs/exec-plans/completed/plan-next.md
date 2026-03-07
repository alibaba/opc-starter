# Swarm: Next-Phase Improvement Plan

> Last updated: 2026-02-21
>
> This document synthesizes findings from the Bicameral AI research on AI-era tech debt,
> the current implementation state across Phases 0–9, and identifies concrete improvements
> that will maximize Swarm's value as a cost-reduction and quality-assurance tool.

---

## Executive Summary

The core thesis of Swarm is validated by Bicameral AI's research:

> **"Code generation cannibalizes the implementation phase where additional constraints were
> previously caught, shifting the burden of discovery to code review — where it's even
> harder and more expensive to resolve."** — Bicameral AI, 2025

Swarm's multi-agent architecture with Scout-before-Builder is precisely the right structural
response. The current implementation (Phases 0–9) has built a solid foundation. This document
identifies where the system falls short of its full potential and charts the next evolution.

**Three highest-leverage improvements:**

1. **Upstream Constraint Surfacing** — Move constraint discovery *before* sprint planning,
   not just before coding. Generate PM-readable artifacts, not just developer JSON.
2. **Data-Driven Model Routing** — Use the metrics.db data Swarm already collects to
   automatically route tasks to the cheapest model that achieves acceptable quality.
3. **MCP Server Mode** — Expose Swarm as an MCP server so AI coding tools (Cursor, Claude,
   Windsurf) can invoke it as a tool, enabling zero-friction adoption.

---

## 1. Current Implementation Status

### What's Built (Phases 0–9)

| Phase | Status | Key Artifacts |
|-------|--------|---------------|
| **0 — Backend Abstraction** | ✅ Complete | Ollama, Anthropic, OpenAI-compatible backends; HealthChecker; ModelRouter |
| **0.5 — OpenRouter / Generic Providers** | ✅ Complete | `openai-compatible.ts`, `registry.ts`; config schema extended |
| **1 — Foundation** | ✅ Complete | CLI scaffolding, `swarm init/doctor/config`, SQLite stores, migrations |
| **2 — Isolation Layer** | ✅ Complete | git worktrees, tmux sessions, AgentSpawner, OverlayGenerator |
| **3 — Messaging & Trace** | ✅ Complete | SQLite mail store, MailClient, broadcast groups, TraceRecorder, MetricsCollector |
| **4 — Planning Engine** | ✅ Complete | ConventionsParser, ScoutRunner, ConstraintExtractor, TaskGraph builder, `swarm plan` |
| **5 — Execution Engine** | ✅ Complete | Dispatcher (topological sort + concurrency), Watchdog, `swarm run/status/sling` |
| **6 — Convergence** | ✅ Complete | MergeQueueStore, ConflictResolver (4-tier), `swarm merge` |
| **7 — Dashboard** | ✅ Complete | Hono HTTP server, REST API, fleet/metrics/cost pages, `swarm dashboard` |
| **8 — Polish** | ✅ Complete | `swarm inspect/clean/config`, shell completions, JSON output, signal handling |
| **9 — Benchmark** | ✅ Complete | BenchRunner, multi-dimensional Scorer, native test suites, cline-bench adapter, `swarm bench` |

### Recent Changes (Work in Progress)

The git diff reveals active development on **automated merge integration**:

- `src/agents/reviewer-runner.ts` — Reviewer now auto-enqueues approved builder branches to
  merge queue, removing the manual `swarm merge` step after review.
- `src/core/dispatcher.ts` — Dispatcher auto-enqueues completed builder branches to merge
  queue as soon as agents report `completed`.
- `src/cli/merge.ts` — New `--stage` flag lets operators stage changes without committing,
  enabling human inspection of diffs before final commit.
- `src/merge/resolver.ts` — `noCommit` option propagated through to git merge operations.

### Known Technical Debt

| Issue | Severity | File | Description |
|-------|----------|------|-------------|
| Dashboard test failures | Medium | `tests/dashboard/server.test.ts` | `closeDashboardStores` crashes when `stores.sessions` is undefined — likely mock setup issue |
| `require()` in ESM module | Low | `src/agents/reviewer-runner.ts:319` | Uses `require()` instead of dynamic `import()` for MergeQueueStore/SessionsStore |
| Doctor backend health stub | Medium | `src/cli/doctor.ts` | Backend health check is still `TODO` stub (known from phase-0.5 analysis) |
| Missing `plan-next.md` | Resolved | `docs/plan-next.md` | This file |

---

## 2. Core Thesis: What Bicameral AI Research Teaches Us

The [Bicameral AI tech debt article](https://www.bicameral-ai.com/blog/tech-debt-meeting)
surfaces four findings with direct implications for Swarm's evolution:

### Finding 1: One-Third of Constraints Live in Meetings

> 33% of technical constraints are discovered during sprint planning and product-engineering
> syncs — before any code is written. Yet they rarely get addressed there.

**Current Swarm gap**: `swarm plan` runs scouts *after* a developer decides to start coding.
By then, stakeholders have already anchored to an approach in a product meeting.

**Implication**: Swarm needs a "pre-meeting scout" mode that can run against a vague objective
description (or a GitHub issue) and produce a constraint report *before* the sprint planning
meeting — when options are still open and rework cost is zero.

### Finding 2: 70% of Constraints Need Cross-Functional Audiences

> 70% of technical constraints need to reach people who don't regularly interact with the
> codebase (PMs, designers, stakeholders).

**Current Swarm gap**: Constraint output goes to `.swarm/constraints/{plan-id}.json` — a
developer-facing JSON blob. PMs cannot read it.

**Implication**: Swarm needs to generate *human-readable, stakeholder-friendly* constraint
summaries with business impact framing ("this adds 3 days" / "this blocks the Q2 launch").

### Finding 3: AI Generates but Doesn't Refuse

> "AI can write the code, but it doesn't refuse to write the code without first being told
> why it wouldn't be a better idea to do X first." — Quothling, HN

> "It can not identify future issues from a separate process unless you specifically describe
> that external process." — adithyassekhar, HN

**Current Swarm gap**: Scouts discover constraints but are not designed to argue *against* the
proposed approach or suggest *better alternatives*. They find blockers, not opportunities.

**Implication**: Add an "adversarial planning" phase where a Scout's explicit job is to ask
"why is this the wrong approach?" and generate ranked alternative solutions.

### Finding 4: 35% of Constraints Leave No Artifact

> 35% of constraint communication leaves no persistent artifact. 25% are verbal only.

**Current Swarm gap**: Even though Swarm writes constraints to `.swarm/constraints/`, these
are session-scoped and disappear when `swarm clean` is run. There is no cumulative knowledge
base of past constraints that future plans can draw from.

**Implication**: Build a persistent "constraint library" that accumulates across projects and
teams, making Swarm smarter over time.

---

## 3. High-Priority Improvements (Next Quarter)

### H1: Pre-Sprint Scout Mode (`swarm scout`)

**Problem**: Constraint discovery happens too late — after sprint commitment, not before.

**Solution**: New standalone `swarm scout <objective>` command that runs constraint discovery
*without* building a full execution plan. Designed to be run in 2–5 minutes before a product
meeting.

```bash
# Pre-meeting: "Can we add multi-tenant billing?"
swarm scout "Add multi-tenant billing to the API"

# Output:
# 1. Constraint Report (Markdown, PM-readable)
# 2. Effort estimate (days, not story points)
# 3. Risk matrix (blocking vs. manageable)
# 4. Alternative approach suggestions
# 5. Dependency map (what else this touches)
```

**Output format**: Two artifacts per scout run:
- `.swarm/scouts/{id}-developer.md` — Technical detail for engineers
- `.swarm/scouts/{id}-stakeholder.md` — Business impact framing for PMs

**Implementation scope**:
- New `src/cli/scout.ts` command (wraps existing `ScoutRunner`)
- Extend `src/core/planner.ts` with `scoutOnly()` mode
- New stakeholder report template in `templates/stakeholder-report.md.tmpl`
- PM-friendly output: "This feature touches 3 microservices and requires a database
  migration. Estimated effort: 3-5 days. Risk: the existing auth module must be refactored
  first."

---

### H2: Adversarial Planning Phase

**Problem**: Scouts find blockers, but don't challenge the premise.

**Solution**: Add an optional "devil's advocate" scout pass that explicitly asks:
1. "What is the simplest alternative that achieves the same business goal?"
2. "What technical debt will this approach create?"
3. "What are we likely to discover mid-implementation that will require rework?"

```yaml
# .swarm/config.yaml
planning:
  adversarial_mode: true      # Enable devil's advocate scout
  alternatives_count: 3       # Generate N alternative approaches
  debt_analysis: true         # Include tech debt projection
```

**Adversarial scout prompt additions**:

```markdown
## Adversarial Analysis Tasks

1. **Challenge the approach**: Is this the simplest path to the goal?
   Consider alternatives and rank them by effort/risk.

2. **Project technical debt**: What shortcuts will be taken? What will
   be harder to change 6 months from now because of this approach?

3. **Pre-mortem**: Assume the implementation failed. What went wrong?
   List the top 3 failure scenarios.

4. **Hidden dependencies**: What else in the codebase will SILENTLY
   break when these changes are made? (Not syntax errors — logic bugs)
```

**Implementation scope**:
- New `AdversarialScout` role in `src/agents/`
- Extend `ConstraintExtractor` with adversarial analysis output
- New constraint categories: `tech_debt_risk`, `alternative_approach`, `silent_dependency`
- Extend `swarm plan` output with "Alternatives Considered" section

---

### H3: Fix Technical Debt (Dashboard Tests + ESM Issues)

**Problem**: 21 test failures block CI confidence; `require()` in ESM is fragile.

**Fixes required**:

#### Fix 1: Dashboard test `closeDashboardStores` crash

The test initializes stores without proper mocking. The issue is in
`tests/dashboard/server.test.ts` — the mock `stores` object doesn't include a `sessions`
property with a `close()` method.

```typescript
// tests/dashboard/server.test.ts — fix mock stores setup
const mockStores: DashboardStores = {
  sessions: { close: vi.fn() } as unknown as SessionsStore,
  metrics: { close: vi.fn() } as unknown as MetricsStore,
  traces: { close: vi.fn() } as unknown as TraceStore,
};
```

#### Fix 2: `require()` in `reviewer-runner.ts`

```typescript
// src/agents/reviewer-runner.ts — replace require() with dynamic import()
private async autoEnqueueApprovedBranches(): Promise<void> {
  const { MergeQueueStore } = await import('../merge/queue.js');
  const { SessionsStore } = await import('../stores/sessions.js');
  // ...
}
// Note: method must become async; call site must await
```

#### Fix 3: Doctor backend health check (known TODO stub)

Implement `swarm doctor` backend health check using the existing `HealthChecker` and
`createBackends()` registry factory, as specified in phase-0.5 Epic 0.5.5.

---

### H4: Data-Driven Model Routing

**Problem**: Model routing is static config; no feedback loop from actual performance data.

**Solution**: Swarm already collects per-model success rates in `metrics.db`. Use this data
to automatically adjust routing when a model's success rate falls below threshold.

```typescript
// src/backends/router.ts — add adaptive routing
class ModelRouter {
  async selectModel(role: AgentRole, taskComplexity: number): Promise<SelectedModel> {
    const config = this.config.backends.models[role];

    // NEW: Check recent success rate from metrics.db
    const primarySuccessRate = await this.metrics.getSuccessRate(
      config.primary.provider,
      config.primary.model,
      role,
      { windowDays: 7, minSamples: 5 }
    );

    if (primarySuccessRate !== null &&
        primarySuccessRate < this.config.backends.routing.quality_threshold) {
      this.logger.warn(
        `[Router] ${config.primary.model} success rate ${(primarySuccessRate * 100).toFixed(1)}% < ` +
        `threshold ${this.config.backends.routing.quality_threshold * 100}%. Falling back.`
      );
      return config.fallback;
    }

    // Existing: availability check + complexity routing
    // ...
  }
}
```

**Additional routing dimensions**:
- **Task complexity estimation**: Simple file-count heuristic → use cheap model; complex
  multi-module changes → escalate to better model automatically.
- **Time-of-day routing**: If local Ollama is slow (e.g., shared GPU under load), auto-route
  to cloud fallback.
- **Cost budget routing**: If session cost exceeds `budget.soft_limit_usd`, auto-downgrade
  models for remaining tasks.

**New config section**:

```yaml
# .swarm/config.yaml
backends:
  routing:
    enabled: true
    adaptive: true                  # NEW: enable data-driven routing
    quality_threshold: 0.80         # Min success rate before fallback
    min_samples: 5                  # Samples needed before adaptive routing
    window_days: 7                  # Look-back window for metrics

    # NEW: complexity-based escalation
    complexity_routing:
      enabled: true
      simple_threshold: 3           # <= 3 files → use scout-tier model
      complex_threshold: 10         # >= 10 files → use coordinator-tier model

    # NEW: cost budget routing
    budget:
      soft_limit_usd: 5.00          # Warn at $5
      hard_limit_usd: 20.00         # Force-downgrade at $20
```

---

### H5: Persistent Constraint Library

**Problem**: Each `swarm plan` run discovers constraints from scratch. Past discoveries are
lost when worktrees are cleaned. Teams rediscover the same constraints repeatedly.

**Solution**: Add a project-level constraint library that accumulates constraint patterns
across runs, enabling future scouts to short-circuit known constraint territory.

```
.swarm/
  constraint-library.db    # NEW: persistent cross-run constraint knowledge
```

**Schema**:
```sql
CREATE TABLE constraint_patterns (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,       -- 'external_dependency', 'api_contract', etc.
  pattern TEXT NOT NULL,        -- Human-readable description
  context TEXT,                 -- What files/modules trigger this constraint
  resolution TEXT,              -- How it was resolved last time
  frequency INTEGER DEFAULT 1,  -- How many times this pattern appeared
  last_seen TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE constraint_resolutions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  pattern_id TEXT REFERENCES constraint_patterns(id),
  decision TEXT NOT NULL,       -- What the human chose
  outcome TEXT,                 -- 'success' | 'partial' | 'failure'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Scout integration**: When a scout discovers a constraint, check the library first:

```
Scout: "Found: SessionStore lacks TTL support"
System: "Seen before (3x). Last resolution: added TTL to SessionStore. 
         Previous outcome: success. Want to use same approach? [Y/n]"
```

**Implementation scope**:
- New `src/stores/constraint-library.ts` (extends `BaseStore`)
- Modify `src/core/constraints.ts` to write to and read from library
- New `swarm constraints list` subcommand to query the library
- New `swarm constraints search <keyword>` for ad-hoc lookup

---

## 4. Medium-Priority Improvements (Next Half)

### M1: MCP Server Mode (`swarm serve`)

**Why**: AI coding tools (Cursor, Claude Desktop, Windsurf, Continue) support MCP (Model
Context Protocol). Exposing Swarm as an MCP server lets developers invoke it without leaving
their editor.

**Tools to expose via MCP**:

```typescript
// MCP Tools (src/mcp/server.ts)
const MCP_TOOLS = [
  {
    name: 'swarm_plan',
    description: 'Generate a multi-agent execution plan for a coding objective',
    inputSchema: {
      objective: { type: 'string' },
      fromIssue: { type: 'string', optional: true },
    }
  },
  {
    name: 'swarm_run',
    description: 'Execute an approved plan using parallel AI agents',
    inputSchema: {
      planId: { type: 'string', optional: true },
      maxConcurrent: { type: 'number', optional: true },
    }
  },
  {
    name: 'swarm_scout',
    description: 'Run constraint discovery on an objective (no execution)',
    inputSchema: {
      objective: { type: 'string' },
    }
  },
  {
    name: 'swarm_status',
    description: 'Get current agent fleet status',
    inputSchema: {},
  },
  {
    name: 'swarm_metrics',
    description: 'Get cost and quality metrics for recent runs',
    inputSchema: {
      period: { type: 'string', optional: true },  // '7d', '30d', 'all'
    }
  }
];
```

**New CLI command**: `swarm serve --mcp --port 3848`

**Cursor `.cursor/mcp.json` integration**:
```json
{
  "mcpServers": {
    "swarm": {
      "command": "swarm",
      "args": ["serve", "--mcp"],
      "env": {}
    }
  }
}
```

**Implementation scope**:
- New `src/mcp/server.ts` — MCP server implementation
- New `src/cli/serve.ts` — `swarm serve` command
- Update `src/cli/index.ts` to register `serve` command
- New `docs/mcp-integration.md` — Cursor/Claude integration guide

---

### M2: GitHub Integration (`swarm plan --from-pr`)

**Why**: 70% of constraints need cross-functional alignment. GitHub issues and PRs are where
product decisions live. Pulling context from PRs gives scouts much richer information.

```bash
# Plan from GitHub issue
swarm plan --from-issue https://github.com/org/repo/issues/123

# Plan from PR description  
swarm plan --from-pr https://github.com/org/repo/pull/456

# Plan from milestone
swarm plan --from-milestone "Q2 2026 - Auth Revamp"
```

**Context extraction from GitHub**:
- Issue body + comments → objective description
- PR review comments → discovered constraints (pre-filled!)
- Labels → complexity hints (`complexity:high`, `requires-migration`)
- Linked issues → dependency hints
- Author's PR description → often contains the "why" that scouts need

**Implementation scope**:
- New `src/integrations/github.ts` — GitHub API client (using `GITHUB_TOKEN` env var)
- Extend `src/cli/plan.ts` with `--from-issue` / `--from-pr` / `--from-milestone` flags
- Map GitHub issue body → scout objective + pre-seeded constraints
- Map PR review comments → constraint library entries

---

### M3: Session Replay & Debugging (`swarm replay`)

**Why**: When agents fail or produce wrong output, developers need to understand *why*. The
trace.db already captures all events; add a replay/debug CLI.

```bash
# Replay last failed session
swarm replay --last-failed

# Step through a session interactively
swarm replay <session-id> --interactive

# Generate diff at each agent action
swarm replay <session-id> --show-diffs

# Export replay as HTML for sharing
swarm replay <session-id> --export replay.html
```

**Implementation scope**:
- New `src/cli/replay.ts` — `swarm replay` command
- Extend `src/trace/store.ts` with session-level aggregation queries
- HTML export template for shareable replays

---

### M4: Multi-Model Consensus for Critical Decisions

**Why**: For high-stakes decisions (planning, architecture choices), using a single model
risks blind spots. Running the same prompt through 2-3 models and synthesizing responses
improves confidence.

```yaml
# .swarm/config.yaml
agents:
  consensus:
    enabled: true
    roles: [coordinator, reviewer]  # Roles where consensus applies
    models: 2                       # Number of models to consult
    agreement_threshold: 0.70       # Fraction that must agree
```

**Use cases**:
- **Plan quality check**: After generating a plan, run it through a second model to validate
  the task decomposition makes sense.
- **Conflict resolution**: When tier-3 AI resolution is triggered, get two models to
  independently resolve the conflict, then take the consensus.
- **Security review**: For security-related changes, get two independent reviewers.

**Implementation scope**:
- New `src/core/consensus.ts` — multi-model voting logic
- Extend `ModelRouter` with `selectConsensusModels(role, count)` method
- Integrate into `swarm plan` (optional plan validation) and `ConflictResolver` (tier-3)

---

### M5: Incremental Planning (Patch Plans)

**Why**: Real-world software changes are iterative. Currently, `swarm plan` generates a full
plan from scratch. Teams need to:
- Extend an in-progress plan with new tasks discovered mid-execution
- Create "patch plans" to fix specific failures without re-running everything
- Chain multiple plans (plan A's output becomes plan B's input)

```bash
# Extend current plan with additional scope
swarm plan --extend plan-001 "Also add rate limiting to the new endpoints"

# Create a patch plan to fix a failed task
swarm plan --fix task-003 "The JWT middleware needs to handle expired token refresh"

# Chain plans
swarm run --then "swarm plan 'Add tests for everything just built'"
```

**Implementation scope**:
- Extend `src/core/planner.ts` with `extendPlan()` and `patchPlan()` methods
- Extend `swarm plan` CLI with `--extend` and `--fix` flags
- `swarm run` `--then` flag for plan chaining

---

### M6: Cost Projection Dashboard

**Why**: The Bicameral research shows teams need *business-impact framing*. Cost projections
in dollar terms make the "local-first economics" story concrete and compelling for
engineering managers.

```
╭─────────────────────────────────────────────────────╮
│          Swarm Cost Projection                       │
│                                                      │
│  Task: "Refactor auth module to JWT"                 │
│                                                      │
│  If you use Swarm (local models):                    │
│    Estimated cost:        $0.42                      │
│    Estimated time:        45 minutes                 │
│                                                      │
│  If a human developer does this:                     │
│    Estimated time:        4-6 hours                  │
│    Estimated cost:        $400-600 (at $100/hr)      │
│                                                      │
│  If you use Cursor/Claude directly:                  │
│    Estimated API cost:    $8-15                      │
│    Estimated time:        2-3 hours (back-and-forth) │
│                                                      │
│  Swarm savings vs Claude-direct:  95.2%              │
│  Swarm savings vs human dev:      99.9%              │
╰─────────────────────────────────────────────────────╯
```

**Implementation scope**:
- Extend `src/core/planner.ts` with human-equivalent cost estimation
- New dashboard panel `src/dashboard/projections.ts`
- New `swarm metrics --projection` flag

---

## 5. Long-Term Vision (6–12 Months)

### V1: Self-Improving Agent Prompts

**Concept**: Use `bench` data to automatically refine agent prompts. If the
`add-auth-middleware` benchmark consistently fails at the "JWT validation logic" step,
the builder overlay template should be automatically updated to add clearer instructions
for that pattern.

**How it works**:
1. Run `swarm bench run --suite core --repeat 10`
2. Analyze which prompt sections correlate with failures
3. Generate prompt improvement suggestions via LLM
4. A/B test prompt variants via the bench framework
5. Promote winning variants to production templates

**Implementation scope**: New `src/bench/prompt-optimizer.ts`

---

### V2: Team-Level Constraint Intelligence

**Concept**: Aggregate constraint patterns across an entire engineering team, creating
organizational knowledge about common pitfalls, architectural decisions, and tech debt.

**Architecture**:
```
Developer A runs swarm → constraints stored locally
                        ↓
                  Sync to team hub (optional)
                        ↓
Developer B runs swarm → pre-seeded with team constraint library
                        "We've seen this before 12 times across the team..."
```

**Implementation scope**:
- New `src/stores/team-hub.ts` — optional remote constraint sync
- Support sync backends: S3, GitHub Gist, self-hosted HTTP
- Privacy controls: opt-in per constraint category

---

### V3: Proactive Tech Debt Surfacing

**Concept**: Add a `swarm audit` command that runs scouts across the entire codebase (not
a specific objective) looking for:
- Patterns that commonly cause constraint collisions in future work
- Code areas with high "constraint density" (many past constraints in same files)
- Architectural debt that will block upcoming roadmap items

```bash
# Audit against upcoming roadmap
swarm audit --roadmap roadmap.md

# Audit a specific directory
swarm audit src/auth/

# Audit before a major release
swarm audit --release v2.0
```

This is the ultimate realization of the Bicameral insight: instead of discovering constraints
*when work starts*, discover them *proactively* against known future intentions.

---

### V4: Language-Agnostic Agent Overlays

**Concept**: Current agent overlays are TypeScript/Node.js centric. Extend the convention
parser and overlay generator to support Python, Go, Rust, Java, and other language ecosystems
detected from the project's build files.

**Detection signals**:
- `package.json` → TypeScript/JavaScript
- `pyproject.toml` / `setup.py` / `requirements.txt` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `pom.xml` / `build.gradle` → Java/Kotlin
- `Makefile` → Generic build system

**Implementation scope**: Extend `src/core/conventions.ts` with language-specific parsers
and new overlay templates in `templates/`.

---

### V5: Async Human-in-the-Loop via Slack/Email

**Concept**: The current `swarm run` requires a terminal session. For overnight runs or
long-running agents, add async human approval via Slack or email.

```yaml
# .swarm/config.yaml
team:
  async_approval:
    enabled: true
    channels:
      slack: ${SLACK_WEBHOOK_URL}
      email: ${APPROVAL_EMAIL}
    timeout_hours: 8       # How long to wait before auto-escalating
    auto_approve_low_risk: true   # Skip approval for low-risk constraint decisions
```

**Flow**: When a constraint requires human decision and no terminal session is attached:
1. Send Slack/email notification with the constraint summary and options
2. Human replies with option number
3. Swarm continues execution with the chosen option
4. Completion notification sent when done

---

## 6. Technical Debt to Address Now

These issues should be fixed before new features are built, as they undermine reliability:

### TD1: Fix Dashboard Test Failures (21 tests)

**Root cause**: `tests/dashboard/server.test.ts` creates an incomplete mock `stores` object
that doesn't include all required properties.

**Fix**: Update test setup to properly mock `DashboardStores` interface with all three
store mocks (sessions, metrics, traces) each having a `close()` method.

**Files**: `tests/dashboard/server.test.ts`

---

### TD2: Convert `require()` to `import()` in reviewer-runner.ts

**Root cause**: `src/agents/reviewer-runner.ts:319–330` uses CommonJS `require()` in an
ESM module. This works in Node.js due to interop, but is a code smell and will break in
strict ESM environments.

**Fix**: Convert `autoEnqueueApprovedBranches` to `async` and use dynamic `import()`.

**Files**: `src/agents/reviewer-runner.ts`

---

### TD3: Complete Doctor Backend Health Check

**Root cause**: `src/cli/doctor.ts:143–146` has a `TODO` comment instead of actual backend
health checking.

**Fix**: Call `createBackends(config)` and `HealthChecker.check(backends)` and display
results using `HealthChecker.formatReport()`.

**Files**: `src/cli/doctor.ts`

---

### TD4: Add `--agent-run` Subcommand Integration Tests

**Root cause**: `src/cli/agent-run.ts` exists (used for spawned agent execution) but has
no dedicated tests. This is the hottest code path — if it breaks, all agents fail silently.

**Fix**: Add integration tests for `agent-run` with mocked backends and file systems.

**Files**: New `tests/cli/agent-run.test.ts`

---

### TD5: Migrations Version Consistency

**Root cause**: `src/stores/migrations.ts` was recently modified. Verify that all SQLite
stores (sessions, mail, trace, metrics, merge, bench) have consistent migration version
tracking and that `runMigrations()` is idempotent.

**Fix**: Add a migration smoke test that applies all migrations to a fresh in-memory SQLite
database and verifies the final schema.

**Files**: New `tests/stores/migrations.test.ts`

---

## 7. Revised Priority Roadmap

### Sprint 1 (Week 1–2): Stability
1. **TD1** — Fix 21 dashboard test failures
2. **TD2** — Convert `require()` to `import()` in reviewer-runner.ts
3. **TD3** — Complete doctor backend health check
4. **TD5** — Migration smoke test
5. **H3** — Address remaining linter warnings

### Sprint 2 (Week 3–4): Core Value Amplification
1. **H1** — Pre-sprint scout mode (`swarm scout` command)
2. **H4** — Data-driven adaptive model routing
3. **H5** — Persistent constraint library (schema + basic read/write)

### Sprint 3 (Month 2): Strategic Differentiators
1. **H2** — Adversarial planning phase
2. **M1** — MCP server mode (`swarm serve --mcp`)
3. **M2** — GitHub issue/PR integration

### Sprint 4 (Month 3): Team & Scale
1. **M4** — Multi-model consensus for critical decisions
2. **M5** — Incremental/patch plans
3. **M6** — Cost projection dashboard
4. **M3** — Session replay debugging

### Quarter 2+: Vision Features
- **V1** — Self-improving agent prompts (bench-driven)
- **V2** — Team-level constraint intelligence
- **V3** — Proactive tech debt surfacing (`swarm audit`)
- **V4** — Language-agnostic overlays (Python, Go, Rust)
- **V5** — Async human-in-the-loop (Slack/email approvals)

---

## 8. Success Metrics (Revised)

Building on the original success metrics, add these to measure the improvements above:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Constraint pre-discovery rate** | >60% caught pre-sprint | Compare constraints in scout report vs. discovered mid-implementation |
| **Constraint library hit rate** | >30% of constraints match library | % of new constraints that have a library match |
| **Adaptive routing savings** | >15% cost reduction vs. static routing | Compare static vs. adaptive routing on bench suite |
| **PM artifact adoption** | >50% of scouts generate stakeholder report | Measured from `swarm scout` invocations |
| **MCP tool invocations** | Track post-launch | Once MCP server is live |
| **Test pass rate** | 100% (currently 96.7%) | Fix 21 failing dashboard tests |
| **Model routing accuracy** | Success rate improves to >90% | After adaptive routing enabled |

---

## 9. Design Principles Additions

The original 14 principles hold. Add these two based on Bicameral learnings:

| # | Principle | Design Implication |
|---|---|---|
| 15 | **Upstream > Downstream Discovery** | Every constraint discovered before sprint planning is worth 10x a constraint discovered during implementation. Invest in pre-meeting scout tooling. |
| 16 | **Cross-Functional Artifacts** | Every technical finding must have a PM-readable translation. Constraints that can't be communicated to stakeholders are constraints that won't get addressed. |

---

## References

- [Bicameral AI: "The Tech Debt Meeting"](https://www.bicameral-ai.com/blog/tech-debt-meeting)
  — Source of the 50% constraint discovery statistic and cross-functional alignment research
- [Atlassian Developer Experience Report 2025](https://www.atlassian.com/blog/developer/developer-experience-report-2025)
  — AI adoption leads to equal time increase in review/rework tasks
- [Cursor: Self-Driving Codebases](https://cursor.com/blog/self-driving-codebases)
  — Planning phase requires human judgment; autonomous agents fail without holistic intent
- [plan-phases-0-9.md](./plan-phases-0-9.md) — Original Swarm implementation plan
- [docs/epics/](../../epics/) — Epic stories index and active epics
- [AGENTS.md](../../../AGENTS.md) — Project conventions and current architecture state
