"use client"

import { useEffect, useState } from "react"

type ToastType = "success" | "info" | "warning"

type Props = {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  info: "bg-blue-600 text-white",
  warning: "bg-amber-500 text-white",
}

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  info: "ℹ",
  warning: "⚠",
}

export function Toast({ message, type = "success", duration = 3000, onClose }: Props) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const closeTimer = setTimeout(() => {
      onClose()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(closeTimer)
    }
  }, [duration, onClose])

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
        px-5 py-3 rounded-lg shadow-lg flex items-center gap-3
        ${typeStyles[type]}
        ${isExiting ? "animate-toastOut" : "animate-toastIn"}`}
    >
      <span className="text-lg">{typeIcons[type]}</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
