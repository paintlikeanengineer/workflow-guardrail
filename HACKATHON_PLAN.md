# Workflow Guardrail Agent - Hackathon Plan

**Event:** Llama Lounge Agentic Hackathon
**Dates:** Feb 27-28, 2026 (16 hours total: Fri 12pm-8pm, Sat 9am-5pm)
**Repo:** https://github.com/paintlikeanengineer/workflow-guardrail

---

## One-Sentence Pitch

AI agents that catch scope violations and estimate change impact before creative freelancers send work to clients.

---

## Demo Scenario

**Designer:** Athena (freelance illustrator)
**Client:** Eye Clinics of San Jose (Marcus, Marketing Director)
**Project:** Advertising poster for new facility

### Demo Flow (3 minutes)

| Time | Action | Agent |
|------|--------|-------|
| 0:00 | Show PRD summary, explain context | - |
| 0:40 | Designer uploads `v1_no_bench.png` | - |
| 1:00 | **CATCH: "You forgot the bench"** | ScopeWatcher |
| 1:20 | Designer accepts, uploads `v2_with_bench.jpg` | - |
| 1:40 | Client types "How about deeper blue accent?" | - |
| 2:00 | **CATCH: "2 day delay. Still send?"** | CostCalculator |
| 2:20 | Client clicks No, message disappears | - |
| 2:40 | Wrap up | - |

---

## Agents

| Agent | Role | Method |
|-------|------|--------|
| **Orchestrator** | Routes messages to appropriate agents | Rule-based |
| **ScopeWatcher** | Validates uploads against approved goals | Rule + Vision |
| **ChangeTriage** | Detects non-trivial change requests | Rule (keyword match) |
| **CostCalculator** | Estimates time/cost impact | Rule (fixed values) |

### Decision Logic: Rules, Not LLM

Decisions are **deterministic**. LLM only writes explanation text.

```ts
// ScopeWatcher - RULE
if (state.benchApproved && !detectedObjects.includes("bench")) {
  violation = "MUST_INCLUDE_BENCH"
}

// ChangeTriage - RULE
const NON_TRIVIAL = ["overall", "entire", "global", "accent"]
if (NON_TRIVIAL.some(kw => message.includes(kw))) {
  isNonTrivial = true
}

// CostCalculator - RULE
if (isNonTrivial) {
  deltaDays = 2
  deltaCost = 100
}
```

Prompts for LLM explanations: `docs/prompts/*.md`

---

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **LLM:** Snowflake Cortex (`claude-sonnet-4-5`) - primary
- **Backup LLM:** Ollama (`llama3.1:8b`) - if Cortex fails
- **Image Detection:** Snowflake Cortex Vision (REAL - not mocked)

### Cortex Vision Query
```sql
SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'claude-sonnet-4-5',
    'Detect objects in image. Return JSON array with object name and confidence.',
    TO_FILE('@POLICY_DB.PUBLIC.MY_IMAGES', 'v1_no_bench.png')
) AS detected_objects;
```

Images already uploaded to stage: `@POLICY_DB.PUBLIC.MY_IMAGES`

### Snowflake Credentials
- URL: `https://sfsehol-llama_lounge_hackathon_xvhpkw.snowflakecomputing.com/`
- User: `USER`
- Password: See `.env.local` (do not commit)
- Model: `claude-sonnet-4-5` (only allowed model)

---

## File Structure

```
workflow-guardrail/
├── HACKATHON_PLAN.md        # THIS FILE - read first
├── src/
│   ├── app/                 # Next.js pages (build tomorrow)
│   ├── components/          # UI components (build tomorrow)
│   └── types/index.ts       # TypeScript types (DONE)
├── data/
│   ├── prd.json             # Creative brief (DONE)
│   ├── goals.json           # Approved goals (DONE)
│   ├── thread.json          # Conversation history (DONE)
│   └── images/              # Demo images (DONE)
│       ├── reference.jpg
│       ├── roughs.jpg
│       ├── v1_no_bench.png  # Triggers ScopeWatcher
│       └── v2_with_bench.jpg
└── docs/
    ├── prompts/             # Agent prompts (DONE)
    │   ├── scope-watcher.md
    │   ├── scope-scribe.md
    │   ├── request-parser.md
    │   └── cost-calculator.md
    ├── Scenario_Detailed.pdf
    └── Agent_Architecture.png
```

---

## What's Done (Prep)

- [x] Snowflake Cortex tested and working
- [x] Ollama installed with llama3.1:8b
- [x] GitHub repo created (don't push until hackathon starts)
- [x] Next.js project scaffolded
- [x] TypeScript types defined
- [x] Synthetic data: PRD, goals, thread
- [x] Demo images ready
- [x] Agent prompt templates

---

## What to Build (Hackathon)

### Priority 0 (Must Have) - ~10 hrs
- [ ] WhatsApp-style message thread UI (80% width)
- [ ] Designer/Client view toggle
- [ ] Image upload + display
- [ ] **Trace panel** (20% right rail) - shows agent calls
- [ ] Orchestrator logic (routes messages)
- [ ] ScopeWatcher (Cortex Vision + rule)
- [ ] ChangeTriage (keyword rule)
- [ ] CostCalculator (fixed estimate rule)
- [ ] Validation cards UI
- [ ] Pre-filled message drafts

### Priority 1 (Should Have) - ~3 hrs
- [ ] LLM-generated explanation text (make validation cards friendlier)
- [ ] PRD summary tab in right rail

### Priority 2 (Nice to Have) - ~3 hrs
- [ ] Simple annotation tool (draw circles on images)
- [ ] Animated trace events
- [ ] **Composio + Google Drive integration** - PRD upload from Drive (~2 hrs)
  - `npm install composio-core`
  - OAuth2 flow handled by Composio
  - 127 pre-built tools (list, download, share)
  - Docs: https://docs.composio.dev/toolkits/googledrive

---

## UI Layout

```
┌────────────────────────────────────┬──────────────────┐
│  [Designer ○ ● Client]             │  Trace | PRD     │
├────────────────────────────────────┼──────────────────┤
│                                    │ ▶ Orchestrator   │
│  [Message bubbles]                 │   → ScopeWatcher │
│                                    │   → checking...  │
│  ┌──────────────────────────┐      │ ✓ VIOLATION      │
│  │ 🔵 Validation Card       │      │                  │
│  │ "Bench person missing"   │      │                  │
│  │ [Fix] [Send Anyway]      │      │                  │
│  └──────────────────────────┘      │                  │
│                                    │                  │
├────────────────────────────────────┤                  │
│ [📎] [Pre-filled msg...] [➤]      │                  │
└────────────────────────────────────┴──────────────────┘
         80% Chat                       20% Trace Rail
```

---

## Key Decisions Made

1. **No Konva canvas** - Just image upload/display, no live editing
2. **Real image detection** - Cortex Vision detects objects, rules decide violations
3. **Deterministic rules** - LLM writes explanations, not decisions
4. **Hybrid demo** - Prepopulated history + live uploads/messages
5. **Two catches only** - ScopeWatcher (bench) and CostCalculator (blue)
6. **Trace panel required** - 20% right rail shows agent activity (judges love this)

---

## ThreadState (Simplified from Codex)

Instead of complex goals array, track decisions directly:

```ts
type ThreadState = {
  threadId: string
  decisions: {
    selectedRough: "C"
    benchApproved: true
  }
  latestDesign: {
    imageId: string
    detectedObjects: string[]  // from Cortex Vision
  }
}
```

Rules check `ThreadState.decisions` directly.

---

## If Context Crashes

**Claude: Read these files in order:**
1. `HACKATHON_PLAN.md` (this file)
2. `src/types/index.ts` (data structures)
3. `docs/prompts/*.md` (agent behaviors)
4. `data/*.json` (synthetic data)

Then continue building from the "What to Build" checklist above.
