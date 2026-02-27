"use client"

type Props = {
  imageUrl: string
  avatarUrl?: string
  showEditIcon?: boolean
  onEdit?: () => void
}

// Edit/pencil icon SVG
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function DesignCard({ imageUrl, avatarUrl, showEditIcon = false, onEdit }: Props) {
  return (
    <div className="flex justify-center mb-2">
      <div className="max-w-[85%] rounded-2xl overflow-hidden shadow-lg bg-white">
        {/* Warm brown/terracotta header bar */}
        <div className="bg-[#a85a4a] px-4 py-3 flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Designer"
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
              D
            </div>
          )}
          <span className="text-white font-semibold text-lg">Design</span>
        </div>

        {/* Content area with image */}
        <div className="p-4 relative">
          {/* Edit icon overlay - hidden by default until Konva integration */}
          {showEditIcon && (
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer text-gray-700/70 hover:text-gray-900 transition-colors"
              onClick={onEdit}
            >
              <EditIcon />
            </div>
          )}

          {/* Image */}
          <img
            src={imageUrl}
            alt="Design preview"
            className="w-full rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}
