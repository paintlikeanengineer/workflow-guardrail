"use client"

import { useState, useEffect, useRef } from "react"
import { TraceEvent, AgentName } from "@/types"

type Props = {
  traces: TraceEvent[]
}

type AgentGroup = {
  agent: AgentName
  traces: TraceEvent[]
  finalStatus: TraceEvent["status"]
  startTime: number
  endTime: number
}

const statusColors: Record<TraceEvent["status"], string> = {
  started: "text-blue-400",
  completed: "text-green-400",
  violation: "text-red-400",
  warning: "text-amber-400",
  error: "text-red-400",
}

const statusBorderColors: Record<TraceEvent["status"], string> = {
  started: "border-blue-500/50",
  completed: "border-green-500/50",
  violation: "border-red-500/50",
  warning: "border-amber-500/50",
  error: "border-red-500/50",
}

const statusBgColors: Record<TraceEvent["status"], string> = {
  started: "bg-blue-500/10",
  completed: "bg-green-500/10",
  violation: "bg-red-500/10",
  warning: "bg-amber-500/10",
  error: "bg-red-500/10",
}

// Pulsing dot for "thinking" state
function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
    </span>
  )
}

// Status icons
function StatusIcon({ status, isActive }: { status: TraceEvent["status"]; isActive: boolean }) {
  if (status === "started" && isActive) {
    return <PulsingDot />
  }

  const icons: Record<TraceEvent["status"], string> = {
    started: "▶",
    completed: "✓",
    violation: "✗",
    warning: "⚠",
    error: "✗",
  }

  return (
    <span className={`${statusColors[status]} text-xs font-bold`}>
      {icons[status]}
    </span>
  )
}

// Group consecutive traces by agent
function groupTracesByAgent(traces: TraceEvent[]): AgentGroup[] {
  const groups: AgentGroup[] = []
  let currentGroup: AgentGroup | null = null

  for (const trace of traces) {
    if (currentGroup && currentGroup.agent === trace.agent) {
      // Add to current group
      currentGroup.traces.push(trace)
      currentGroup.finalStatus = trace.status
      currentGroup.endTime = trace.timestamp
    } else {
      // Start new group
      currentGroup = {
        agent: trace.agent,
        traces: [trace],
        finalStatus: trace.status,
        startTime: trace.timestamp,
        endTime: trace.timestamp,
      }
      groups.push(currentGroup)
    }
  }

  return groups
}

// Generate one-line summary for judges
function getAgentSummary(group: AgentGroup): { text: string; outcome: string } | null {
  const agent = group.agent
  const status = group.finalStatus
  const lastTrace = group.traces[group.traces.length - 1]
  const data = lastTrace.data as Record<string, unknown> | undefined

  if (agent === "ScopeWatcher") {
    if (status === "violation") {
      return { text: "PRD conflict", outcome: "blocked" }
    } else if (status === "completed") {
      return { text: "PRD check", outcome: "passed" }
    }
  } else if (agent === "CostCalculator") {
    if (status === "warning") {
      const days = data?.days || "?"
      const cost = data?.cost || "?"
      return { text: `+${days} days, ${cost}`, outcome: "held" }
    } else if (status === "completed") {
      return { text: "Within threshold", outcome: "auto-approved" }
    }
  } else if (agent === "ChangeTriage") {
    if (status === "warning") {
      const category = data?.category || "change"
      return { text: `${category} detected`, outcome: "escalated" }
    } else if (status === "completed") {
      return { text: "No scope impact", outcome: "passed" }
    }
  } else if (agent === "ScopeScribe") {
    if (status === "completed") {
      return { text: "Client decision", outcome: "recorded" }
    }
  } else if (agent === "PRD-Sync") {
    if (status === "completed") {
      return { text: "Amendment", outcome: "saved" }
    }
  } else if (agent === "IntentLens") {
    if (status === "completed") {
      const isMinor = data?.isMinorOverall
      return { text: "Annotation analyzed", outcome: isMinor ? "minor change" : "key element" }
    }
  }
  return null
}

const outcomeColors: Record<string, string> = {
  blocked: "bg-red-500/80 text-white",
  held: "bg-amber-500/80 text-white",
  escalated: "bg-amber-500/80 text-white",
  passed: "bg-green-500/80 text-white",
  recorded: "bg-blue-500/80 text-white",
  saved: "bg-blue-500/80 text-white",
  "auto-approved": "bg-green-500/80 text-white",
  "minor change": "bg-green-500/80 text-white",
  "key element": "bg-amber-500/80 text-white",
}

// Tool calls (external services) and System of Record (our data)
function getAgentResources(agent: AgentName): { tools: string[]; records: string[] } {
  switch (agent) {
    case "ScopeWatcher":
      return { tools: ["Cortex Vision"], records: ["PRD"] }
    case "CostCalculator":
      return { tools: ["Cortex LLM"], records: ["History"] }
    case "ChangeTriage":
      return { tools: ["Cortex LLM"], records: [] }
    case "ScopeScribe":
      return { tools: [], records: ["PRD"] }
    case "PRD-Sync":
      return { tools: [], records: ["PRD"] }
    case "IntentLens":
      return { tools: [], records: ["Regions"] }
    default:
      return { tools: [], records: [] }
  }
}

// Tools = external AI services (Snowflake Cortex)
const toolBadgeStyle = "bg-cyan-600/30 text-cyan-300 border-cyan-500/50"

// System of Record = our data sources
const recordBadgeStyle = "bg-amber-600/30 text-amber-300 border-amber-500/50"

function AgentGroupCard({ group, isNew, isActive }: { group: AgentGroup; isNew: boolean; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const hasMultipleTraces = group.traces.length > 1

  // Check if any trace has expandable data
  const hasExpandableData = group.traces.some(
    t => t.data && typeof t.data === "object" && Object.keys(t.data as object).length > 0
  )

  const summary = getAgentSummary(group)

  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${statusBorderColors[group.finalStatus]} ${statusBgColors[group.finalStatus]} ${
        isNew ? "animate-slideIn" : ""
      }`}
    >
      {/* Header */}
      <div
        className={`p-2.5 ${hasMultipleTraces || hasExpandableData ? "cursor-pointer hover:bg-white/5" : ""}`}
        onClick={() => (hasMultipleTraces || hasExpandableData) && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon status={group.finalStatus} isActive={isActive} />
            <span className="font-semibold text-sm text-gray-100">{group.agent}</span>
            {group.traces.length > 1 && (
              <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                {group.traces.length} steps
              </span>
            )}
            {(hasMultipleTraces || hasExpandableData) && (
              <span className="text-gray-500 text-[10px]">
                {expanded ? "▼" : "▶"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500">
            {new Date(group.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>

        {/* Tool & Record badges - two rows */}
        {(() => {
          const { tools, records } = getAgentResources(group.agent)
          if (tools.length === 0 && records.length === 0) return null
          return (
            <div className="flex flex-col gap-1 mt-1.5">
              {tools.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-gray-500 w-8">Tools</span>
                  {tools.map((tool) => (
                    <span key={tool} className={`text-[9px] px-1.5 py-0.5 rounded border ${toolBadgeStyle}`}>
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              {records.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-gray-500 w-8">Data</span>
                  {records.map((rec) => (
                    <span key={rec} className={`text-[9px] px-1.5 py-0.5 rounded border ${recordBadgeStyle}`}>
                      {rec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* One-line summary for judges */}
        {summary && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400">{summary.text}</span>
            <span className="text-[10px] font-medium rounded px-1.5 py-0.5" style={{ fontSize: "9px" }}>
              <span className={`${outcomeColors[summary.outcome] || "bg-gray-600 text-white"} px-1.5 py-0.5 rounded`}>
                → {summary.outcome}
              </span>
            </span>
          </div>
        )}

        {/* Show last message as detail */}
        <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
          {group.traces[group.traces.length - 1].message}
        </p>
      </div>

      {/* Expanded view - all traces */}
      {expanded && (
        <div className="border-t border-gray-700/50 px-2.5 pb-2.5 pt-2 space-y-2">
          {group.traces.map((trace, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`${statusColors[trace.status]} text-[10px]`}>
                  {trace.status === "started" ? "▶" : trace.status === "completed" ? "✓" : trace.status === "violation" ? "✗" : "⚠"}
                </span>
                <span className="text-gray-400">
                  {new Date(trace.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-gray-300 pl-4">{trace.message}</p>

              {/* Trace data */}
              {trace.data && typeof trace.data === "object" && Object.keys(trace.data as object).length > 0 && (
                <div className="mt-1 pl-4">
                  <div className="bg-gray-800/70 rounded p-1.5 font-mono text-[10px] text-gray-400 overflow-x-auto">
                    {formatTraceData(trace.data)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTraceData(data: unknown): React.ReactNode {
  if (!data || typeof data !== "object") return <span>{String(data)}</span>

  const entries = Object.entries(data as Record<string, unknown>)
  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="text-blue-400">{key}:</span>
          <span className="text-gray-300">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TracePanel({ traces }: Props) {
  const [seenCount, setSeenCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const groups = groupTracesByAgent(traces)

  // Track new traces for animation
  useEffect(() => {
    if (traces.length > seenCount) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      const timer = setTimeout(() => setSeenCount(traces.length), 500)
      return () => clearTimeout(timer)
    }
  }, [traces.length, seenCount])

  // Check if a group is still active (last trace is "started")
  const isGroupActive = (group: AgentGroup): boolean => {
    return group.finalStatus === "started"
  }

  // Check if any agent is currently "thinking"
  const hasActiveAgent = groups.some(isGroupActive)

  // Determine which groups are "new" (contain traces beyond seenCount)
  const getGroupIsNew = (groupIndex: number): boolean => {
    let traceCount = 0
    for (let i = 0; i <= groupIndex; i++) {
      traceCount += groups[i].traces.length
    }
    return traceCount > seenCount
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Agent Trace</h2>
            {hasActiveAgent && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <PulsingDot />
                <span>Processing...</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
            {groups.length} agent{groups.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Agent groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-xs">No agent activity yet</p>
            <p className="text-[10px] mt-1">Send a message to see traces</p>
          </div>
        ) : (
          groups.map((group, i) => (
            <AgentGroupCard
              key={`${group.agent}-${group.startTime}`}
              group={group}
              isNew={getGroupIsNew(i)}
              isActive={isGroupActive(group)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
