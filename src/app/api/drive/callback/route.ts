import { NextRequest, NextResponse } from "next/server"

// GET /api/drive/callback - Handle OAuth callback from Composio
export async function GET(request: NextRequest) {
  // Composio handles the OAuth flow - we just redirect back to the app
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")

  if (status === "success") {
    // Redirect to app with success message
    return NextResponse.redirect(new URL("/?drive=connected", request.url))
  }

  // Redirect with error
  return NextResponse.redirect(new URL("/?drive=error", request.url))
}
