import { NextRequest, NextResponse } from "next/server"
import {
  listDriveFiles,
  downloadDriveFile,
  getGoogleDriveAuthUrl,
  getConnectedAccount,
} from "@/lib/composio"

// GET /api/drive - List files or get auth URL
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  try {
    if (action === "auth-url") {
      // Get OAuth URL for connecting Google Drive
      const redirectUrl = `${request.nextUrl.origin}/api/drive/callback`
      const authUrl = await getGoogleDriveAuthUrl(redirectUrl)
      return NextResponse.json({ authUrl })
    }

    // Check if connected
    const connectedAccountId = await getConnectedAccount()
    if (!connectedAccountId) {
      return NextResponse.json({
        connected: false,
        message: "Google Drive not connected",
      })
    }

    if (action === "list") {
      const query = searchParams.get("query") || undefined
      const files = await listDriveFiles(query)
      return NextResponse.json({ connected: true, files })
    }

    if (action === "download") {
      const fileId = searchParams.get("fileId")
      if (!fileId) {
        return NextResponse.json({ error: "fileId required" }, { status: 400 })
      }
      const content = await downloadDriveFile(fileId)
      return NextResponse.json({ content })
    }

    // Default: return connection status
    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error("Drive API error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
