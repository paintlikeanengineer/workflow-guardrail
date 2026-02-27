"use client"

import { useState } from "react"
import { TraceEvent } from "@/types"

type Props = {
  traces: TraceEvent[]
}

const statusIcons: Record<TraceEvent["status"], string> = {
  started: "▶",
  completed: "✓",
  violation: "✗",
  warning: "⚠",
  error: "✗",
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

function TraceEntry({ trace }: { trace: TraceEvent }) {
  const [expanded, setExpanded] = useState(false)
  const dataObj = trace.data && typeof trace.data === "object" ? trace.data as Record<string, unknown> : null
  const hasData = dataObj !== null && Object.keys(dataObj).length > 0

  return (
    <div
      className={`text-xs rounded-md border ${statusBgColors[trace.status]} transition-all`}
    >
      <div
        className={`p-2 ${hasData ? "cursor-pointer hover:bg-white/5" : ""}`}
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`${statusColors[trace.status]} text-sm`}>
              {statusIcons[trace.status]}
            </span>
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
  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agent Trace</h2>
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
            <TraceEntry key={i} trace={trace} />
          ))
        )}
      </div>
    </div>
  )
}
