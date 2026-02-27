"use client"

type Props = {
  type: "scope_violation" | "cost_warning"
  title: string
  message: string
  onAction: (action: "fix" | "send") => void
  options?: string[]
}

export function ValidationCard({ type, title, message, onAction, options }: Props) {
  const isViolation = type === "scope_violation"

  // Different colors and icons based on type
  const headerBg = isViolation ? "bg-orange-500" : "bg-amber-500"
  const icon = isViolation ? "⚠️" : "💰"
  const headerTitle = isViolation ? "Scope Warning" : "Cost Impact"

  return (
    <div className="flex justify-center mb-2">
      <div className="max-w-[85%] rounded-2xl overflow-hidden shadow-lg bg-white">
        {/* Colored header bar with icon */}
        <div className={`${headerBg} px-4 py-3 flex items-center gap-3`}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-2xl">
            {icon}
          </div>
          <span className="text-white font-semibold text-lg">{headerTitle}</span>
        </div>

        {/* Content area */}
        <div className="p-5">
          <p className="text-gray-800 text-lg mb-4">{message}</p>

          {/* Option buttons */}
          <div className="flex flex-wrap gap-2">
            {options ? (
              options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onAction("send")}
                  className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                >
                  {opt}
                </button>
              ))
            ) : (
              <>
                {isViolation ? (
                  <>
                    <button
                      onClick={() => onAction("fix")}
                      className="px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-full hover:bg-orange-600 transition-colors"
                    >
                      Fix It
                    </button>
                    <button
                      onClick={() => onAction("send")}
                      className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Send Anyway
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onAction("fix")}
                      className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Don't Send
                    </button>
                    <button
                      onClick={() => onAction("send")}
                      className="px-5 py-2 bg-amber-500 text-white text-sm font-medium rounded-full hover:bg-amber-600 transition-colors"
                    >
                      Send Anyway
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
