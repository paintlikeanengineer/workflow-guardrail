"use client"

import { useEffect, useRef } from "react"
import { Message } from "@/types"
import { MessageBubble } from "./MessageBubble"
import { ValidationCard } from "./ValidationCard"

type PendingValidation = {
  id: string
  type: "scope_violation" | "cost_warning"
  title: string
  message: string
  previewMessage: Message
}

type AnnotationData = {
  id: string
  type: "rect" | "circle" | "arrow" | "text"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
  color: string
}

type Props = {
  messages: Message[]
  currentView: "designer" | "client"
  pendingValidation?: PendingValidation | null
  onValidationAction?: (action: "fix" | "send") => void
  onSendAnnotatedImage?: (imageUrl: string, annotations: AnnotationData[], canvasWidth: number, canvasHeight: number, sourceImageName?: string) => void
  onAnswerQuestion?: (messageId: string, answer: string) => void
  isThinking?: boolean
}

// Centered thinking indicator
function ThinkingBubble() {
  return (
    <div className="flex justify-center my-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <span className="animate-pulse">Thinking</span>
        <span className="flex gap-1">
          <span
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "0.6s" }}
          />
        </span>
      </div>
    </div>
  )
}

export function ChatThread({
  messages,
  currentView,
  pendingValidation,
  onValidationAction,
  onSendAnnotatedImage,
  onAnswerQuestion,
  isThinking = false,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages, pending validation, or thinking state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pendingValidation, isThinking])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
      {messages.map((message) => (
        <MessageBubble
          key={message.messageId}
          message={message}
          isCurrentUser={message.sender === currentView}
          onSendAnnotatedImage={onSendAnnotatedImage}
          onAnswerQuestion={onAnswerQuestion}
        />
      ))}

      {/* Thinking indicator */}
      {isThinking && <ThinkingBubble />}

      {/* Pending preview message (grayed out) + Validation card */}
      {pendingValidation && (
        <>
          {/* Preview message with opacity + held pill */}
          <div className="relative">
            <div className="opacity-50">
              <MessageBubble
                message={pendingValidation.previewMessage}
                isCurrentUser={pendingValidation.previewMessage.sender === currentView}
                onSendAnnotatedImage={onSendAnnotatedImage}
                onAnswerQuestion={onAnswerQuestion}
              />
            </div>
            {/* Held for validation pill */}
            <div className={`absolute top-0 right-4 transform -translate-y-1/2 px-2.5 py-1 rounded-full text-xs font-medium shadow-md flex items-center gap-1.5 ${
              pendingValidation.type === "scope_violation"
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  pendingValidation.type === "scope_violation" ? "bg-red-300" : "bg-amber-300"
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  pendingValidation.type === "scope_violation" ? "bg-red-200" : "bg-amber-200"
                }`}></span>
              </span>
              {pendingValidation.type === "scope_violation" ? "Blocked" : "Held for review"}
            </div>
          </div>

          {/* Validation card inline */}
          <ValidationCard
            type={pendingValidation.type}
            title={pendingValidation.title}
            message={pendingValidation.message}
            onAction={onValidationAction || (() => {})}
          />
        </>
      )}

      {/* Extra space at bottom so messages aren't hidden by video controls during recording */}
      <div ref={bottomRef} className="h-24" />
    </div>
  )
}
