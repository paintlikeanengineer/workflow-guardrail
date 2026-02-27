import snowflake from "snowflake-sdk"
import fs from "fs"
import path from "path"
import os from "os"

// Configure Snowflake connection
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT || "sfsehol-llama_lounge_hackathon_xvhpkw",
  username: process.env.SNOWFLAKE_USER || "",
  password: process.env.SNOWFLAKE_PASSWORD || "",
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
  database: process.env.SNOWFLAKE_DATABASE || "POLICY_DB",
  schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
})

let isConnected = false

export async function connectSnowflake(): Promise<void> {
  if (isConnected) return

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        console.error("Snowflake connection error:", err)
        reject(err)
      } else {
        // Set warehouse after connection
        const warehouse = process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH"
        connection.execute({
          sqlText: `USE WAREHOUSE ${warehouse}`,
          complete: (whErr) => {
            if (whErr) {
              console.error("Failed to set warehouse:", whErr)
              reject(whErr)
            } else {
              isConnected = true
              console.log(`Snowflake connected, using warehouse: ${warehouse}`)
              resolve()
            }
          },
        })
      }
    })
  })
}

// Upload a file to Snowflake internal stage
export async function uploadToStage(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  await connectSnowflake()

  // Write buffer to temp file (PUT requires file path)
  const tempDir = os.tmpdir()
  const tempPath = path.join(tempDir, fileName)
  fs.writeFileSync(tempPath, new Uint8Array(fileBuffer))

  const stagePath = "@POLICY_DB.PUBLIC.MY_IMAGES"
  const putQuery = `PUT file://${tempPath} ${stagePath} AUTO_COMPRESS=FALSE OVERWRITE=TRUE`

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: putQuery,
      complete: (err) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempPath)
        } catch {}

        if (err) {
          console.error("PUT error:", err)
          reject(err)
        } else {
          console.log(`Uploaded ${fileName} to ${stagePath}`)
          resolve(fileName)
        }
      },
    })
  })
}

// Generate friendly explanation text using Cortex LLM
export async function generateExplanation(
  type: "scope_violation" | "cost_warning",
  context: Record<string, unknown>
): Promise<string> {
  await connectSnowflake()

  let prompt: string
  if (type === "scope_violation") {
    prompt = `You are a helpful assistant for a freelance designer. The designer is about to send work to a client, but it's missing an approved element.

Context:
- Missing element: ${context.missingElement || "bench with person"}
- This was specifically approved by the client earlier

Write a friendly, 1-2 sentence warning message. Be helpful, not scary. Keep it under 30 words.
Example: "Heads up! The bench scene from Rough C isn't in this version. The client loved that element - want to add it before sending?"`
  } else {
    prompt = `You are a helpful assistant for a creative project. A client has requested a change that would add time and cost.

Context:
- Additional days: ${context.days || 2}
- Additional cost: $${context.cost || 100}
- Change requested: "${context.changeRequest || "color changes throughout"}"

Write a friendly, 1-2 sentence message explaining the impact. Be matter-of-fact, not alarming. Keep it under 35 words.
Example: "This change would add about 2 days and $100 to the project. Want to check with Marcus before diving in?"`
  }

  const query = `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'claude-sonnet-4-5',
      '${prompt.replace(/'/g, "''")}'
    ) AS explanation
  `

  return new Promise((resolve) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Cortex explanation error:", err)
          // Fallback to generic message
          resolve(type === "scope_violation"
            ? "This design is missing an element the client approved. Review before sending?"
            : `This change would add ${context.days || 2} day(s) and $${context.cost || 100}. Still send?`)
        } else if (rows && rows.length > 0) {
          const result = rows[0] as { EXPLANATION: string }
          resolve(result.EXPLANATION.trim())
        } else {
          resolve(type === "scope_violation"
            ? "Missing approved element. Review before sending?"
            : "This change has cost implications. Still send?")
        }
      },
    })
  })
}

export async function detectObjectsInImage(imageName: string): Promise<string[]> {
  await connectSnowflake()

  // Cortex Vision query - matches hackathon plan format
  const query = `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'claude-sonnet-4-5',
      'Analyze this image and list all objects you can see. Return ONLY a JSON array of strings with object names, like ["building", "tree", "bench", "person"]. Be thorough - include architectural features, furniture, people, nature elements.',
      TO_FILE('@POLICY_DB.PUBLIC.MY_IMAGES', '${imageName}')
    ) AS detected_objects
  `

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Cortex Vision error:", err)
          // Fallback to empty array on error
          resolve([])
        } else if (rows && rows.length > 0) {
          try {
            const result = rows[0] as { DETECTED_OBJECTS: string }
            let jsonStr = result.DETECTED_OBJECTS

            // Strip markdown code blocks if present
            if (jsonStr.includes("```")) {
              jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
            }

            const objects = JSON.parse(jsonStr)
            console.log("Detected objects:", objects)
            resolve(Array.isArray(objects) ? objects : [])
          } catch (parseErr) {
            console.error("Failed to parse Cortex response:", parseErr)
            resolve([])
          }
        } else {
          resolve([])
        }
      },
    })
  })
}
