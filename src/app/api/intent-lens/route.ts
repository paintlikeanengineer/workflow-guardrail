import { NextRequest, NextResponse } from "next/server"
import { analyzeAnnotations } from "@/lib/intent-lens"
import { TraceEvent } from "@/types"

type Annotation = {
  type: "rect" | "circle" | "line" | "text"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const {
      annotations,
      imageName,
      canvasWidth,
      canvasHeight,
    }: {
      annotations: Annotation[]
      imageName: string
      canvasWidth: number
      canvasHeight: number
    } = body

    const traces: TraceEvent[] = [
      {
        agent: "IntentLens",
        status: "started",
        message: `Analyzing ${annotations.length} annotation(s) on ${imageName}...`,
        timestamp: startTime,
      },
    ]

    if (!annotations || annotations.length === 0) {
      traces.push({
        agent: "IntentLens",
        status: "completed",
        message: "No annotations to analyze",
        timestamp: Date.now(),
      })

      return NextResponse.json({
        success: true,
        output: {
          intents: [],
          overallSummary: "No annotations provided",
          isMinorOverall: true,
        },
        traces,
      })
    }

    const result = analyzeAnnotations(
      annotations,
      imageName,
      canvasWidth || 800,
      canvasHeight || 600
    )

    traces.push({
      agent: "IntentLens",
      status: "completed",
      message: result.overallSummary,
      timestamp: Date.now(),
      data: {
        regions: result.intents.map((i) => i.label),
        isMinor: result.isMinorOverall,
      },
    })

    return NextResponse.json({
      success: true,
      output: result,
      traces,
    })
  } catch (error) {
    console.error("IntentLens error:", error)

    return NextResponse.json({
      success: false,
      error: "Failed to analyze annotations",
      traces: [
        {
          agent: "IntentLens",
          status: "error",
          message: "Failed to analyze annotations",
          timestamp: Date.now(),
        },
      ],
    })
  }
}
