"use client"

type Props = {
  type: "scope_violation" | "cost_warning"
  title: string
  message: string
  onAction: (action: "fix" | "send") => void
}

export function ValidationCard({ type, title, message, onAction }: Props) {
  const isViolation = type === "scope_violation"

  return (
    <div className="flex justify-center mb-2">
      <div className={`max-w-[80%] p-4 rounded-xl border-2 ${
        isViolation
          ? "bg-red-50 border-red-200"
          : "bg-yellow-50 border-yellow-200"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`text-2xl ${isViolation ? "text-red-500" : "text-yellow-500"}`}>
            {isViolation ? "⚠️" : "💰"}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${
              isViolation ? "text-red-800" : "text-yellow-800"
            }`}>
              {title}
            </h3>
            <p className={`text-sm mt-1 ${
              isViolation ? "text-red-700" : "text-yellow-700"
            }`}>
              {message}
            </p>
            <div className="flex gap-2 mt-3">
              {isViolation ? (
                <>
                  <button
                    onClick={() => onAction("fix")}
                    className="px-4 py-1.5 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 transition-colors"
                  >
                    Fix It
                  </button>
                  <button
                    onClick={() => onAction("send")}
                    className="px-4 py-1.5 bg-white text-red-600 text-sm font-medium rounded-full border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Send Anyway
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onAction("fix")}
                    className="px-4 py-1.5 bg-white text-yellow-700 text-sm font-medium rounded-full border border-yellow-200 hover:bg-yellow-50 transition-colors"
                  >
                    Don't Send
                  </button>
                  <button
                    onClick={() => onAction("send")}
                    className="px-4 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-full hover:bg-yellow-600 transition-colors"
                  >
                    Send Anyway
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
