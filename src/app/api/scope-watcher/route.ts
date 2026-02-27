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
    message: "Checking image against approved goals",
    timestamp: Date.now(),
    data: { imageId },
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
      message: "Missing approved element: bench with person",
      timestamp: Date.now(),
      data: output.violations[0],
    })
  } else {
    traces.push({
      agent: "ScopeWatcher",
      status: "completed",
      message: "Image passes all goal checks",
      timestamp: Date.now(),
    })
  }

  return NextResponse.json({
    success: true,
    output,
    traces,
  })
}
