import { NextRequest, NextResponse } from "next/server"
import { ScopeWatcherOutput, TraceEvent } from "@/types"
import { generateExplanation } from "@/lib/snowflake"
import { readFileSync } from "fs"
import { join } from "path"

type Goal = {
  id: string
  description: string
  source: string
  timestamp: string
}

type PRDData = {
  goals?: Goal[]
}

// Load goals from PRD
function loadGoals(): Goal[] {
  try {
    const prdPath = join(process.cwd(), "data", "prd.json")
    const prdContent = readFileSync(prdPath, "utf-8")
    const prd: PRDData = JSON.parse(prdContent)
    return prd.goals || []
  } catch {
    return []
  }
}

// Check if a goal requires a specific element
function getRequiredElement(goal: Goal): string | null {
  const desc = goal.description.toLowerCase()

  // "Do you like the anonymized person on the bench?: Yes"
  if (desc.includes("bench") && desc.includes("yes")) {
    return "bench"
  }
  // Add more patterns as needed
  return null
}

// POST /api/scope-watcher
// Validates uploaded images against approved goals from PRD
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { imageId, detectedObjects = [] } = body

  const goals = loadGoals()
  const traces: TraceEvent[] = []

  // Extract checking goals for trace display
  const checkingGoals = goals
    .map((g) => g.description)
    .filter((d) => d.toLowerCase().includes("yes")) // Only "Yes" decisions are requirements

  traces.push({
    agent: "ScopeWatcher",
    status: "started",
    message: `Validating design against ${checkingGoals.length} approved goal(s)...`,
    timestamp: Date.now(),
    data: {
      imageId,
      checkingGoals,
      detectedElements: detectedObjects.slice(0, 5)
    },
  })

  const output: ScopeWatcherOutput = {
    valid: true,
    violations: [],
    confidence: 0.95,
  }

  // Check each goal
  for (const goal of goals) {
    const requiredElement = getRequiredElement(goal)
    if (!requiredElement) continue

    // Check if the required element is detected
    const hasElement = detectedObjects.some((obj: string) =>
      obj.toLowerCase().includes(requiredElement) ||
      (requiredElement === "bench" && obj.toLowerCase().includes("person sitting"))
    )

    if (!hasElement) {
      // Generate friendly LLM explanation
      let friendlyMessage = `The approved ${requiredElement} element is missing from this design`
      try {
        friendlyMessage = await generateExplanation("scope_violation", {
          missingElement: requiredElement
        })
      } catch (err) {
        console.error("Failed to generate explanation:", err)
      }

      output.valid = false
      output.violations.push({
        goalId: goal.id,
        goalText: goal.description,
        reason: friendlyMessage,
        severity: "high",
      })

      traces.push({
        agent: "ScopeWatcher",
        status: "violation",
        message: `Scope violation: "${goal.description}" - element not detected in image.`,
        timestamp: Date.now(),
        data: {
          missingGoal: goal.description,
          requiredElement,
          detectedInImage: detectedObjects.slice(0, 5),
          confidence: output.confidence,
          recommendation: "Designer should be notified before sending to avoid client confusion"
        },
      })
    }
  }

  if (output.valid) {
    traces.push({
      agent: "ScopeWatcher",
      status: "completed",
      message: checkingGoals.length > 0
        ? "All approved elements detected. Design aligns with client-approved goals."
        : "No scope constraints active. Image is acceptable.",
      timestamp: Date.now(),
      data: {
        goalsChecked: checkingGoals.length,
        detectedObjects: detectedObjects.slice(0, 5),
        result: "PASS"
      }
    })
  }

  return NextResponse.json({
    success: true,
    output,
    traces,
  })
}
