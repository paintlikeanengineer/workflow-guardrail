import { NextRequest, NextResponse } from "next/server"
import { findPrdFile, appendToDriveFile } from "@/lib/composio"

// POST /api/drive/update-prd - Append budget amendment to PRD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deltaDays, deltaCostUsd, rationale } = body

    // Find the PRD file
    const prdFile = await findPrdFile()
    if (!prdFile) {
      return NextResponse.json(
        { error: "PRD file not found in Google Drive" },
        { status: 404 }
      )
    }

    // Build the amendment text
    const amendment = [
      `Timeline Extension: +${deltaDays} days`,
      `Budget Increase: +$${deltaCostUsd}`,
      `Rationale: ${rationale}`,
      `Status: APPROVED BY CLIENT`,
    ].join("\n")

    // Append to the file
    const result = await appendToDriveFile(prdFile.id, amendment)

    return NextResponse.json({
      success: true,
      fileId: prdFile.id,
      fileName: prdFile.name,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error("Error updating PRD:", error)
    return NextResponse.json(
      { error: "Failed to update PRD" },
      { status: 500 }
    )
  }
}
