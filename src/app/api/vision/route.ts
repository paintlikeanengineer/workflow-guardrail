import { NextRequest, NextResponse } from "next/server"
import { detectObjectsInImage, uploadToStage } from "@/lib/snowflake"

// POST /api/vision
// Uploads image to Snowflake stage, then calls Cortex Vision
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    let imageName: string
    let useExistingStaged = false

    if (contentType.includes("multipart/form-data")) {
      // File upload - stage it first
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        )
      }

      // Generate unique filename
      const timestamp = Date.now()
      const ext = file.name.split(".").pop() || "png"
      imageName = `upload_${timestamp}.${ext}`

      // Upload to Snowflake stage
      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadToStage(buffer, imageName)
    } else {
      // JSON request - use existing staged image
      const body = await request.json()
      imageName = body.imageName

      if (!imageName) {
        return NextResponse.json(
          { success: false, error: "imageName required" },
          { status: 400 }
        )
      }

      // Check if it's a known demo image
      const demoImages = ["v1_no_bench.png", "v2_with_bench.jpg", "roughs.jpg", "reference.jpg"]
      useExistingStaged = demoImages.includes(imageName)

      if (!useExistingStaged) {
        // Unknown image - default to v1_no_bench for demo
        imageName = "v1_no_bench.png"
      }
    }

    console.log(`Calling Cortex Vision for: ${imageName}`)
    const detectedObjects = await detectObjectsInImage(imageName)

    return NextResponse.json({
      success: true,
      imageName,
      detectedObjects,
    })
  } catch (error) {
    console.error("Vision API error:", error)
    return NextResponse.json(
      { success: false, error: String(error), detectedObjects: [] },
      { status: 500 }
    )
  }
}
