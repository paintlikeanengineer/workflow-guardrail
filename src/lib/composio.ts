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
    // Find one for our entity (cast to access entityId which exists at runtime)
    type AccountWithEntity = { id: string; entityId?: string }
    const items = accounts.items as unknown as AccountWithEntity[]
    const account = items?.find((a) => a.entityId === ENTITY_ID)
    return account?.id || null
  } catch {
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

export { composio }
