import { NextResponse } from "next/server"
import { writeFileSync } from "fs"
import { join } from "path"

const DEFAULT_PRD = {
  prdId: "prd-eye-clinics-001",
  projectTitle: "Eye Clinics of San Jose - Advertising Poster",
  clientName: "Eye Clinics of San Jose",
  designerName: "Athena",
  goals: [],
  brief: {
    description: "Need a poster for our new advertising campaign starting July. We like your stylized drawings we saw on a mural in Santana Row. Campaign should stylize our newly constructed facility and appear playful and inviting. Here is the reference picture of our new facility that's open just this week! Some empty spaces on the poster will allow us to reuse it for online campaigns as well.",
    style: "stylized, playful, inviting",
    referenceImageUrl: "/images/reference.jpg",
  },
  timeline: {
    totalDays: 30,
    phases: [
      { name: "Roughs", week: 1 },
      { name: "Style Selection", week: 2 },
      { name: "Final Design", week: 3 },
    ],
    currentDay: 12,
    currentPhase: "Style Selection",
  },
  terms: {
    freeIterationsUntil: "roughs picked",
    hourlyRateAfter: 50,
    currency: "USD",
    autoApproveThreshold: {
      maxHours: 2,
      maxCost: 100,
    },
  },
  summary: "30-day poster project for Eye Clinics of San Jose. Stylized illustration of new facility. Roughs week 1, style pick week 2, final week 3. $50/hr after roughs approved.",
}

// POST /api/prd/reset - Reset PRD to default state
export async function POST() {
  try {
    const prdPath = join(process.cwd(), "data", "prd.json")
    writeFileSync(prdPath, JSON.stringify(DEFAULT_PRD, null, 2))

    return NextResponse.json({
      success: true,
      message: "PRD reset to default state",
    })
  } catch (error) {
    console.error("Error resetting PRD:", error)
    return NextResponse.json(
      { error: "Failed to reset PRD" },
      { status: 500 }
    )
  }
}
