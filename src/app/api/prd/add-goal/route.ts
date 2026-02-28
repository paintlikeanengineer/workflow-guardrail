import { NextRequest, NextResponse } from "next/server"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

type Goal = {
  id: string
  description: string
  source: string
  timestamp: string
}

// POST /api/prd/add-goal - Add a goal from client decision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questionId, question, answer } = body

    // Read the current PRD
    const prdPath = join(process.cwd(), "data", "prd.json")
    const prdContent = readFileSync(prdPath, "utf-8")
    const prd = JSON.parse(prdContent)

    // Create goal from answer
    const timestamp = new Date().toISOString()
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      description: `${question}: ${answer}`,
      source: `Client decision (${questionId})`,
      timestamp,
    }

    // Add to goals array
    if (!prd.goals) {
      prd.goals = []
    }
    prd.goals.push(goal)

    // Write back
    writeFileSync(prdPath, JSON.stringify(prd, null, 2))

    return NextResponse.json({
      success: true,
      goal,
    })
  } catch (error) {
    console.error("Error adding goal:", error)
    return NextResponse.json(
      { error: "Failed to add goal" },
      { status: 500 }
    )
  }
}
