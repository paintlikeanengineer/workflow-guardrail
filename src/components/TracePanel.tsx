"use client"

import { useState, useEffect, useRef } from "react"
import { TraceEvent } from "@/types"

type Props = {
  traces: TraceEvent[]
}

const statusColors: Record<TraceEvent["status"], string> = {
  started: "text-blue-500",
  completed: "text-green-500",
  violation: "text-red-500",
  warning: "text-yellow-500",
  error: "text-red-500",
}

const statusBgColors: Record<TraceEvent["status"], string> = {
  started: "bg-blue-500/10 border-blue-500/30",
  completed: "bg-green-500/10 border-green-500/30",
  violation: "bg-red-500/10 border-red-500/30",
  warning: "bg-yellow-500/10 border-yellow-500/30",
  error: "bg-red-500/10 border-red-500/30",
}

// Pulsing dot for "thinking" state
function PulsingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
    </span>
  )
}

// Status icons - pulsing only if agent is still active
function StatusIcon({ status, isActive }: { status: TraceEvent["status"]; isActive: boolean }) {
  const icons: Record<TraceEvent["status"], string> = {
    started: "▶",
    completed: "✓",
    violation: "✗",
    warning: "⚠",
    error: "✗",
  }

  // Only pulse if started AND still active (no follow-up trace)
  if (status === "started" && isActive) {
    return <PulsingDot />
  }

  return (
    <span className={`${statusColors[status]} text-sm`}>
      {icons[status]}
    </span>
  )
}

function TraceEntry({ trace, isNew, isActive }: { trace: TraceEvent; isNew: boolean; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const dataObj = trace.data && typeof trace.data === "object" ? trace.data as Record<string, unknown> : null
  const hasData = dataObj !== null && Object.keys(dataObj).length > 0

  return (
    <div
      className={`text-xs rounded-md border ${statusBgColors[trace.status]} transition-all duration-300 ${
        isNew ? "animate-slideIn" : ""
      }`}
    >
      <div
        className={`p-2 ${hasData ? "cursor-pointer hover:bg-white/5" : ""}`}
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={trace.status} isActive={isActive} />
            <span className="font-semibold text-gray-200">{trace.agent}</span>
            {hasData ? (
              <span className="text-gray-500 text-[10px]">
                {expanded ? "▼" : "▶"}
              </span>
            ) : null}
          </div>
          <span className="text-gray-500 text-[10px]">
            {new Date(trace.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
        <p className="text-gray-300 mt-1 leading-relaxed">{trace.message}</p>
      </div>

      {/* Expandable data section */}
      {expanded && dataObj ? (
        <div className="px-2 pb-2 pt-1 border-t border-gray-700/50">
          <div className="bg-gray-800/50 rounded p-2 font-mono text-[10px] text-gray-400 overflow-x-auto">
            {formatTraceData(dataObj)}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatTraceData(data: unknown): React.ReactNode {
  if (!data || typeof data !== "object") return <span>{String(data)}</span>

  const entries = Object.entries(data as Record<string, unknown>)
  return (
    <div className="space-y-1">
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

  // Track new traces for animation
  useEffect(() => {
    if (traces.length > seenCount) {
      // Scroll to bottom when new traces arrive
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      // Mark as seen after animation
      const timer = setTimeout(() => setSeenCount(traces.length), 500)
      return () => clearTimeout(timer)
    }
  }, [traces.length, seenCount])

  // Determine which "started" traces are still active (no follow-up from same agent)
  const isTraceActive = (trace: TraceEvent, index: number): boolean => {
    if (trace.status !== "started") return false
    // Check if there's a later trace from same agent with non-started status
    return !traces.slice(index + 1).some(
      t => t.agent === trace.agent && t.status !== "started"
    )
  }

  // Check if any agent is currently "thinking"
  const hasActiveAgent = traces.some((t, i) => isTraceActive(t, i))

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
            {traces.length} events
          </span>
        </div>
      </div>

      {/* Trace events */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <span className="text-2xl mb-2">🔍</span>
            <p className="text-xs">No agent activity yet</p>
            <p className="text-[10px] mt-1">Send a message to see traces</p>
          </div>
        ) : (
          traces.map((trace, i) => (
            <TraceEntry key={i} trace={trace} isNew={i >= seenCount} isActive={isTraceActive(trace, i)} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
