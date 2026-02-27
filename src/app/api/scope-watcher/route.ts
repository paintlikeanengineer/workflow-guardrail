import { NextRequest, NextResponse } from "next/server"
import { ScopeWatcherOutput, TraceEvent } from "@/types"
import { getState } from "@/lib/state"

// POST /api/scope-watcher
// Validates uploaded images against approved goals
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { imageId, detectedObjects = [] } = body

  const state = getState()
  const traces: TraceEvent[] = []

  traces.push({
    agent: "ScopeWatcher",
    status: "started",
    message: "Validating design against approved project goals...",
    timestamp: Date.now(),
    data: {
      imageId,
      checkingGoals: state.decisions.benchApproved ? ["Bench from Rough C"] : [],
      detectedElements: detectedObjects.slice(0, 5)
    },
  })

  // RULE: If bench was approved but not detected in image, it's a violation
  const hasBench = detectedObjects.some((obj: string) =>
    obj.toLowerCase().includes("bench") || obj.toLowerCase().includes("person sitting")
  )

  const output: ScopeWatcherOutput = {
    valid: true,
    violations: [],
    confidence: 0.95,
  }

  if (state.decisions.benchApproved && !hasBench) {
    output.valid = false
    output.violations.push({
      goalId: "goal-bench",
      goalText: "Include bench with person from Rough C",
      reason: "The approved bench element is missing from this design",
      severity: "high",
    })

    traces.push({
      agent: "ScopeWatcher",
      status: "violation",
      message: "Scope violation: Client approved bench element (Rough C) is not present in this design iteration.",
      timestamp: Date.now(),
      data: {
        missingGoal: "Bench with person (Rough C)",
        detectedInImage: detectedObjects.slice(0, 5),
        confidence: output.confidence,
        recommendation: "Designer should be notified before sending to avoid client confusion"
      },
    })
  } else {
    traces.push({
      agent: "ScopeWatcher",
      status: "completed",
      message: hasBench
        ? "All approved elements detected. Design aligns with client-approved goals."
        : "No scope constraints active. Image is acceptable.",
      timestamp: Date.now(),
      data: {
        elementsChecked: state.decisions.benchApproved ? 1 : 0,
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
