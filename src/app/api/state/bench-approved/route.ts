import { NextRequest, NextResponse } from "next/server"
import { getState, updateState } from "@/lib/state"

// POST /api/state/bench-approved - Update bench approval state
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { approved } = body

    const state = getState()
    updateState({
      decisions: {
        ...state.decisions,
        benchApproved: approved,
      },
    })

    return NextResponse.json({
      success: true,
      benchApproved: approved,
    })
  } catch (error) {
    console.error("Error updating state:", error)
    return NextResponse.json(
      { error: "Failed to update state" },
      { status: 500 }
    )
  }
}
