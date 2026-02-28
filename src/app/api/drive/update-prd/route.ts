import { NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

type Amendment = {
  timestamp: string
  deltaDays: number
  deltaCostUsd: number
  rationale: string
  status: string
}

type PRDData = {
  prdId: string
  projectTitle: string
  clientName: string
  designerName: string
  brief: {
    description: string
    style: string
    referenceImageUrl: string
  }
  timeline: {
    totalDays: number
    phases: Array<{ name: string; week: number }>
    currentDay: number
    currentPhase: string
  }
  terms: {
    freeIterationsUntil: string
    hourlyRateAfter: number
    currency: string
  }
  summary: string
  amendments?: Amendment[]
}

// POST /api/drive/update-prd - Append budget amendment to local PRD JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deltaDays, deltaCostUsd, rationale } = body

    // Read the current PRD
    const prdPath = join(process.cwd(), "data", "prd.json")
    const prdContent = readFileSync(prdPath, "utf-8")
    const prd: PRDData = JSON.parse(prdContent)

    // Create amendment entry
    const timestamp = new Date().toISOString()
    // Strip surrounding quotes from LLM-generated rationale
    const cleanRationale = rationale.replace(/^["']|["']$/g, "").trim()
    const amendment: Amendment = {
      timestamp,
      deltaDays,
      deltaCostUsd,
      rationale: cleanRationale,
      status: "APPROVED BY CLIENT",
    }

    // Add to amendments array
    if (!prd.amendments) {
      prd.amendments = []
    }
    prd.amendments.push(amendment)

    // Update timeline totals
    prd.timeline.totalDays += deltaDays

    // Write back
    writeFileSync(prdPath, JSON.stringify(prd, null, 2))

    return NextResponse.json({
      success: true,
      fileName: "prd.json",
      timestamp,
      newTotalDays: prd.timeline.totalDays,
    })
  } catch (error) {
    console.error("Error updating PRD:", error)
    return NextResponse.json(
      { error: "Failed to update PRD" },
      { status: 500 }
    )
  }
}
