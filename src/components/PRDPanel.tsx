"use client"

type Goal = {
  id: string
  description: string
  source: string
  timestamp: string
}

type Amendment = {
  timestamp: string
  deltaDays: number
  deltaCostUsd: number
  rationale: string
  status: string
}

type PRDData = {
  prdId: string
  projectTitle: string
  clientName: string
  designerName: string
  goals?: Goal[]
  brief: {
    description: string
    style: string
    referenceImageUrl: string
  }
  timeline: {
    totalDays: number
    phases: { name: string; week: number }[]
    currentDay: number
    currentPhase: string
  }
  terms: {
    freeIterationsUntil: string
    hourlyRateAfter: number
    currency: string
    autoApproveThreshold?: {
      maxHours: number
      maxCost: number
    }
  }
  summary: string
  amendments?: Amendment[]
}

type Props = {
  prd: PRDData
  onReset?: () => void
}

export function PRDPanel({ prd, onReset }: Props) {
  const progressPercent = Math.round((prd.timeline.currentDay / prd.timeline.totalDays) * 100)

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Project Brief</h2>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-white hover:bg-gray-700 px-2 py-1 rounded transition-colors"
            title="Reset PRD for demo"
          >
            Reset
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Project Title */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Project</h3>
          <p className="text-sm font-medium text-white">{prd.projectTitle}</p>
        </div>

        {/* Client & Designer */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</h3>
            <p className="text-sm text-gray-200">{prd.clientName}</p>
          </div>
          <div>
            <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Designer</h3>
            <p className="text-sm text-gray-200">{prd.designerName}</p>
          </div>
        </div>

        {/* Timeline Progress */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Timeline</h3>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-400">{prd.timeline.currentPhase}</span>
            <span className="text-gray-400">Day {prd.timeline.currentDay}/{prd.timeline.totalDays}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Brief Description */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Brief</h3>
          <p className="text-xs text-gray-300 leading-relaxed">{prd.brief.description}</p>
        </div>

        {/* Style */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Style</h3>
          <div className="flex flex-wrap gap-1">
            {prd.brief.style.split(", ").map((s) => (
              <span key={s} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Goals / Client Decisions */}
        {prd.goals && prd.goals.length > 0 && (
          <div>
            <h3 className="text-xs text-green-400 uppercase tracking-wide mb-2">Client Decisions</h3>
            <div className="space-y-1">
              {prd.goals.map((g) => (
                <div key={g.id} className="bg-green-900/20 border border-green-700/30 rounded px-2 py-1">
                  <p className="text-xs text-gray-200">{g.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contract Terms */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Terms</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <p>Free iterations until: <span className="text-green-400">{prd.terms.freeIterationsUntil}</span></p>
            <p>Rate after: <span className="text-amber-400">${prd.terms.hourlyRateAfter}/hr</span></p>
            {prd.terms.autoApproveThreshold && (
              <p>Auto-approve limit: <span className="text-blue-400">{prd.terms.autoApproveThreshold.maxHours}hr / ${prd.terms.autoApproveThreshold.maxCost}</span></p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-800/50 rounded-lg p-2">
          <h3 className="text-xs text-gray-400 uppercase tracking-wide mb-1">TL;DR</h3>
          <p className="text-xs text-gray-300 italic">{prd.summary}</p>
        </div>

        {/* Amendments */}
        {prd.amendments && prd.amendments.length > 0 && (
          <div className="border-t border-gray-700 pt-3">
            <h3 className="text-xs text-amber-400 uppercase tracking-wide mb-2">Amendments</h3>
            <div className="space-y-2">
              {prd.amendments.map((a, i) => (
                <div key={i} className="bg-amber-900/20 border border-amber-700/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-400 font-medium">+{a.deltaDays} day(s), +${a.deltaCostUsd}</span>
                    <span className="text-xs text-gray-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-gray-300">{a.rationale}</p>
                  <span className="text-xs text-green-400">{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
