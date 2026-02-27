"use client"

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

export function TracePanel({ traces }: Props) {
  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold">Trace</h2>
      </div>

      {/* Trace events */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {traces.length === 0 ? (
          <p className="text-xs text-gray-500">No agent activity yet</p>
        ) : (
          traces.map((trace, i) => (
            <div
              key={i}
              className="text-xs border-l-2 border-gray-700 pl-2 py-1"
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className={statusColors[trace.status]}>
                    {statusIcons[trace.status]}
                  </span>
                  <span className="font-medium">{trace.agent}</span>
                </div>
                <span className="text-gray-500">
                  {new Date(trace.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-gray-400 mt-0.5">{trace.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
