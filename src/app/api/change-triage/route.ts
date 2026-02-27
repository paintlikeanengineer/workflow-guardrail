import { NextRequest, NextResponse } from "next/server"
import { RequestParserOutput, TraceEvent } from "@/types"

// Keywords that indicate non-trivial changes
const NON_TRIVIAL_KEYWORDS = [
  "overall",
  "entire",
  "global",
  "accent",
  "throughout",
  "all",
  "completely",
  "whole",
  "everywhere",
]

// POST /api/change-triage
// Detects if a client message contains a non-trivial change request
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message } = body

  const traces: TraceEvent[] = []
  const messageLower = message.toLowerCase()

  traces.push({
    agent: "RequestParser",
    status: "started",
    message: "Analyzing message for scope-impacting change requests...",
    timestamp: Date.now(),
    data: {
      input: message.slice(0, 100) + (message.length > 100 ? "..." : ""),
      scanning: NON_TRIVIAL_KEYWORDS.slice(0, 5).join(", ") + "..."
    },
  })

  // RULE: Check for non-trivial keywords
  const matchedKeyword = NON_TRIVIAL_KEYWORDS.find((kw) =>
    messageLower.includes(kw)
  )

  const isNonTrivial = !!matchedKeyword

  const output: RequestParserOutput = {
    hasTask: isNonTrivial,
    confidence: isNonTrivial ? 0.9 : 0.85,
  }

  if (isNonTrivial) {
    output.task = {
      taskId: `task-${Date.now()}`,
      description: message,
      complexity: "major",
    }

    traces.push({
      agent: "RequestParser",
      status: "warning",
      message: `Detected scope-impacting keyword: "${matchedKeyword}". This suggests a change that affects multiple elements or requires significant rework.`,
      timestamp: Date.now(),
      data: {
        keyword: matchedKeyword,
        classification: "major",
        reasoning: `The word "${matchedKeyword}" typically indicates broad changes that go beyond single-element edits`,
        action: "Escalating to CostCalculator for impact assessment"
      },
    })
  } else {
    traces.push({
      agent: "RequestParser",
      status: "completed",
      message: "Message appears to be conversational or a minor adjustment. No scope triggers found.",
      timestamp: Date.now(),
      data: {
        scannedKeywords: NON_TRIVIAL_KEYWORDS.length,
        result: "No matches - proceeding without cost check"
      }
    })
  }

  return NextResponse.json({
    success: true,
    isNonTrivial,
    output,
    traces,
  })
}
