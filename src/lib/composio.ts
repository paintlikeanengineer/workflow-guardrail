import { Composio } from "composio-core"

// Initialize Composio client
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY })

// Default entity for the demo
const ENTITY_ID = "demo-user"

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

// Initiate Google Drive connection (get OAuth URL)
export async function getGoogleDriveAuthUrl(redirectUri?: string): Promise<string> {
  const connection = await composio.connectedAccounts.initiate({
    appName: "googledrive",
    entityId: ENTITY_ID,
    redirectUri,
  })
  return connection.redirectUrl || ""
}

// Get connected account for Google Drive
export async function getConnectedAccount(): Promise<string | null> {
  try {
    const accounts = await composio.connectedAccounts.list({
      appNames: "googledrive",
    })
    // Just get the first active googledrive account
    const items = accounts.items as Array<{ id: string; status?: string }>
    const account = items?.find((a) => a.status === "ACTIVE") || items?.[0]
    console.log("Found connected accounts:", items?.length, "Using:", account?.id)
    return account?.id || null
  } catch (err) {
    console.error("Error getting connected account:", err)
    return null
  }
}

// List files from Google Drive
export async function listDriveFiles(query?: string): Promise<DriveFile[]> {
  try {
    const connectedAccountId = await getConnectedAccount()
    if (!connectedAccountId) {
      throw new Error("No connected Google Drive account")
    }

    const result = await composio.actions.execute({
      actionName: "GOOGLEDRIVE_FIND_FILE",
      requestBody: {
        connectedAccountId,
        input: {
          q: query || "trashed = false",
          pageSize: 20,
        },
      },
    })

    const data = result.data as { files?: Array<Record<string, unknown>> }
    if (data?.files) {
      return data.files.map((file) => ({
        id: file.id as string,
        name: file.name as string,
        mimeType: file.mimeType as string,
        webViewLink: file.webViewLink as string | undefined,
      }))
    }
    return []
  } catch (error) {
    console.error("Error listing Drive files:", error)
    throw error
  }
}

// Download file content from Google Drive
export async function downloadDriveFile(fileId: string): Promise<string> {
  try {
    const connectedAccountId = await getConnectedAccount()
    if (!connectedAccountId) {
      throw new Error("No connected Google Drive account")
    }

    const result = await composio.actions.execute({
      actionName: "GOOGLEDRIVE_GET_FILE_CONTENT",
      requestBody: {
        connectedAccountId,
        input: {
          file_id: fileId,
        },
      },
    })

    const data = result.data as { content?: string }
    return data?.content || ""
  } catch (error) {
    console.error("Error downloading Drive file:", error)
    throw error
  }
}

// Append content to a Google Drive file (for PRD updates)
export async function appendToDriveFile(
  fileId: string,
  content: string
): Promise<{ success: boolean; timestamp: string }> {
  try {
    const connectedAccountId = await getConnectedAccount()
    if (!connectedAccountId) {
      throw new Error("No connected Google Drive account")
    }

    const timestamp = new Date().toISOString()

    // Use GOOGLEDRIVE_APPEND_TEXT action to add content
    await composio.actions.execute({
      actionName: "GOOGLEDRIVE_APPEND_TEXT",
      requestBody: {
        connectedAccountId,
        input: {
          file_id: fileId,
          text: `\n\n---\n[${timestamp}] BUDGET AMENDMENT\n${content}`,
        },
      },
    })

    return { success: true, timestamp }
  } catch (error) {
    console.error("Error appending to Drive file:", error)
    throw error
  }
}

// Find PRD file in Drive
export async function findPrdFile(): Promise<DriveFile | null> {
  try {
    const files = await listDriveFiles("name contains 'PRD' and trashed = false")
    return files.length > 0 ? files[0] : null
  } catch {
    return null
  }
}

export { composio }
