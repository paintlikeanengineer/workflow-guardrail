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

type Props = {
  messages: Message[]
  currentView: "designer" | "client"
  pendingValidation?: PendingValidation | null
  onValidationAction?: (action: "fix" | "send") => void
  onSendAnnotatedImage?: (imageUrl: string) => void
  onAnswerQuestion?: (messageId: string, answer: string) => void
  isThinking?: boolean
}

// Typing indicator bubble
function ThinkingBubble() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
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
          {/* Preview message with opacity */}
          <div className="opacity-60">
            <MessageBubble
              message={pendingValidation.previewMessage}
              isCurrentUser={pendingValidation.previewMessage.sender === currentView}
              onSendAnnotatedImage={onSendAnnotatedImage}
              onAnswerQuestion={onAnswerQuestion}
            />
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

      <div ref={bottomRef} />
    </div>
  )
}
