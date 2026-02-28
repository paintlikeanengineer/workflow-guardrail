import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

// GET /api/prd - Fetch current PRD data
export async function GET() {
  try {
    const prdPath = join(process.cwd(), "data", "prd.json")
    const prdContent = readFileSync(prdPath, "utf-8")
    const prd = JSON.parse(prdContent)
    return NextResponse.json(prd)
  } catch (error) {
    console.error("Error reading PRD:", error)
    return NextResponse.json(
      { error: "Failed to read PRD" },
      { status: 500 }
    )
  }
}
