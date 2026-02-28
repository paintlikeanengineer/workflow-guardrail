"use client"

import { useState } from "react"
import { ChatThread, ChatInput, TracePanel, ViewToggle, PRDPanel, Toast } from "@/components"
import { Message, TraceEvent, ScopeWatcherOutput, CostCalculatorOutput } from "@/types"
import threadData from "../../data/thread.json"
import prdData from "../../data/prd.json"

type PendingValidation = {
  id: string
  type: "scope_violation" | "cost_warning"
  title: string
  message: string
  previewMessage: Message
  data?: ScopeWatcherOutput | CostCalculatorOutput
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"designer" | "client">("designer")
  const [messages, setMessages] = useState<Message[]>(threadData.messages as Message[])
  const [traces, setTraces] = useState<TraceEvent[]>([])
  const [pendingValidation, setPendingValidation] = useState<PendingValidation | null>(null)
  const [rightPanelTab, setRightPanelTab] = useState<"trace" | "prd">("trace")
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null)
  const [isThinking, setIsThinking] = useState(false)

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
      setIsThinking(true)
      try {
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
            setIsThinking(false)
            // Show preview + validation inline
            setPendingValidation({
              id: `card-${Date.now()}`,
              type: "cost_warning",
              title: "Impact Warning",
              message: `This change would add ${costData.output.estimatedDays} day(s) and $${costData.output.estimatedCost} to the project. Still send?`,
              previewMessage: newMessage,
              data: costData.output,
            })
            return
          }
        }
      } finally {
        setIsThinking(false)
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
      setIsThinking(true)
      addTraces([{
        agent: "ScopeWatcher",
        status: "started",
        message: "Calling Cortex Vision to analyze image...",
        timestamp: Date.now(),
      }])

      let detectedObjects: string[] = []
      try {
        const formData = new FormData()
        formData.append("file", file)

        const visionRes = await fetch("/api/vision", {
          method: "POST",
          body: formData,
        })
        const visionData = await visionRes.json()
        detectedObjects = visionData.detectedObjects || []

        addTraces([{
          agent: "ScopeWatcher",
          status: "completed",
          message: `Detected ${detectedObjects.length} objects: ${detectedObjects.slice(0, 5).join(", ")}${detectedObjects.length > 5 ? "..." : ""}`,
          timestamp: Date.now(),
        }])
      } catch (err) {
        console.error("Vision API failed, using fallback:", err)
        detectedObjects = ["building", "awning", "sky", "trees"]
        addTraces([{
          agent: "ScopeWatcher",
          status: "warning",
          message: "Vision API unavailable, using fallback detection",
          timestamp: Date.now(),
        }])
      }

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
      setIsThinking(false)

      if (!scopeData.output.valid) {
        // Show preview + validation inline
        setPendingValidation({
          id: `card-${Date.now()}`,
          type: "scope_violation",
          title: "Missing Element",
          message: scopeData.output.violations[0]?.reason || "Design doesn't match approved scope",
          previewMessage: newMessage,
          data: scopeData.output,
        })
        return
      }
    }

    setMessages((prev) => [...prev, newMessage])
  }

  const handleValidationAction = async (action: "fix" | "send") => {
    if (action === "send" && pendingValidation) {
      // Send the message
      setMessages((prev) => [...prev, pendingValidation.previewMessage])

      // If this is a cost warning approval, update PRD in Google Drive
      if (pendingValidation.type === "cost_warning" && pendingValidation.data) {
        const costData = pendingValidation.data as CostCalculatorOutput

        addTraces([{
          agent: "PRD-Sync",
          status: "started",
          message: "Updating PRD in Google Drive...",
          timestamp: Date.now(),
        }])

        try {
          const res = await fetch("/api/drive/update-prd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deltaDays: costData.estimatedDays,
              deltaCostUsd: costData.estimatedCost,
              rationale: costData.reasoning,
            }),
          })
          const result = await res.json()

          if (result.success) {
            addTraces([{
              agent: "PRD-Sync",
              status: "completed",
              message: `PRD updated: ${result.fileName} [${new Date(result.timestamp).toLocaleTimeString()}]`,
              timestamp: Date.now(),
            }])
            setToast({ message: "PRD updated in Google Drive", type: "info" })
          } else {
            addTraces([{
              agent: "PRD-Sync",
              status: "warning",
              message: result.error || "Could not update PRD (Drive not connected)",
              timestamp: Date.now(),
            }])
          }
        } catch {
          addTraces([{
            agent: "PRD-Sync",
            status: "warning",
            message: "PRD sync skipped (Drive not connected)",
            timestamp: Date.now(),
          }])
        }
      }
    }

    // Show toast based on action and view
    if (action === "fix") {
      if (currentView === "designer") {
        // Designer chose to fix scope issue
        setToast({ message: "Saved 24hr iteration cycle!", type: "success" })
      } else {
        // Client chose not to send costly change
        setToast({ message: "Good call! Avoided scope creep.", type: "success" })
      }
    }

    // Both "fix" and "send" clear the validation (and preview disappears)
    setPendingValidation(null)
  }

  const participant = currentView === "designer"
    ? threadData.participants.designer
    : threadData.participants.client

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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

        {/* Messages + Inline Preview/Validation */}
        <ChatThread
          messages={messages}
          currentView={currentView}
          pendingValidation={pendingValidation}
          onValidationAction={handleValidationAction}
          onSendAnnotatedImage={(imageUrl) => {
            const newMessage: Message = {
              messageId: `msg-${Date.now()}`,
              sender: currentView,
              type: "image",
              content: "Here's the marked-up version",
              attachments: [imageUrl],
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, newMessage])
          }}
          onAnswerQuestion={(messageId, answer) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === messageId && msg.question
                  ? {
                      ...msg,
                      question: {
                        ...msg.question,
                        answer,
                        answeredAt: new Date().toISOString(),
                      },
                    }
                  : msg
              )
            )
          }}
          isThinking={isThinking}
        />

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

      {/* Right panel - 20% */}
      <div className="w-1/5 flex flex-col bg-gray-900">
        {/* Tab buttons */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setRightPanelTab("trace")}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              rightPanelTab === "trace"
                ? "bg-gray-800 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            Trace
          </button>
          <button
            onClick={() => setRightPanelTab("prd")}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              rightPanelTab === "prd"
                ? "bg-gray-800 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            PRD
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {rightPanelTab === "trace" ? (
            <TracePanel traces={traces} />
          ) : (
            <PRDPanel prd={prdData} />
          )}
        </div>
      </div>
    </div>
  )
}
