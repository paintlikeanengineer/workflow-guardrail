"use client"

import { useState } from "react"
import { ChatThread, ChatInput, TracePanel, ViewToggle } from "@/components"
import { Message, TraceEvent, ScopeWatcherOutput, CostCalculatorOutput } from "@/types"
import threadData from "../../data/thread.json"

type ValidationCard = {
  id: string
  type: "scope_violation" | "cost_warning"
  title: string
  message: string
  data?: ScopeWatcherOutput | CostCalculatorOutput
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"designer" | "client">("designer")
  const [messages, setMessages] = useState<Message[]>(threadData.messages as Message[])
  const [traces, setTraces] = useState<TraceEvent[]>([])
  const [validationCard, setValidationCard] = useState<ValidationCard | null>(null)
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null)

  const addTraces = (newTraces: TraceEvent[]) => {
    setTraces((prev) => [...prev, ...newTraces])
  }

  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      messageId: `msg-${Date.now()}`,
      sender: currentView,
      type: "text",
      content,
      timestamp: new Date().toISOString(),
    }

    // If client is sending, check for non-trivial changes
    if (currentView === "client") {
      // Call change-triage
      const triageRes = await fetch("/api/change-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      })
      const triageData = await triageRes.json()
      addTraces(triageData.traces)

      if (triageData.isNonTrivial) {
        // Call cost-calculator
        const costRes = await fetch("/api/cost-calculator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: triageData.output.task,
            complexity: triageData.output.task?.complexity || "major",
          }),
        })
        const costData = await costRes.json()
        addTraces(costData.traces)

        if (costData.output.recommendation === "warn") {
          // Show validation card, hold the message
          setPendingMessage(newMessage)
          setValidationCard({
            id: `card-${Date.now()}`,
            type: "cost_warning",
            title: "Impact Warning",
            message: `This change would add ${costData.output.estimatedDays} day(s) and $${costData.output.estimatedCost} to the project. Still send?`,
            data: costData.output,
          })
          return // Don't send yet
        }
      }
    }

    // No issues, send immediately
    setMessages((prev) => [...prev, newMessage])
  }

  const handleUploadImage = async (file: File) => {
    const imageUrl = URL.createObjectURL(file)

    const newMessage: Message = {
      messageId: `msg-${Date.now()}`,
      sender: currentView,
      type: "image",
      content: "Here's the latest version",
      attachments: [imageUrl],
      timestamp: new Date().toISOString(),
    }

    // If designer is uploading, check scope
    if (currentView === "designer") {
      // For demo: simulate detected objects (no bench)
      // In real app, this would call Cortex Vision
      const detectedObjects = ["building", "awning", "sky", "trees"]

      const scopeRes = await fetch("/api/scope-watcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: file.name,
          detectedObjects,
        }),
      })
      const scopeData = await scopeRes.json()
      addTraces(scopeData.traces)

      if (!scopeData.output.valid) {
        // Show validation card
        setPendingMessage(newMessage)
        setValidationCard({
          id: `card-${Date.now()}`,
          type: "scope_violation",
          title: "Missing Element",
          message: scopeData.output.violations[0]?.reason || "Design doesn't match approved scope",
          data: scopeData.output,
        })
        return // Don't send yet
      }
    }

    setMessages((prev) => [...prev, newMessage])
  }

  const handleValidationAction = (action: "send" | "cancel") => {
    if (action === "send" && pendingMessage) {
      setMessages((prev) => [...prev, pendingMessage])
    }
    setPendingMessage(null)
    setValidationCard(null)
  }

  const participant = currentView === "designer"
    ? threadData.participants.designer
    : threadData.participants.client

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat area - 80% */}
      <div className="flex flex-col w-4/5 border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-lg">
              {participant.name[0]}
            </div>
            <div>
              <h1 className="font-semibold">{participant.name}</h1>
              <p className="text-xs text-gray-500">
                {currentView === "client" ? "Marketing Director" : "Freelance Designer"}
              </p>
            </div>
          </div>
          <ViewToggle currentView={currentView} onToggle={setCurrentView} />
        </div>

        {/* Messages */}
        <ChatThread messages={messages} currentView={currentView} />

        {/* Validation Card */}
        {validationCard && (
          <div className="mx-4 mb-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800">{validationCard.title}</h3>
            <p className="text-sm text-yellow-700 mt-1">{validationCard.message}</p>
            <div className="flex gap-2 mt-3">
              {validationCard.type === "scope_violation" ? (
                <>
                  <button
                    onClick={() => handleValidationAction("cancel")}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Fix It
                  </button>
                  <button
                    onClick={() => handleValidationAction("send")}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Send Anyway
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleValidationAction("cancel")}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Don't Send
                  </button>
                  <button
                    onClick={() => handleValidationAction("send")}
                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                  >
                    Send Anyway
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onUploadImage={handleUploadImage}
          placeholder={
            currentView === "designer"
              ? "Send update to Marcus..."
              : "Send feedback to Athena..."
          }
        />
      </div>

      {/* Trace panel - 20% */}
      <div className="w-1/5">
        <TracePanel traces={traces} />
      </div>
    </div>
  )
}
