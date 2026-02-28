import { NextRequest, NextResponse } from "next/server"
import { CostCalculatorOutput, TraceEvent } from "@/types"
import { generateExplanation, estimateCostFromHistory, getEditHistoryFromSnowflake, EditHistoryRecord } from "@/lib/snowflake"
import editHistoryData from "../../../../data/edit-history.json"
import { readFileSync } from "fs"
import { join } from "path"

type PRDTerms = {
  autoApproveThreshold?: {
    maxHours: number
    maxCost: number
  }
}

function getAutoApproveThreshold(): { maxHours: number; maxCost: number } {
  try {
    const prdPath = join(process.cwd(), "data", "prd.json")
    const prdContent = readFileSync(prdPath, "utf-8")
    const prd = JSON.parse(prdContent)
    const terms = prd.terms as PRDTerms
    return terms.autoApproveThreshold || { maxHours: 3, maxCost: 300 }
  } catch {
    return { maxHours: 3, maxCost: 300 }
  }
}

// POST /api/cost-calculator
// Estimates time and cost impact of a change request using historical data
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { task } = body

  const traces: TraceEvent[] = []

  const taskStr = typeof task === "string" ? task : (task?.description || JSON.stringify(task) || "")
  const taskPreview = taskStr.slice(0, 80) + (taskStr.length > 80 ? "..." : "")

  // Try to fetch edit history from Snowflake, fall back to local JSON
  let editHistory: EditHistoryRecord[] = []
  let dataSource = "local"

  try {
    editHistory = await getEditHistoryFromSnowflake()
    if (editHistory.length > 0) {
      dataSource = "snowflake"
    } else {
      editHistory = editHistoryData.editHistory
    }
  } catch (err) {
    console.log("Snowflake query failed, using local data:", err)
    editHistory = editHistoryData.editHistory
  }

  traces.push({
    agent: "CostCalculator",
    status: "started",
    message: `Querying ${editHistory.length} historical edits from ${dataSource === "snowflake" ? "Snowflake" : "cache"}...`,
    timestamp: Date.now(),
    data: {
      request: taskPreview,
      method: "LLM-powered historical pattern matching",
      dataSource: dataSource === "snowflake" ? "POLICY_DB.PUBLIC.EDIT_HISTORY" : "local cache"
    },
  })

  // Use LLM to estimate cost from historical data
  let estimate
  try {
    estimate = await estimateCostFromHistory(taskStr, editHistory)
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

  // Get thresholds from PRD
  const threshold = getAutoApproveThreshold()

  // Warn if scope is global/major, or exceeds PRD-defined thresholds
  const exceedsThreshold = estimatedHours > threshold.maxHours || estimatedCost > threshold.maxCost
  const recommendation: CostCalculatorOutput["recommendation"] =
    estimate.scope === "major" || estimate.scope === "global" || exceedsThreshold
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

  // Format time: show hours if < 8, otherwise days
  const timeStr = estimatedHours < 8
    ? `${estimatedHours}hr`
    : `${estimatedDays} day(s)`

  traces.push({
    agent: "CostCalculator",
    status: recommendation === "warn" ? "warning" : "completed",
    message:
      recommendation === "warn"
        ? `Impact assessment: +${timeStr}, +$${estimatedCost} (exceeds threshold: ${threshold.maxHours}hr/$${threshold.maxCost})`
        : `Minor change: ~${estimatedHours}hr, $${estimatedCost}. Within auto-approve threshold (${threshold.maxHours}hr/$${threshold.maxCost}).`,
    timestamp: Date.now(),
    data: {
      hours: estimatedHours,
      days: estimatedDays,
      cost: `$${estimatedCost}`,
      category: estimate.category,
      scope: estimate.scope,
      confidence: estimate.confidence,
      recommendation,
      threshold: `${threshold.maxHours}hr / $${threshold.maxCost}`,
    },
  })

  return NextResponse.json({
    success: true,
    output,
    traces,
  })
}
