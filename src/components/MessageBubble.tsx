"use client"

import { useState } from "react"
import { Message } from "@/types"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ImageAnnotator } from "./ImageAnnotator"

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
  message: Message
  isCurrentUser: boolean
  onSendAnnotatedImage?: (imageUrl: string, annotations: AnnotationData[], canvasWidth: number, canvasHeight: number, sourceImageName?: string) => void
  onAnswerQuestion?: (messageId: string, answer: string) => void
}

export function MessageBubble({ message, isCurrentUser, onSendAnnotatedImage, onAnswerQuestion }: Props) {
  const [showAnnotator, setShowAnnotator] = useState(false)
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
        {/* Image attachment with annotation support */}
        {message.type === "image" && message.attachments?.[0] && (
          <div className="mb-2 relative group">
            <img
              src={message.attachments[0]}
              alt="Attachment"
              className="rounded-lg max-w-full cursor-pointer"
              onClick={() => setShowAnnotator(true)}
            />
            {/* Edit overlay on hover */}
            <div
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
              onClick={() => setShowAnnotator(true)}
            >
              <div className="text-white text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 mx-auto mb-1">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs font-medium">Annotate</span>
              </div>
            </div>
          </div>
        )}

        {/* Konva Annotator Modal */}
        {showAnnotator && message.attachments?.[0] && (
          <ImageAnnotator
            imageUrl={message.attachments[0]}
            onClose={() => setShowAnnotator(false)}
            onSave={(imageBlob, annotations, canvasWidth, canvasHeight) => {
              console.log("Saved annotations:", annotations)
              // Create blob URL and send as new message
              const annotatedUrl = URL.createObjectURL(imageBlob)
              // Extract image name from attachment URL
              const sourceImageName = message.attachments?.[0]?.split("/").pop() || "unknown"
              onSendAnnotatedImage?.(annotatedUrl, annotations, canvasWidth, canvasHeight, sourceImageName)
              setShowAnnotator(false)
            }}
          />
        )}

        {/* Text content with markdown rendering */}
        <div className={`text-sm prose prose-sm max-w-none ${isCurrentUser ? "prose-invert" : ""}`}>
          <Markdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </Markdown>
        </div>

        {/* Question card if present */}
        {message.question && (
          <div className="mt-2 p-2 bg-black/10 rounded-lg">
            <p className="text-xs font-medium mb-1">{message.question.text}</p>
            <div className="flex flex-wrap gap-1">
              {message.question.options.map((opt) => {
                const isAnswered = !!message.question?.answer
                const isSelected = message.question?.answer === opt
                const canClick = !isAnswered && onAnswerQuestion

                return (
                  <button
                    key={opt}
                    onClick={() => canClick && onAnswerQuestion(message.messageId, opt)}
                    disabled={isAnswered}
                    className={`text-xs px-3 py-1.5 rounded transition-all ${
                      isSelected
                        ? "bg-white text-green-600 font-semibold ring-2 ring-green-500"
                        : isAnswered
                        ? "bg-white/30 text-gray-500 cursor-default"
                        : "bg-white/80 hover:bg-white hover:shadow cursor-pointer"
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
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
