# 🔥 MASTER PROMPT FOR CODEX  
## Project: Workflow Guardrail — Agentic Design Workflow Demo

You are building a hackathon demo called:

> **Workflow Guardrail — An Agentic System That Prevents Costly Design Iteration Errors**

This is NOT a chatbot.  
This is NOT a generic RAG app.  
This is a **multi-agent workflow gatekeeper** that coordinates reasoning agents and blocks harmful changes before they propagate across a design workflow.

---

# 🎯 GOAL

Build a polished demo UI showing:

- Multi-agent orchestration
- Tool usage (LLM + rule engine)
- Message gating (block / allow)
- Trace visibility
- Role-aware agent collaboration
- Measurable outcome: prevented costly iteration

This is for an Agentic AI hackathon.

---

# 🧱 ARCHITECTURE OVERVIEW

### Roles
- Designer
- Client

### Message Types
- text
- design (image + version)
- validation (system message)

### Agents (REAL, visible in trace)

1. **Orchestrator**
2. **IntentLens** (Action → Intent)
3. **GuardrailCritic** (PRD + decision validation)
4. **ChangeTriage** (detects non-trivial requests)
5. **ScopeMeter** (cost & delay estimator)

---

# 🚦 DEMO FLOW (DO NOT DEVIATE)

Initial State (pre-seeded in UI):

1. Designer: “Here are roughs A / B1 / B2 / C.”
2. Client: “C”
3. System: Validation card: “C noted ✅”
4. Designer: “Do you like the anonymized person on the bench?” (yes/no buttons visible)

Interaction begins here.

### Step 1
Client clicks YES (benchApproved = true)

### Step 2
Designer uploads image `C_v2_missing_bench`
→ Orchestrator runs:
   IntentLens
   GuardrailCritic
→ GuardrailCritic detects violation
→ System posts validation card:
   "Bench was approved but is missing."

Message is blocked until resolved.

### Step 3
Designer opens Konva editor (modal)
Designer adds bench
Save → produces EditorEditJSON
→ IntentLens produces EditIntent
→ GuardrailCritic passes
→ Design message is posted

### Step 4
Client types:
"Can we make the accent deeper blue overall?"

→ Orchestrator:
   ChangeTriage detects non-trivial global edit
   ScopeMeter estimates +2 days, +$100

→ System shows validation card to client:
   "This change will push deadline by 2 days."

Client clicks NO
→ Message suppressed
→ Designer never sees request

END DEMO.

---

# 📦 DATA CONTRACTS (DO NOT MODIFY UNLESS NECESSARY)

### PRD
```ts
type PRD = {
  prdId: string
  constraints: {
    mustInclude: string[]
    palette: {
      allowedAccents: string[]
      forbiddenAccents: string[]
    }
    timeline: { baselineDays: number }
  }
  pricing: {
    extraIterationRateUsdPerHour: number
    freeIterationsAfterSignoff: number
  }
}
```

### ThreadState
```ts
type ThreadState = {
  threadId: string
  decisions: {
    selectedRough: string
    benchApproved: boolean
  }
  latestDesign: {
    imageId: string
    includesBench: boolean
  }
}
```

### EditorEditJSON
```ts
type EditorEditJSON = {
  imageId: string
  ops: { op: string; [key: string]: any }[]
}
```

### EditIntent
```ts
type EditIntent = {
  summary: string
  edits: { type: string; object?: string }[]
}
```

### ValidationResult
```ts
type ValidationResult = {
  valid: boolean
  violations?: {
    code: string
    message: string
  }[]
}
```

### CostEstimate
```ts
type CostEstimate = {
  isNonTrivial: boolean
  deltaDays: number
  deltaCostUsd: number
  rationale: string[]
}
```

### TraceEvent
```ts
type TraceEvent = {
  traceId: string
  stage: "ORCHESTRATOR" | "INTENT_LENS" | "GUARDRAIL_CRITIC" | "CHANGE_TRIAGE" | "SCOPE_METER"
  status: "ok" | "blocked" | "error"
  summary: string
}
```

---

# 🧠 RULE ENGINE (DETERMINISTIC — NOT LLM)

### RULE 1
If `benchApproved === true`
AND `latestDesign.includesBench === false`
→ violation: MUST_INCLUDE_BENCH_PERSON

### RULE 2
If EditIntent.edits includes:
- global_palette_shift
OR client text includes keywords: "overall", "entire", "global", "accent"
→ nonTrivialChange = true

### RULE 3
If nonTrivialChange === true
→ deltaDays = 2
→ deltaCostUsd = 100

These must be deterministic.

LLM can generate text explanation.
But rule decision must not rely on LLM.

---

# 🖥 UI REQUIREMENTS

Layout:
- Chat = 80% width
- Right rail = Trace + PRD tabs
- Top toggle: Designer / Client

Konva Editor:
- Opens as modal overlay
- On Save returns EditorEditJSON

Validation Cards:
- Appear as next system message
- Block message delivery until user confirms

Message Suppression:
- If client clicks NO on cost validation
→ original message is not delivered to designer

Trace Panel:
- Append TraceEvent for every agent call
- Designer sees:
  IntentLens + GuardrailCritic details
- Client sees:
  ScopeMeter summary only

---

# 🔄 ORCHESTRATOR LOGIC

```ts
if message.type === "design" && senderRole === "designer":
   run IntentLens
   run GuardrailCritic
   if valid:
      post message
   else:
      post validation card

if message.type === "text" && senderRole === "client":
   run ChangeTriage
   if hasTask:
      run ScopeMeter
      post validation card
   else:
      post message
```

---

# ⚙️ LLM USAGE

Use LLM (Snowflake Cortex AI_COMPLETE or local model) only for:

- IntentLens (summarize edits)
- GuardrailCritic explanation text (optional)
- ScopeMeter rationale sentence (optional)

Do NOT rely on LLM for core rule decisions.

---

# ❗ FAILURE HANDLING

If any agent call fails:
- Append trace with status="error"
- Fallback to safe deterministic behavior
- UI must not crash

---

# 🏁 OUTPUT REQUIREMENTS

Deliver:

1. Next.js app
2. Seeded demo data
3. Working Konva editor modal
4. Agent endpoints
5. Deterministic rule engine
6. Trace panel
7. Gated message flow

---

# 💬 POSITIONING

This system demonstrates:

- Autonomous orchestration
- Tool usage (LLM + rule engine)
- Multi-agent collaboration
- Role-aware reasoning
- Measurable workflow impact
- Prevention of costly iteration

This is an **agentic workflow system**, not a chat app.

---

END OF SPEC.
