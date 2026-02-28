import { NextResponse } from "next/server"
import { getEditHistoryFromSnowflake } from "@/lib/snowflake"

// GET /api/test-snowflake - Test Snowflake connection and view edit history
export async function GET() {
  try {
    const editHistory = await getEditHistoryFromSnowflake()

    return NextResponse.json({
      success: true,
      recordCount: editHistory.length,
      sample: editHistory.slice(0, 5),
      columns: editHistory.length > 0 ? Object.keys(editHistory[0]) : [],
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 })
  }
}
