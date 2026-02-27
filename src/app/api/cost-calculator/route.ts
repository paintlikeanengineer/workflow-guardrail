import { NextRequest, NextResponse } from "next/server"
import { CostCalculatorOutput, TraceEvent } from "@/types"
import { generateExplanation } from "@/lib/snowflake"

// POST /api/cost-calculator
// Estimates time and cost impact of a change request
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { task, complexity = "major" } = body

  const traces: TraceEvent[] = []

  const taskStr = typeof task === "string" ? task : (task?.description || JSON.stringify(task) || "")
  const taskPreview = taskStr.slice(0, 80) + (taskStr.length > 80 ? "..." : "")

  traces.push({
    agent: "CostCalculator",
    status: "started",
    message: `Estimating cost impact for "${complexity}" complexity change...`,
    timestamp: Date.now(),
    data: {
      complexity,
      task: taskPreview,
      method: "Historical baseline + complexity multiplier"
    },
  })

  // RULE: Fixed estimates based on complexity (per hackathon plan)
  // Non-trivial changes = 2 days, $100
  let estimatedDays = 0
  let estimatedHours = 0
  let estimatedCost = 0
  let recommendation: CostCalculatorOutput["recommendation"] = "proceed"

  if (complexity === "major") {
    estimatedDays = 2
    estimatedHours = 16
    estimatedCost = 100
    recommendation = "warn"
  } else if (complexity === "moderate") {
    estimatedDays = 1
    estimatedHours = 8
    estimatedCost = 50
    recommendation = "proceed"
  } else {
    estimatedDays = 0
    estimatedHours = 1
    estimatedCost = 0
    recommendation = "proceed"
  }

  // Generate friendly LLM explanation for warnings
  let reasoning = `This ${complexity} change would require approximately ${estimatedDays} additional day(s) and may incur $${estimatedCost} in additional fees based on your contract terms.`

  if (recommendation === "warn") {
    try {
      reasoning = await generateExplanation("cost_warning", {
        days: estimatedDays,
        cost: estimatedCost,
        changeRequest: taskPreview
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
        ? `Impact exceeds threshold: +${estimatedDays} day(s), +$${estimatedCost}. Client should be notified before proceeding.`
        : "Change is within contracted scope. No additional charges apply.",
    timestamp: Date.now(),
    data: {
      hours: estimatedHours,
      days: estimatedDays,
      cost: `$${estimatedCost}`,
      recommendation,
      reasoning: output.reasoning
    },
  })

  return NextResponse.json({
    success: true,
    output,
    traces,
  })
}
