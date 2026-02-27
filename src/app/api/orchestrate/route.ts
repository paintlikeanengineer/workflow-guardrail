import { NextRequest, NextResponse } from "next/server"
import { TraceEvent } from "@/types"

// POST /api/orchestrate
// Routes incoming messages to appropriate agents
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { messageType, sender, content } = body

  const traces: TraceEvent[] = [
    {
      agent: "ScopeWatcher",
      status: "started",
      message: "Orchestrator received message",
      timestamp: Date.now(),
      data: { messageType, sender },
    },
  ]

  // Mock routing logic
  let nextAgent: string | null = null

  if (messageType === "image" && sender === "designer") {
    nextAgent = "scope-watcher"
  } else if (messageType === "text" && sender === "client") {
    nextAgent = "change-triage"
  }

  return NextResponse.json({
    success: true,
    nextAgent,
    traces,
    message: `Routed to ${nextAgent || "none"}`,
  })
}
