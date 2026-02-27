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
}

export function ChatThread({
  messages,
  currentView,
  pendingValidation,
  onValidationAction,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages or pending validation changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, pendingValidation])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
      {messages.map((message) => (
        <MessageBubble
          key={message.messageId}
          message={message}
          isCurrentUser={message.sender === currentView}
        />
      ))}

      {/* Pending preview message (grayed out) + Validation card */}
      {pendingValidation && (
        <>
          {/* Preview message with opacity */}
          <div className="opacity-60">
            <MessageBubble
              message={pendingValidation.previewMessage}
              isCurrentUser={pendingValidation.previewMessage.sender === currentView}
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
