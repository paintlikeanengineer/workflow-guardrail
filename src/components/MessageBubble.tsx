"use client"

import { Message } from "@/types"

type Props = {
  message: Message
  isCurrentUser: boolean
}

export function MessageBubble({ message, isCurrentUser }: Props) {
  const alignment = isCurrentUser ? "justify-end" : "justify-start"
  const bubbleColor = isCurrentUser
    ? "bg-green-500 text-white"
    : "bg-white text-gray-900 border border-gray-200"
  const bubbleRounding = isCurrentUser
    ? "rounded-2xl rounded-br-md"
    : "rounded-2xl rounded-bl-md"

  return (
    <div className={`flex ${alignment} mb-2`}>
      <div className={`max-w-[70%] px-4 py-2 ${bubbleColor} ${bubbleRounding}`}>
        {/* Image attachment */}
        {message.type === "image" && message.attachments?.[0] && (
          <div className="mb-2">
            <img
              src={message.attachments[0]}
              alt="Attachment"
              className="rounded-lg max-w-full"
            />
          </div>
        )}

        {/* Text content */}
        <p className="text-sm">{message.content}</p>

        {/* Question card if present */}
        {message.question && (
          <div className="mt-2 p-2 bg-black/10 rounded-lg">
            <p className="text-xs font-medium mb-1">{message.question.text}</p>
            <div className="flex flex-wrap gap-1">
              {message.question.options.map((opt) => (
                <span
                  key={opt}
                  className={`text-xs px-2 py-1 rounded ${
                    message.question?.answer === opt
                      ? "bg-white text-green-600 font-medium"
                      : "bg-white/50"
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs mt-1 ${isCurrentUser ? "text-green-100" : "text-gray-400"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  )
}
