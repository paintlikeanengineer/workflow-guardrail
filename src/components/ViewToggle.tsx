"use client"

type Props = {
  currentView: "designer" | "client"
  onToggle: (view: "designer" | "client") => void
}

export function ViewToggle({ currentView, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      <button
        onClick={() => onToggle("designer")}
        className={`px-3 py-1 text-sm rounded-full transition-colors ${
          currentView === "designer"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Designer
      </button>
      <button
        onClick={() => onToggle("client")}
        className={`px-3 py-1 text-sm rounded-full transition-colors ${
          currentView === "client"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Client
      </button>
    </div>
  )
}
