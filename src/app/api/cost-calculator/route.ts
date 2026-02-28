import { NextRequest, NextResponse } from "next/server"
import { CostCalculatorOutput, TraceEvent } from "@/types"
import { generateExplanation, estimateCostFromHistory } from "@/lib/snowflake"
import editHistoryData from "../../../../data/edit-history.json"

// POST /api/cost-calculator
// Estimates time and cost impact of a change request using historical data
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { task } = body

  const traces: TraceEvent[] = []

  const taskStr = typeof task === "string" ? task : (task?.description || JSON.stringify(task) || "")
  const taskPreview = taskStr.slice(0, 80) + (taskStr.length > 80 ? "..." : "")

  traces.push({
    agent: "CostCalculator",
    status: "started",
    message: `Analyzing request against ${editHistoryData.editHistory.length} historical edits...`,
    timestamp: Date.now(),
    data: {
      request: taskPreview,
      method: "LLM-powered historical pattern matching"
    },
  })

  // Use LLM to estimate cost from historical data
  let estimate
  try {
    estimate = await estimateCostFromHistory(taskStr, editHistoryData.editHistory)
  } catch (err) {
    console.error("Cost estimation failed:", err)
    // Fallback to conservative estimate
    estimate = {
      category: "composition_change",
      scope: "major",
      estimatedHours: 16,
      estimatedCost: 800,
      confidence: "low" as const,
      similarEdits: [],
      reasoning: "Estimation failed, using conservative estimate",
    }
  }

  const estimatedDays = Math.ceil(estimate.estimatedHours / 8)
  const estimatedHours = estimate.estimatedHours
  const estimatedCost = estimate.estimatedCost

  // Warn if scope is global or major, or cost exceeds $200
  const recommendation: CostCalculatorOutput["recommendation"] =
    estimate.scope === "major" || estimate.scope === "global" || estimatedCost > 200
      ? "warn"
      : "proceed"

  // Add trace for similar edits found
  if (estimate.similarEdits.length > 0) {
    traces.push({
      agent: "CostCalculator",
      status: "completed",
      message: `Found ${estimate.similarEdits.length} similar historical edit(s)`,
      timestamp: Date.now(),
      data: {
        category: estimate.category,
        scope: estimate.scope,
        confidence: estimate.confidence,
        similarEdits: estimate.similarEdits.map(e => ({
          request: e.requestText,
          hours: e.actualHours,
          cost: `$${e.actualCost}`
        }))
      },
    })
  }

  // Generate friendly LLM explanation for warnings
  let reasoning = estimate.reasoning

  if (recommendation === "warn") {
    try {
      reasoning = await generateExplanation("cost_warning", {
        days: estimatedDays,
        cost: estimatedCost,
        changeRequest: taskPreview,
        similarEdits: estimate.similarEdits.map(e => e.requestText).join(", ")
      })
    } catch (err) {
      console.error("Failed to generate explanation:", err)
    }
  }

  const output: CostCalculatorOutput = {
    estimatedHours,
    estimatedDays,
    estimatedCost,
    reasoning,
    recommendation,
  }

  traces.push({
    agent: "CostCalculator",
    status: recommendation === "warn" ? "warning" : "completed",
    message:
      recommendation === "warn"
        ? `Impact assessment: +${estimatedDays} day(s), +$${estimatedCost} (${estimate.confidence} confidence based on ${estimate.category})`
        : `Minor change: ~${estimatedHours}hr, $${estimatedCost}. Within scope.`,
    timestamp: Date.now(),
    data: {
      hours: estimatedHours,
      days: estimatedDays,
      cost: `$${estimatedCost}`,
      category: estimate.category,
      scope: estimate.scope,
      confidence: estimate.confidence,
      recommendation,
    },
  })

  return NextResponse.json({
    success: true,
    output,
    traces,
  })
}
