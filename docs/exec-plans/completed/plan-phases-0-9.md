# Swarm: OpenCode Agent Swarm CLI - Implementation Plan

## 1. Problem Statement

Current AI coding assistants face three fundamental bottlenecks:

1. **Expensive Model Dependency**: Complex tasks consume massive context windows on costly models (Opus/GPT-4), while most sub-tasks only require mid-tier reasoning.
2. **Context Window Saturation**: Single-agent sessions accumulate irrelevant context, degrading output quality as conversations grow.
3. **Constraint Discovery Gap**: 50% of technical constraints are discovered only during implementation (Bicameral AI research). A single agent cannot simultaneously explore, plan, build, and validate without losing coherence.

**Swarm** solves this by decomposing work: a Main Agent (orchestrator) reads project conventions, plans execution, then spawns Sub-Agents via tmux to execute independent tasks in parallel. Each Sub-Agent operates in a narrow, focused context window. Results converge back through a structured protocol.

---

## 2. Core Principles (12 + 1)

All design decisions are evaluated against these principles:

| # | Principle | Design Implication |
|---|---|---|
| 1 | **Scale Out, Not Up** | Prefer more cheap-model agents over one expensive-model agent |
| 2 | **SSOT (Single Source of Truth)** | SQLite DB as single communication bus; AGENTS.md as single convention source |
| 3 | **Boundaries > Capabilities** | Each agent has explicit file scope, tool whitelist, and role constraints |
| 4 | **Trace Everything** | Every agent action, message, and state transition logged to structured trace |
| 5 | **Swappable Brains** | Model selection per-agent-role via config; no hardcoded model assumptions |
| 6 | **Sharp In, Sharp Out** | Precise task specs in, structured deliverables out; no ambiguous handoffs |
| 7 | **Right-Size Tasks** | Tasks decomposed to 1-3 file scope; too small wastes overhead, too large wastes context |
| 8 | **No Overlapping Writes** | File scopes are strictly non-overlapping; enforced at dispatch time |
| 9 | **Lead Coordinates Only** | Main Agent never writes code; it only plans, dispatches, and validates |
| 10 | **Plan Before Execute** | Mandatory planning phase with human review before any agent spawning |
| 11 | **Peer-to-Peer** | Sub-Agents exchange deliverables (specs, results) via mail, not through orchestrator relay |
| 12 | **Adversarial Validation** | Every build artifact is reviewed by a separate reviewer agent before merge |
| 13 | **Local-First Economics** | Default to local/open-source models; use paid APIs only when local quality is insufficient |
| 14 | **Measure Before Optimize** | Track model performance per task type to inform routing decisions |
| +1 | **Ask, Don't Guess** | Agents return "needs clarification" rather than fabricating assumptions |

---

## 3. Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              Human Developer             │
                    │            (Swarm CLI Session)           │
                    └──────────────┬──────────────────────────┘
                                   │ swarm plan / swarm run
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │           Main Agent (Orchestrator)       │
                    │                                           │
                    │  1. Read AGENTS.md / Rules / Commands     │
                    │  2. Analyze task → Execution Plan         │
                    │  3. Validate constraints (Bicameral)      │
                    │  4. Human confirms plan + constraints     │
                    │  5. Dispatch Sub-Agents via tmux          │
                    │  6. Monitor progress (watchdog)           │
                    │  7. Collect results & merge               │
                    └──┬───────┬───────┬───────┬──────────────┘
                       │       │       │       │
                  tmux sessions (isolated agent instances)
                       │       │       │       │
                ┌──────▼──┐ ┌──▼─────┐ ┌▼──────┐ ┌▼────────┐
                │  Scout   │ │Builder │ │Builder│ │Reviewer  │
                │ (explore)│ │ (impl) │ │(impl) │ │(validate)│
                │ read-only│ │ write  │ │write  │ │read-only │
                │ qwen:7b  │ │qwen:32b│ │qwen:32b│ │deepseek  │
                └──────────┘ └────────┘ └───────┘ └──────────┘
                       │       │       │       │
                       └───────┴───┬───┴───────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │     Backend Abstraction      │
                    │  ┌─────────────────────────┐ │
                    │  │  Ollama (local, free)   │ │  ← Primary
                    │  │  vLLM  (local, fast)    │ │
                    │  │  LMStudio (local, GUI)  │ │
                    │  │  OpenAI API (fallback)  │ │  ← Fallback
                    │  │  Anthropic (fallback)   │ │
                    │  └─────────────────────────┘ │
                    └──────────────┬──────────────┘
                                   │ SQLite Stores
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │         .swarm/ (Project State)           │
                    │                                           │
                    │  mail.db      - Agent messaging           │
                    │  sessions.db  - Agent lifecycle           │
                    │  trace.db     - Full action trace         │
                    │  metrics.db   - Model performance data    │
                    │  config.yaml  - Project configuration     │
                    │  plans/       - Execution plans           │
                    │  specs/       - Task specifications       │
                    │  constraints/ - Discovered constraints    │
                    │  reports/     - Agent deliverables        │
                    │  dashboards/  - Team visibility (HTML)    │
                    └─────────────────────────────────────────┘
```

### Key Architectural Decisions

**Why Backend Abstraction instead of OpenCode-only?**
- OpenCode's headless/API capabilities are unverified (see Open Questions)
- Direct API access to Ollama/vLLM gives us full control over model routing
- Principle #13 (Local-First Economics) requires multiple backend support
- If OpenCode works well, use it; if not, seamlessly fall back to direct API
- Enables true "Swappable Brains" (Principle #5) across providers

**Why Local LLMs First?**
- Open-source models (Qwen2.5-Coder, DeepSeek-Coder) now match GPT-4 on coding tasks
- Zero marginal cost enables aggressive parallelization (10+ scouts for pennies)
- Privacy: code never leaves your infrastructure
- Latency: local inference often faster than API round-trips
- Team can run unlimited experiments during development

**Why tmux?**
- Battle-tested process isolation without container overhead
- Human can `tmux attach` to observe any agent in real-time
- Named sessions enable deterministic lifecycle management
- No daemon needed; the shell IS the runtime

**Why SQLite over file-based messaging?**
- WAL mode enables safe concurrent writes from parallel agents
- Structured queries for filtering, threading, priority
- Single file = easy backup, easy cleanup
- Sub-millisecond reads; no polling filesystem overhead

**Why git worktrees?**
- True file isolation (Principle #8: No Overlapping Writes)
- Standard git merge tooling for convergence
- Each agent has its own working directory; no lock contention
- Clean rollback via branch deletion

---

## 4. Agent Role Definitions

### 4.1 Coordinator (Main Agent)

**Model tier**: High (handles complex planning)
**Capabilities**: Read-only filesystem, spawn agents, send/receive mail, manage plans
**Cannot**: Write code, modify files, run tests directly

Responsibilities:
- Parse project conventions from AGENTS.md, .opencode/ rules, commands, sub-agent definitions
- Decompose user objective into a dependency-aware task graph
- Assign file scopes (non-overlapping) to each task
- Select model tier per task based on complexity estimation
- Dispatch leads via `swarm sling`
- Monitor via watchdog; handle escalations
- Trigger merge after all agents report `done`

### 4.2 Scout

**Model tier**: Low (exploration doesn't need heavy reasoning)
**Capabilities**: Read-only filesystem, glob, grep, web search
**Cannot**: Write files, spawn agents

Responsibilities:
- Deep-dive codebase exploration for a specific question
- Map dependencies, call chains, type hierarchies
- Produce structured findings report (JSON + markdown)
- Identify constraints and blockers before implementation begins

### 4.3 Builder

**Model tier**: Mid (code generation needs balanced capability)
**Capabilities**: Read/write within assigned file scope, run tests, lint
**Cannot**: Write outside file scope, spawn agents, modify git history

Responsibilities:
- Implement specific, well-scoped task from spec
- Follow project conventions from AGENTS.md
- Run tests and lint within scope
- Report completion with files modified list

### 4.4 Reviewer

**Model tier**: Mid (needs to understand code deeply but not generate)
**Capabilities**: Read-only filesystem, run tests, run lint/typecheck
**Cannot**: Write files, spawn agents

Responsibilities:
- Validate builder output against task spec
- Check for security vulnerabilities (OWASP top 10)
- Verify convention compliance
- Run test suite and report results
- Produce structured review (pass/fail with findings)

### 4.5 Merger

**Model tier**: Mid (conflict resolution needs understanding)
**Capabilities**: Read/write, git operations (merge, rebase)
**Cannot**: Spawn agents

Responsibilities:
- Merge agent branches back to main working branch
- Resolve conflicts using tiered strategy (auto -> AI -> escalate)
- Verify merged code compiles and passes tests

---

## 5. Project Structure

```
swarm/
├── package.json              # npm package definition
├── tsconfig.json             # TypeScript strict config
├── biome.json                # Linter + formatter
├── src/
│   ├── index.ts              # CLI entry point (command router)
│   ├── types.ts              # All shared types and interfaces
│   ├── errors.ts             # Custom error hierarchy
│   ├── constants.ts          # Shared constants
│   │
│   ├── cli/                  # CLI command definitions
│   │   ├── init.ts           # swarm init - scaffold .swarm/ in target project
│   │   ├── plan.ts           # swarm plan - generate execution plan from objective
│   │   ├── run.ts            # swarm run - execute approved plan
│   │   ├── sling.ts          # swarm sling - spawn individual agent
│   │   ├── status.ts         # swarm status - show agent fleet status
│   │   ├── mail.ts           # swarm mail - messaging operations
│   │   ├── merge.ts          # swarm merge - merge agent branches
│   │   ├── inspect.ts        # swarm inspect - view agent session
│   │   ├── trace.ts          # swarm trace - query action trace
│   │   ├── clean.ts          # swarm clean - teardown agents and worktrees
│   │   ├── doctor.ts         # swarm doctor - check prerequisites
│   │   ├── config.ts         # swarm config - manage configuration
│   │   ├── dashboard.ts      # swarm dashboard - launch web dashboard
│   │   ├── metrics.ts        # swarm metrics - show cost/token/quality metrics
│   │   └── report.ts         # swarm report - generate team reports
│   │
│   ├── core/                 # Core orchestration logic
│   │   ├── planner.ts        # Task decomposition engine
│   │   ├── dispatcher.ts     # Agent dispatch (file scope validation, model selection)
│   │   ├── watchdog.ts       # Health monitoring with progressive nudging
│   │   ├── convergence.ts    # Result collection and merge orchestration
│   │   ├── conventions.ts    # AGENTS.md / Rules / Commands parser
│   │   └── constraints.ts    # Constraint validation engine (Bicameral)
│   │
│   ├── agents/               # Agent lifecycle management
│   │   ├── spawner.ts        # tmux session creation with AI backend
│   │   ├── overlay.ts        # Per-task AGENTS.md generation
│   │   ├── manifest.ts       # Agent role definitions and constraints
│   │   └── lifecycle.ts      # Start, monitor, stop, cleanup
│   │
│   ├── backends/             # AI Backend Abstraction (NEW)
│   │   ├── interface.ts      # Abstract backend interface
│   │   ├── router.ts         # Dynamic model routing based on task/metrics
│   │   ├── ollama.ts         # Ollama backend (local, free)
│   │   ├── vllm.ts           # vLLM backend (local, fast)
│   │   ├── lmstudio.ts       # LM Studio backend (local, GUI)
│   │   ├── openai.ts         # OpenAI API backend
│   │   ├── anthropic.ts      # Anthropic API backend
│   │   ├── opencode.ts       # OpenCode wrapper (if viable)
│   │   └── health.ts         # Backend health checking
│   │
│   ├── isolation/            # Execution isolation
│   │   ├── worktree.ts       # Git worktree management
│   │   └── tmux.ts           # tmux session operations
│   │
│   ├── messaging/            # Inter-agent communication
│   │   ├── store.ts          # SQLite mail store (WAL mode)
│   │   ├── client.ts         # Send/receive/query API
│   │   ├── broadcast.ts      # Group addressing (@all, @builders, etc.)
│   │   └── types.ts          # Message types and payloads
│   │
│   ├── trace/                # Observability
│   │   ├── store.ts          # SQLite trace store
│   │   ├── recorder.ts       # Action recording middleware
│   │   └── reporter.ts       # Trace analysis and display
│   │
│   ├── metrics/              # Performance & Cost Tracking (NEW)
│   │   ├── store.ts          # SQLite metrics store
│   │   ├── collector.ts      # Token/latency/quality collection
│   │   ├── cost.ts           # Cost calculation per model/provider
│   │   ├── quality.ts        # Success/failure rate tracking
│   │   └── aggregator.ts     # Team-level metrics aggregation
│   │
│   ├── dashboard/            # Team Visibility (NEW)
│   │   ├── server.ts         # Local HTTP server for dashboards
│   │   ├── templates/        # HTML/CSS templates
│   │   │   ├── cost.html     # Real-time cost tracking
│   │   │   ├── fleet.html    # Live agent status
│   │   │   ├── quality.html  # Success/failure rates
│   │   │   └── models.html   # Model performance comparison
│   │   └── api.ts            # Dashboard data API endpoints
│   │
│   ├── merge/                # Branch merging
│   │   ├── queue.ts          # FIFO merge queue
│   │   └── resolver.ts       # Tiered conflict resolution
│   │
│   ├── config/               # Configuration management
│   │   ├── loader.ts         # YAML config loading with defaults
│   │   ├── schema.ts         # Config validation
│   │   └── defaults.ts       # Default configuration values
│   │
│   └── utils/                # Shared utilities
│       ├── logger.ts         # Structured logging
│       ├── process.ts        # Process tree management
│       ├── git.ts            # Git operations wrapper
│       └── fs.ts             # Filesystem helpers
│
├── agents/                   # Base agent role definitions (.md files)
│   ├── coordinator.md
│   ├── scout.md
│   ├── builder.md
│   ├── reviewer.md
│   └── merger.md
│
├── templates/                # Templates for generated files
│   ├── agents.md.tmpl        # AGENTS.md overlay template
│   ├── plan.md.tmpl          # Execution plan template
│   ├── spec.md.tmpl          # Task specification template
│   └── constraints.md.tmpl   # Constraint report template (NEW)
│
└── tests/                    # Test files (colocated pattern)
    ├── core/
    ├── agents/
    ├── backends/             # Backend integration tests
    ├── messaging/
    ├── metrics/
    └── e2e/
```

### Target Project Structure (after `swarm init`)

```
target-project/
├── .swarm/
│   ├── config.yaml           # Swarm configuration
│   ├── agent-manifest.json   # Agent roles and model assignments
│   ├── mail.db               # SQLite messaging (WAL mode)
│   ├── sessions.db           # Agent session tracking
│   ├── trace.db              # Full action trace
│   ├── metrics.db            # Model performance metrics (NEW)
│   ├── plans/                # Generated execution plans
│   │   └── {plan-id}.md
│   ├── specs/                # Task specifications
│   │   └── {task-id}.md
│   ├── constraints/          # Discovered constraints (NEW)
│   │   └── {plan-id}.json
│   ├── reports/              # Agent deliverables
│   │   └── {agent}/{task-id}.md
│   ├── dashboards/           # Generated dashboards (NEW)
│   │   ├── index.html
│   │   └── assets/
│   ├── worktrees/            # Git worktrees (gitignored)
│   │   └── {agent-name}/
│   └── logs/                 # Agent logs (gitignored)
│       └── {agent-name}/
├── AGENTS.md                 # Project conventions (existing, read by swarm)
└── ...
```

---

## 6. CLI Commands

### 6.1 `swarm init`

Scaffold `.swarm/` directory in target project. Detect and parse existing AGENTS.md.

```bash
swarm init [--config path/to/config.yaml]
```

Steps:
1. Check prerequisites (`tmux`, `opencode`, `git`)
2. Create `.swarm/` directory structure
3. Initialize SQLite databases
4. Generate default `config.yaml` with detected project settings
5. Parse existing AGENTS.md and populate agent-manifest.json
6. Add `.swarm/worktrees/`, `.swarm/logs/` to `.gitignore`

### 6.2 `swarm plan <objective>`

Generate an execution plan from a natural language objective.

```bash
swarm plan "Refactor the auth module to use JWT tokens instead of session cookies"
swarm plan --from-issue 42
swarm plan --from-file requirements.md
```

Steps:
1. Read AGENTS.md, project conventions, relevant source files
2. Spawn a Scout agent to explore the codebase (narrow context)
3. Main Agent synthesizes scout findings into a task graph
4. Validate: non-overlapping file scopes, dependency ordering, model tier assignment
5. Output plan as structured markdown for human review
6. **Pause for human approval** (Principle #10: Plan Before Execute)

Plan output format:
```markdown
# Execution Plan: {objective}

## Scout Findings
- {key finding 1}
- {key finding 2}

## Task Graph
### Task 1: {description}
- Agent: builder
- Model: mid-tier
- File scope: src/auth/jwt.ts, src/auth/types.ts
- Depends on: none
- Spec: .swarm/specs/task-001.md

### Task 2: {description}
- Agent: builder
- Model: mid-tier
- File scope: src/middleware/auth.ts
- Depends on: Task 1
- Spec: .swarm/specs/task-002.md

### Task 3: {description}
- Agent: reviewer
- Model: mid-tier
- File scope: (all modified files)
- Depends on: Task 1, Task 2

## Model Cost Estimate
- Scouts: 2 x low-tier ≈ $0.30
- Builders: 2 x mid-tier ≈ $2.00
- Reviewer: 1 x mid-tier ≈ $0.80
- Total estimate: ~$3.10
```

### 6.3 `swarm run [plan-id]`

Execute an approved plan.

```bash
swarm run                    # Run latest plan
swarm run plan-20240301-001  # Run specific plan
swarm run --dry-run          # Show what would happen
swarm run --max-concurrent 3 # Limit parallel agents
```

Steps:
1. Load approved plan
2. Create git worktrees for each agent
3. Generate per-agent AGENTS.md overlays
4. Dispatch agents in dependency order via tmux
5. Enter watchdog loop: monitor health, handle mail, process escalations
6. On all tasks complete: trigger merge pipeline
7. Report final results

### 6.4 `swarm sling <role> [options]`

Spawn a single agent (used internally by `swarm run`, also available for manual use).

```bash
swarm sling scout --task "Map all usages of SessionStore"
swarm sling builder --task-id task-001 --scope "src/auth/*.ts"
swarm sling reviewer --task-id task-001 --branch agent/builder-task-001
```

### 6.5 `swarm status`

Show fleet status.

```bash
swarm status              # Summary view
swarm status --watch      # Live updating
swarm status --json       # Machine-readable
```

Output:
```
Agent Fleet Status
──────────────────────────────────────
scout-001     exploring    2m 13s    src/auth/
builder-001   building     5m 42s    src/auth/jwt.ts
builder-002   waiting      0m 00s    (depends on builder-001)
reviewer-001  idle         -         -
──────────────────────────────────────
Mail: 3 unread | Trace: 147 events | Errors: 0
```

### 6.6 `swarm mail`

Interact with the agent messaging system.

```bash
swarm mail list              # List messages
swarm mail check             # Check for new messages
swarm mail send <to> <msg>   # Send message to agent
swarm mail read <id>         # Read specific message
```

### 6.7 `swarm merge`

Merge agent branches.

```bash
swarm merge --all            # Merge all completed branches
swarm merge --branch <name>  # Merge specific branch
swarm merge --dry-run        # Show merge preview
```

### 6.8 `swarm inspect <agent>`

View agent session details.

```bash
swarm inspect scout-001          # Show agent details
swarm inspect scout-001 --attach # Attach to tmux session
swarm inspect scout-001 --log    # Show agent log
```

### 6.9 `swarm trace`

Query the action trace.

```bash
swarm trace                      # Show recent trace
swarm trace --agent builder-001  # Filter by agent
swarm trace --type error         # Filter by type
swarm trace --since 5m           # Time filter
```

### 6.10 `swarm clean`

Tear down agents and clean up.

```bash
swarm clean                  # Clean current session
swarm clean --all            # Clean everything
swarm clean --worktrees      # Clean only worktrees
```

### 6.11 `swarm doctor`

Verify prerequisites and health.

```bash
swarm doctor
```

Output:
```
Swarm Doctor
────────────────────
[OK] tmux 3.4 found
[OK] git 2.43.0 found
[OK] node 20.11.0 found
[OK] .swarm/ directory exists
[OK] AGENTS.md found (47 rules parsed)

Backend Health:
[OK] ollama: http://localhost:11434 (qwen2.5-coder:32b, qwen2.5-coder:7b)
[--] vllm: disabled in config
[--] lmstudio: disabled in config
[OK] anthropic: API key configured (fallback)
[WARN] openai: API key not set (fallback unavailable)
```

### 6.12 `swarm dashboard` (NEW)

Launch local web dashboard for team visibility.

```bash
swarm dashboard              # Launch dashboard on default port
swarm dashboard --port 8080  # Custom port
swarm dashboard --no-open    # Don't auto-open browser
```

Output:
```
Dashboard running at http://localhost:3847
  - Fleet Status:  /fleet
  - Cost Tracking: /cost
  - Model Metrics: /models
  - Quality Stats: /quality

Press Ctrl+C to stop
```

### 6.13 `swarm metrics` (NEW)

Show cost, token, and quality metrics.

```bash
swarm metrics                    # Summary for current session
swarm metrics --all              # All-time metrics
swarm metrics --model ollama:qwen2.5-coder:32b  # Filter by model
swarm metrics --role builder     # Filter by agent role
swarm metrics --since 7d         # Last 7 days
swarm metrics --format json      # Machine-readable
```

Output:
```
Swarm Metrics (Last 7 Days)
────────────────────────────────────────────────────
Model                          Tokens      Cost    Success
────────────────────────────────────────────────────
ollama:qwen2.5-coder:32b       1,234,567   $0.00    94.2%
ollama:qwen2.5-coder:7b          456,789   $0.00    87.1%
anthropic:claude-sonnet-4-20250514        45,678  $13.70    98.4%
────────────────────────────────────────────────────
Total                          1,737,034  $13.70    92.8%

Cost Savings vs All-API: $521.11 (97.4% reduction)
```

### 6.14 `swarm report` (NEW)

Generate team reports.

```bash
swarm report                     # Generate weekly report
swarm report --period monthly    # Monthly report
swarm report --output report.md  # Save to file
swarm report --slack             # Send to Slack webhook
```

Output generates a markdown report with:
- Tasks completed / in-progress / failed
- Cost breakdown by model and role
- Quality metrics (success rates, review pass rates)
- Constraint discovery statistics
- Recommendations for model routing optimization

---

## 7. Core Workflows

### 7.1 Planning Workflow

```
Human: "swarm plan 'Add rate limiting to all API endpoints'"
  │
  ├─ 1. Coordinator reads AGENTS.md, parses conventions
  │     - Coding standards, test patterns, directory structure
  │     - Existing rules and commands
  │
  ├─ 2. Coordinator spawns Scout (low-tier model)
  │     Scout explores:
  │     - All API endpoint files (glob + grep)
  │     - Existing middleware patterns
  │     - Rate limiting libraries in package.json
  │     - Test patterns for middleware
  │     Scout reports: structured findings via mail
  │
  ├─ 3. Coordinator synthesizes findings into task graph
  │     - Identifies independent file scopes
  │     - Determines dependency order
  │     - Assigns model tiers
  │     - Estimates cost
  │
  ├─ 4. Plan written to .swarm/plans/{id}.md
  │
  └─ 5. Human reviews and approves (or modifies)
```

### 7.2 Execution Workflow

```
Human: "swarm run"
  │
  ├─ 1. Load approved plan
  │
  ├─ 2. Phase: Independent Tasks (parallel)
  │     ├─ Create worktree: agent/builder-001
  │     ├─ Create worktree: agent/builder-002
  │     ├─ Generate AGENTS.md overlay per worktree
  │     ├─ Spawn builder-001 in tmux (mid-tier model)
  │     └─ Spawn builder-002 in tmux (mid-tier model)
  │
  ├─ 3. Watchdog Loop
  │     ├─ Check agent health (tmux session alive?)
  │     ├─ Process mail (status updates, questions, escalations)
  │     ├─ Handle "needs clarification" → ask human
  │     ├─ Handle errors → retry or reassign
  │     └─ Track progress against plan
  │
  ├─ 4. Phase: Dependent Tasks (after predecessors complete)
  │     └─ Spawn next batch based on dependency graph
  │
  ├─ 5. Phase: Review
  │     ├─ Spawn reviewer-001 (mid-tier model)
  │     └─ Reviewer validates all builder outputs
  │
  ├─ 6. Phase: Merge
  │     ├─ Tier 1: git merge --no-edit (fast-forward if possible)
  │     ├─ Tier 2: Auto-resolve (keep incoming)
  │     ├─ Tier 3: AI-resolve (spawn merger agent)
  │     └─ Tier 4: Escalate to human
  │
  └─ 7. Report: summary of changes, cost, trace
```

### 7.3 Constraint Discovery Workflow (Bicameral Insight)

This is the key differentiator. Sub-Agents don't just execute — they **discover constraints** that a single agent session would miss:

```
Scout discovers:
  "The auth middleware uses a custom session store that
   doesn't support TTL. Rate limiting with sliding window
   requires TTL support."

Scout reports via mail:
  type: "escalation"
  severity: "warning"
  body: "SessionStore lacks TTL. Options: (a) add TTL to
         SessionStore, (b) use Redis for rate limit state,
         (c) use in-memory with periodic cleanup"

Coordinator surfaces to human:
  "Scout found a constraint: SessionStore doesn't support TTL.
   Three options identified. Which approach should builders use?"

Human decides → plan updated → builders proceed with clarity
```

This turns the Bicameral insight ("50% of constraints are discovered during implementation") into a design advantage: scouts discover constraints cheaply BEFORE builders start, preventing wasted expensive-model tokens on wrong approaches.

### 7.4 Constraint Validation Workflow (NEW - Systematic Bicameral Integration)

The 50% constraint discovery problem requires a systematic approach, not just ad-hoc scout findings.

```
Scout Phase Output:
  │
  ├─ 1. Scout produces structured constraints.json:
  │     {
  │       "plan_id": "plan-20240301-001",
  │       "discovered_at": "2024-03-01T10:30:00Z",
  │       "constraints": [
  │         {
  │           "id": "c001",
  │           "category": "external_dependency",
  │           "severity": "blocking",
  │           "description": "SessionStore lacks TTL support",
  │           "affected_files": ["src/auth/session.ts"],
  │           "options": [
  │             "Add TTL to SessionStore (2 files)",
  │             "Use Redis for rate limit state (new dep)",
  │             "In-memory with periodic cleanup (perf risk)"
  │           ],
  │           "recommendation": "option_1",
  │           "requires_human_decision": true
  │         },
  │         {
  │           "id": "c002",
  │           "category": "api_contract",
  │           "severity": "warning",
  │           "description": "Auth middleware expects sync SessionStore.get()",
  │           "affected_files": ["src/middleware/auth.ts"],
  │           "impact": "Must maintain sync interface or refactor 12 callers",
  │           "requires_human_decision": false
  │         }
  │       ]
  │     }
  │
  ├─ 2. Coordinator validates constraints against plan:
  │     - Are all "blocking" constraints addressable?
  │     - Do any constraints conflict with each other?
  │     - Are file scopes still non-overlapping after constraint resolution?
  │     - Update cost estimate based on constraint-driven scope changes
  │
  ├─ 3. Human reviews constraint summary:
  │     ┌────────────────────────────────────────────┐
  │     │  Constraint Review: plan-20240301-001      │
  │     │────────────────────────────────────────────│
  │     │  BLOCKING (1):                             │
  │     │  [c001] SessionStore lacks TTL support     │
  │     │         → Choose: [1] Add TTL  [2] Redis   │
  │     │                   [3] In-memory            │
  │     │                                            │
  │     │  WARNINGS (1):                             │
  │     │  [c002] Auth middleware sync interface     │
  │     │         → Auto-handled: maintain sync      │
  │     │                                            │
  │     │  Approve and proceed? [y/N]                │
  │     └────────────────────────────────────────────┘
  │
  └─ 4. Only after human approves: dispatch builders
        - Builder specs include resolved constraints
        - No builder will hit "discovered during implementation" blockers
```

**Constraint Categories:**
| Category | Description | Typical Action |
|----------|-------------|----------------|
| `external_dependency` | Missing lib, incompatible version, license issue | Human decision |
| `api_contract` | Interface changes affecting multiple files | Auto-expand scope or human |
| `performance_requirement` | Discovered perf constraint (e.g., must be sync) | Inform builder |
| `security_constraint` | Auth, encryption, data handling requirements | Mandatory review |
| `data_migration` | Schema changes, backwards compatibility | Human decision |
| `test_gap` | Missing test coverage for affected area | Auto-add test task |

---

## 8. Configuration Schema

```yaml
# .swarm/config.yaml
project:
  name: my-project
  root: .                        # Project root (relative to config)
  canonical_branch: main         # Base branch for worktrees

# Backend Configuration (NEW - Local-First Economics)
backends:
  # Provider definitions with health check endpoints
  providers:
    ollama:
      enabled: true
      base_url: http://localhost:11434
      timeout_ms: 120000
      health_check: /api/tags
    vllm:
      enabled: false
      base_url: http://localhost:8000
      timeout_ms: 60000
      health_check: /health
    lmstudio:
      enabled: false
      base_url: http://localhost:1234
      timeout_ms: 60000
    openai:
      enabled: true              # Fallback when local unavailable
      api_key: ${OPENAI_API_KEY}
      timeout_ms: 60000
    anthropic:
      enabled: true              # Fallback for complex planning
      api_key: ${ANTHROPIC_API_KEY}
      timeout_ms: 90000

  # Model routing per agent role (Principle #13: Local-First Economics)
  # Format: provider:model or just model (auto-selects provider)
  models:
    coordinator:
      primary: ollama:qwen2.5:32b           # Strong reasoning, free
      fallback: anthropic:claude-sonnet-4-20250514       # Complex planning backup
    scout:
      primary: ollama:qwen2.5-coder:7b      # Fast, cheap exploration
      fallback: ollama:qwen2.5-coder:14b    # Slightly better if 7b struggles
    builder:
      primary: ollama:qwen2.5-coder:32b     # Strong code generation
      fallback: anthropic:claude-sonnet-4-20250514       # For complex implementations
    reviewer:
      primary: ollama:deepseek-coder-v2:16b # Good at code review
      fallback: ollama:qwen2.5-coder:32b
    merger:
      primary: ollama:qwen2.5-coder:14b     # Conflict resolution
      fallback: anthropic:claude-sonnet-4-20250514

  # Dynamic model routing based on task complexity
  routing:
    enabled: true
    complexity_threshold: 0.7    # Above this, use fallback model
    quality_threshold: 0.8       # Below this success rate, switch models
    min_samples: 10              # Samples needed before switching

# Agent fleet configuration
agents:
  max_concurrent: 5              # Max parallel agents
  stagger_delay_ms: 2000         # Delay between agent spawns
  max_depth: 2                   # Max delegation depth
  idle_timeout_ms: 300000        # Kill idle agents after 5min
  # Per-role tool restrictions (Principle #3: Boundaries)
  tools:
    scout: [read, glob, grep, web_search]
    builder: [read, write, edit, bash, glob, grep]
    reviewer: [read, glob, grep, bash]
    merger: [read, write, edit, bash, glob, grep]

# Watchdog configuration
watchdog:
  enabled: true
  check_interval_ms: 30000       # Health check every 30s
  stale_threshold_ms: 300000     # 5min without activity = stale
  zombie_threshold_ms: 600000    # 10min without activity = zombie
  max_nudge_attempts: 3          # Progressive nudging limit

# Merge configuration
merge:
  auto_resolve: true             # Enable tier-2 auto-resolve
  ai_resolve: true               # Enable tier-3 AI resolve
  run_tests_after: true          # Run tests after merge

# Constraint Validation (NEW - Bicameral Integration)
constraints:
  enabled: true
  require_human_review: true     # Block execution until constraints reviewed
  auto_surface_blockers: true    # Immediately notify on blocking constraints
  categories:
    - external_dependencies
    - api_contracts
    - performance_requirements
    - security_constraints
    - data_migrations

# Metrics & Cost Tracking (NEW)
metrics:
  enabled: true
  retention_days: 30             # Keep metrics for 30 days
  track_tokens: true             # Track input/output tokens
  track_latency: true            # Track response times
  track_quality: true            # Track success/failure rates
  cost_per_million_tokens:       # Cost tracking (0 for local models)
    ollama: 0
    vllm: 0
    lmstudio: 0
    openai:gpt-4o: 5.00
    openai:gpt-4o-mini: 0.15
    anthropic:claude-sonnet-4-20250514: 3.00
    anthropic:claude-3-5-haiku: 0.25

# Trace configuration
trace:
  enabled: true
  retention_days: 7              # Auto-cleanup old traces
  verbose: false                 # Include full payloads

# Dashboard configuration (NEW)
dashboard:
  enabled: true
  port: 3847                     # Local dashboard port
  auto_open: false               # Auto-open browser on start
  refresh_interval_ms: 5000      # Live update interval

# Team Collaboration (NEW)
team:
  enabled: false                 # Enable team features
  shared_config: ""              # URL to shared config (s3://, git@, https://)
  metrics_aggregation: false     # Aggregate metrics across team
  notifications:
    enabled: false
    slack_webhook: ${SLACK_WEBHOOK_URL}
    on_completion: true          # Notify when plan completes
    on_error: true               # Notify on errors
    on_cost_threshold: 10.00     # Notify if cost exceeds threshold

# Convention sources
conventions:
  agents_md: AGENTS.md           # Path to AGENTS.md
  rules_dir: .opencode/rules/    # OpenCode rules directory
  commands_dir: .opencode/commands/ # OpenCode commands directory
```

---

## 9. Agent Overlay Generation

When spawning a Sub-Agent, Swarm generates a per-task AGENTS.md overlay injected into the agent's worktree. This is the agent's complete instruction set.

Example overlay for a Builder agent:

```markdown
# Task: Implement JWT token validation middleware

## Identity
- Agent: builder-001
- Role: builder
- Task ID: task-001
- Parent: coordinator

## File Scope (STRICT - do not modify files outside this list)
- src/middleware/auth.ts
- src/middleware/jwt.ts (new file)
- src/types/auth.ts
- tests/middleware/auth.test.ts
- tests/middleware/jwt.test.ts (new file)

## Task Specification
{contents of .swarm/specs/task-001.md}

## Project Conventions
{extracted relevant sections from AGENTS.md}
- Use vitest for tests
- Follow ESLint airbnb config
- Use zod for runtime validation
- Error responses follow RFC 7807

## Communication Protocol
- When done: run `swarm mail send coordinator "worker_done: task-001, branch: agent/builder-001"`
- When blocked: run `swarm mail send coordinator "needs_clarification: {question}"`
- When error: run `swarm mail send coordinator "error: {description}"`

## Constraints
- Do NOT modify files outside your file scope
- Do NOT commit to main branch
- Do NOT install new dependencies without coordinator approval
- Run tests before reporting done: `npm test -- --filter auth`
- Run lint before reporting done: `npm run lint`
```

---

## 10. Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| Runtime | **Node.js 20+** (with Bun optional) | Widest npm compatibility for installation into target projects |
| Language | **TypeScript** (strict mode) | Type safety for complex orchestration logic |
| CLI Framework | **yargs** | Proven pattern from rock-cli; rich subcommand support |
| Database | **better-sqlite3** | Synchronous SQLite for Node.js; WAL mode for concurrency |
| Process Isolation | **tmux** | Agent session management; human-inspectable |
| Code Isolation | **git worktree** | Branch-per-agent; standard merge tooling |
| AI Backend | **Multi-backend abstraction** | Ollama (primary), Anthropic/OpenAI (fallback) |
| Config Format | **YAML** (js-yaml) | Human-readable; familiar to developers |
| Logging | **pino** | Fast structured logging |
| Testing | **vitest** | Fast; TypeScript native; good DX |
| Linting | **biome** | Fast; replaces eslint + prettier |
| Package Manager | **npm** | Universal; install into any project |
| Dashboard | **Hono + vanilla HTML** | Lightweight HTTP server, no frontend framework |

### Dependency Philosophy

Minimize runtime dependencies. Prefer:
- Node.js built-ins over npm packages
- `child_process.spawn` for external tool invocation
- `better-sqlite3` as the single native dependency (for WAL mode performance)
- Direct HTTP calls to Ollama/APIs over heavy SDK wrappers

---

## 10.5 Backend Abstraction Layer (NEW)

The backend abstraction is the core enabler of Principle #13 (Local-First Economics). It allows seamless switching between local and cloud LLMs.

### Interface Design

```typescript
interface Backend {
  name: string;
  
  // Health and discovery
  isAvailable(): Promise<boolean>;
  listModels(): Promise<Model[]>;
  
  // Core inference
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;
  
  // Metrics
  getLastUsage(): TokenUsage;
}

interface ChatRequest {
  model: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];         // For agent tool use
  toolChoice?: 'auto' | 'required' | 'none';
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
```

### Supported Backends

| Backend | Type | Cost | Latency | Quality | Use Case |
|---------|------|------|---------|---------|----------|
| **Ollama** | Local | Free | Low | Good | Primary for all roles |
| **vLLM** | Local | Free | Very Low | Good | High-throughput scenarios |
| **LM Studio** | Local | Free | Low | Good | GUI debugging, experimentation |
| **OpenAI** | Cloud | $$$ | Medium | Excellent | Fallback for complex tasks |
| **Anthropic** | Cloud | $$$ | Medium | Excellent | Fallback for planning/review |

### Model Router Logic

```typescript
class ModelRouter {
  async selectModel(role: AgentRole, taskComplexity: number): Promise<SelectedModel> {
    const config = this.config.backends.models[role];
    
    // 1. Check if primary backend is healthy
    const primaryBackend = this.backends.get(config.primary.provider);
    if (await primaryBackend.isAvailable()) {
      // 2. Check historical quality for this task type
      const quality = await this.metrics.getQuality(config.primary, role);
      if (quality >= this.config.backends.routing.quality_threshold) {
        return config.primary;
      }
    }
    
    // 3. Fall back to secondary
    return config.fallback;
  }
}
```

### Recommended Local Models (2024-2025)

| Role | Model | Size | VRAM | Notes |
|------|-------|------|------|-------|
| Scout | qwen2.5-coder:7b | 7B | 6GB | Fast exploration, good grep/glob understanding |
| Builder | qwen2.5-coder:32b | 32B | 24GB | Excellent code generation, near GPT-4 |
| Builder (light) | deepseek-coder-v2:16b | 16B | 12GB | Good balance if VRAM limited |
| Reviewer | qwen2.5-coder:14b | 14B | 10GB | Good code understanding |
| Coordinator | qwen2.5:32b | 32B | 24GB | Strong reasoning for planning |
| Coordinator (light) | qwen2.5:14b | 14B | 10GB | Decent planning if VRAM limited |

---

## 11. Implementation Phases

### Phase 0: Backend Abstraction (CRITICAL PATH - Do First)

This phase de-risks the entire project by validating that we can actually invoke LLMs the way we need.

- Design and implement abstract `Backend` interface
- Implement Ollama backend (primary, local, free)
  - Model listing, health check, chat completion, streaming
  - Test with qwen2.5-coder:7b and qwen2.5-coder:32b
- Implement Anthropic backend (fallback)
  - API authentication, rate limiting, error handling
- Implement backend health checker (startup validation)
- Implement dynamic model router
  - Primary/fallback selection based on availability
  - Complexity-based routing (future: ML-based)
- Implement token counter and cost tracker
- **Validation gate**: Successfully run a coding task through Ollama
- Write comprehensive backend tests

### Phase 1: Foundation

- Initialize npm package with TypeScript + Biome + Vitest
- Implement CLI scaffolding with yargs (command router + help system)
- Implement `swarm doctor` (prerequisite checker: tmux, backends, git, node)
- Implement `swarm init` (scaffold .swarm/ directory, parse AGENTS.md)
- Implement config loader with defaults and validation
- Implement SQLite stores (mail, sessions, trace, metrics) with migrations
- Implement structured logger
- Write tests for all foundation components

### Phase 2: Isolation Layer

- Implement git worktree manager (create, list, clean)
- Implement tmux session manager (create, attach, kill, health check)
- Implement agent spawner (worktree + tmux + backend invocation)
- Implement overlay generator (AGENTS.md template rendering)
- Implement process tree management (clean shutdown)
- Write tests for isolation layer

### Phase 3: Messaging, Trace & Metrics

- Implement SQLite mail store with WAL mode
- Implement mail client (send, receive, query, threading)
- Implement broadcast addressing (@all, @builders, etc.)
- Implement trace recorder (middleware pattern)
- Implement metrics collector (tokens, latency, success/failure)
- Implement `swarm mail` CLI commands
- Implement `swarm trace` CLI commands
- Implement `swarm metrics` CLI command
- Write tests for messaging and metrics

### Phase 4: Planning Engine

- Implement AGENTS.md parser (extract conventions, rules, commands)
- Implement scout dispatch and findings collection
- Implement constraint validator (structured constraint extraction)
- Implement task graph builder (dependency detection, file scope assignment)
- Implement cost estimator (using metrics data)
- Implement plan output formatter
- Implement `swarm plan` CLI command
- Write tests for planning

### Phase 5: Execution Engine

- Implement dispatcher (dependency-aware, concurrent execution)
- Implement watchdog (health monitoring, progressive nudging)
- Implement escalation handler (stale, zombie, error states)
- Implement constraint enforcement during execution
- Implement `swarm run` CLI command
- Implement `swarm status` CLI command
- Implement `swarm sling` CLI command
- Write tests for execution

### Phase 6: Convergence

- Implement merge queue (FIFO, SQLite-backed)
- Implement tiered conflict resolver (clean merge → auto-resolve → AI-resolve → escalate)
- Implement `swarm merge` CLI command
- Implement final result reporter (changes summary, cost, trace stats)
- Write tests for convergence

### Phase 7: Dashboard & Team Features

- Implement local HTTP server for dashboard
- Implement dashboard pages (fleet, cost, quality, models)
- Implement `swarm dashboard` CLI command
- Implement `swarm report` CLI command (weekly/monthly reports)
- Implement Slack notification integration
- Implement shared config loading (S3, Git)
- Write tests for dashboard and team features

### Phase 8: Polish & Hardening

- Implement `swarm inspect` (tmux pane capture, log viewer)
- Implement `swarm clean` (full cleanup pipeline)
- Implement `swarm config` (interactive config editing)
- Add shell completions (bash, zsh, fish)
- Add JSON output mode for all commands
- Error handling hardening (graceful shutdown, signal handling)
- Implement quality-based model routing (use metrics to auto-switch)
- Write e2e tests
- Write npm publish configuration

---

## 12. Key Design Patterns (from Reference Implementations)

### From rock-cli:
- **Yargs command module pattern**: Each command as a separate file with `command`, `describe`, `builder`, `handler` exports
- **Smart command routing**: Flexible argument parsing with positional and named styles
- **Three-tier config priority**: env vars > CLI flags > config file
- **Orchestrator pattern**: BatchOrchestrator / ConcurrentOrchestrator for task management
- **Task state machine**: `pending → running → done/failed`
- **Fire-and-forget subprocess**: Telemetry/side-effects in detached child processes

### From Overstory:
- **Two-layer agent definition**: Base role (.md) + per-task overlay
- **SQLite mail system**: Structured messaging with WAL mode
- **Hierarchical delegation**: Coordinator → Lead → Workers (depth-limited)
- **Tiered merge resolution**: Fast-forward → auto → AI → human
- **Progressive watchdog**: warn → nudge → triage → kill
- **Named failure modes**: Explicitly document anti-patterns in agent definitions
- **PreToolUse enforcement**: Mechanically block tool usage based on agent role

### From Bicameral AI:
- **Constraint discovery as first-class workflow**: Scout before build
- **Cross-functional context surfacing**: Agents surface what they find, don't silently guess
- **Ask, Don't Guess principle**: Programmatic escalation when information is insufficient

---

## 13. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Runaway agent spawning | Hard limit via `max_concurrent` and `max_depth` config |
| Cost explosion | Cost estimator in plan phase; human approval gate; per-session budget limit |
| Merge conflicts | Non-overlapping file scopes enforced at dispatch; tiered resolution |
| Agent hallucination | Adversarial review phase; test execution required before merge |
| tmux unavailable | `swarm doctor` checks prerequisites; clear error messages |
| OpenCode API changes | Abstraction layer for AI backend invocation; version pinning |
| SQLite corruption | WAL mode; busy_timeout; periodic integrity checks in `swarm doctor` |
| Stale agents | Watchdog with progressive nudging and auto-kill |
| Context loss in long sessions | Narrow scoped tasks with explicit spec files; no assumed context |

---

## 14. Success Metrics

### Cost Metrics (Primary Goal)
1. **API cost reduction**: Target **90-95% reduction** in cloud API costs by using local models for 80%+ of tasks
2. **Local model utilization**: 80%+ of all inference requests should be served by Ollama/local backends
3. **Fallback rate**: <20% of tasks should require fallback to cloud APIs
4. **Cost per task**: Track $/task to identify expensive patterns and optimize

### Quality Metrics
5. **Constraint discovery rate**: Scouts should surface constraints BEFORE builders hit them in **80%+** of cases
6. **Merge success rate**: Tier-1 (clean merge) should succeed **70%+** of the time due to non-overlapping scopes
7. **Human intervention rate**: Target **<20%** of tasks requiring human clarification
8. **Agent completion rate**: **90%+** of spawned agents should complete their task without watchdog intervention
9. **Local model quality parity**: Local models should achieve **>85%** of cloud model success rate on same tasks

### Operational Metrics
10. **Mean time to plan**: Planning phase should complete in **<5 minutes** for typical tasks
11. **Agent spawn latency**: Time from dispatch to first agent output **<30 seconds**
12. **Dashboard adoption**: Team members should check dashboard **daily** (measure via access logs)

---

## 15. Open Questions for Resolution

### Resolved by Backend Abstraction

1. ~~**OpenCode headless mode**~~: **RESOLVED** - We no longer depend on OpenCode. Direct API calls to Ollama/Anthropic give us full control over headless operation.
2. ~~**OpenCode hooks**~~: **RESOLVED** - With direct API, we implement our own hook system. Agents poll the mail.db directly via `swarm mail check`.
3. ~~**Model routing**~~: **RESOLVED** - Direct API allows per-request model selection. No need for CLI flags; we pass model in the API call.
4. ~~**Token metering**~~: **RESOLVED** - Ollama and cloud APIs return token counts in responses. We capture this in metrics.db.

### Still Open

5. **File scope enforcement**: Two options remain viable:
   - **Option A**: Inject file scope into system prompt + post-hoc reviewer validation (simpler, works with any backend)
   - **Option B**: Custom tool implementation that checks scope before write (more complex, bulletproof)
   - **Recommendation**: Start with Option A; move to B if agents violate scope frequently

6. **Agent tool implementation**: How do we give agents tools (read, write, glob, grep, bash)?
   - **Option A**: Implement tools as function calls in our backend abstraction
   - **Option B**: Wrap an existing tool-using agent (like aider) as a backend
   - **Recommendation**: Option A gives us more control; implement minimal tools ourselves

7. **VRAM management**: When running multiple agents in parallel, how do we handle VRAM?
   - Ollama handles model loading/unloading automatically
   - May need to stagger agent spawns more aggressively
   - Consider `max_concurrent` based on available VRAM

8. **Streaming vs batch**: Should agents stream responses or wait for complete responses?
   - Streaming: Better for watchdog (can detect stalls), worse for token counting
   - Batch: Simpler, accurate token counts, but harder to detect hangs
   - **Recommendation**: Start with batch; add streaming for watchdog health checks

---

## References

- [Bicameral AI: "Why 'just prompt better' doesn't work"](https://www.bicameral-ai.com/blog/tech-debt-meeting) - Constraint discovery research
- [Overstory](https://github.com/jayminwest/overstory) - Multi-agent orchestration architecture
- [Overstory DeepWiki](https://deepwiki.com/jayminwest/overstory) - Detailed technical documentation
- [@ali/rock-cli](internal) - CLI patterns, orchestrator architecture, command routing
- [Gastown](https://github.com/steveyegge/gastown/) - Original multi-agent inspiration (referenced by Overstory)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md) - Local LLM API documentation
- [Qwen2.5-Coder](https://github.com/QwenLM/Qwen2.5-Coder) - Recommended local coding model
