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
    message: "Analyzing client message for change requests",
    timestamp: Date.now(),
    data: { messageLength: message.length },
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
      message: `Non-trivial change detected (keyword: "${matchedKeyword}")`,
      timestamp: Date.now(),
      data: { matchedKeyword, complexity: "major" },
    })
  } else {
    traces.push({
      agent: "RequestParser",
      status: "completed",
      message: "No significant change request detected",
      timestamp: Date.now(),
    })
  }

  return NextResponse.json({
    success: true,
    isNonTrivial,
    output,
    traces,
  })
}
