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
