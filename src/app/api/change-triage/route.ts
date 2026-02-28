import { NextRequest, NextResponse } from "next/server"
import { ChangeTriageOutput, TraceEvent } from "@/types"
import { classifyChangeRequest } from "@/lib/snowflake"

// Fallback keywords if Snowflake is unavailable
const FALLBACK_KEYWORDS = [
  "overall", "entire", "global", "throughout", "all",
  "completely", "complete", "whole", "everywhere",
  "different", "change", "redo", "restart", "start over",
  "from scratch", "new direction", "style", "angle",
  "perspective", "layout", "composition", "color scheme",
  "palette", "tone", "mood", "vibe",
]

// POST /api/change-triage
// Detects if a client message contains a non-trivial change request
// Uses Snowflake Cortex LLM for semantic classification
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message } = body

  const traces: TraceEvent[] = []

  traces.push({
    agent: "ChangeTriage",
    status: "started",
    message: "Analyzing message with Cortex LLM...",
    timestamp: Date.now(),
    data: {
      input: message.slice(0, 100) + (message.length > 100 ? "..." : ""),
    },
  })

  let isNonTrivial = false
  let classification: {
    category: string
    complexity: "trivial" | "moderate" | "major"
    reasoning: string
  } | null = null

  try {
    // Use Snowflake Cortex to classify the message
    classification = await classifyChangeRequest(message)
    isNonTrivial = classification.complexity !== "trivial"

    traces.push({
      agent: "ChangeTriage",
      status: isNonTrivial ? "warning" : "completed",
      message: isNonTrivial
        ? `Detected ${classification.complexity} change: ${classification.category}`
        : "Message appears conversational or trivial.",
      timestamp: Date.now(),
      data: {
        category: classification.category,
        complexity: classification.complexity,
        reasoning: classification.reasoning,
        source: "Snowflake Cortex LLM",
      },
    })
  } catch (err) {
    console.error("Cortex classification failed, using fallback:", err)

    // Fallback to keyword matching
    const messageLower = message.toLowerCase()
    const matchedKeyword = FALLBACK_KEYWORDS.find((kw) =>
      messageLower.includes(kw)
    )
    isNonTrivial = !!matchedKeyword

    traces.push({
      agent: "ChangeTriage",
      status: isNonTrivial ? "warning" : "completed",
      message: isNonTrivial
        ? `Fallback: Detected keyword "${matchedKeyword}"`
        : "No scope-impacting keywords found.",
      timestamp: Date.now(),
      data: {
        source: "keyword fallback",
        matchedKeyword: matchedKeyword || null,
      },
    })

    if (isNonTrivial) {
      classification = {
        category: "unknown",
        complexity: "major",
        reasoning: `Matched keyword: "${matchedKeyword}"`,
      }
    }
  }

  const output: ChangeTriageOutput = {
    hasTask: isNonTrivial,
    confidence: classification ? 0.9 : 0.7,
  }

  if (isNonTrivial && classification) {
    output.task = {
      taskId: `task-${Date.now()}`,
      description: message,
      complexity: classification.complexity,
    }

    traces.push({
      agent: "ChangeTriage",
      status: "warning",
      message: `Escalating to CostCalculator: "${classification.category}" change detected.`,
      timestamp: Date.now(),
      data: {
        action: "Escalating to CostCalculator for impact assessment",
      },
    })
  }

  return NextResponse.json({
    success: true,
    isNonTrivial,
    output,
    traces,
  })
}
