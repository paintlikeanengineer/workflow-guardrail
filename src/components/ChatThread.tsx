"use client"

import { Message } from "@/types"
import { MessageBubble } from "./MessageBubble"

type Props = {
  messages: Message[]
  currentView: "designer" | "client"
}

export function ChatThread({ messages, currentView }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.map((message) => (
        <MessageBubble
          key={message.messageId}
          message={message}
          isCurrentUser={message.sender === currentView}
        />
      ))}
    </div>
  )
}
