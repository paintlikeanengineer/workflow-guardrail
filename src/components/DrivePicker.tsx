"use client"

import { useState, useEffect } from "react"

type DriveFile = {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

type Props = {
  onSelect: (file: DriveFile, content: string) => void
  onClose: () => void
}

export function DrivePicker({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const res = await fetch("/api/drive?action=list")
      const data = await res.json()

      if (data.error) {
        // Not connected - redirect to auth
        setError("connect")
        setLoading(false)
        return
      }

      setFiles(data.files || [])
    } catch (err) {
      console.error("Failed to load files:", err)
      setError("connect")
    } finally {
      setLoading(false)
    }
  }

  const connectDrive = async () => {
    try {
      const res = await fetch("/api/drive?action=auth-url")
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error("Failed to get auth URL:", err)
    }
  }

  const selectFile = async (file: DriveFile) => {
    setDownloading(file.id)
    try {
      const res = await fetch(`/api/drive?action=download&fileId=${file.id}`)
      const data = await res.json()
      onSelect(file, data.content || "")
    } catch (err) {
      console.error("Failed to download file:", err)
    } finally {
      setDownloading(null)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("folder")) return "📁"
    if (mimeType.includes("document")) return "📄"
    if (mimeType.includes("spreadsheet")) return "📊"
    if (mimeType.includes("presentation")) return "📽️"
    if (mimeType.includes("pdf")) return "📕"
    if (mimeType.includes("image")) return "🖼️"
    return "📎"
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">📁</span>
            <h3 className="font-semibold text-gray-900">Google Drive</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : error === "connect" ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Connect your Google Drive to import files
              </p>
              <button
                onClick={connectDrive}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm.79 1.5h7l5.14 9H3.36l5.14-9zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
                  />
                </svg>
                Connect Google Drive
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No files found
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => selectFile(file)}
                  disabled={downloading === file.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-left disabled:opacity-50"
                >
                  <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                  <span className="flex-1 truncate text-sm">{file.name}</span>
                  {downloading === file.id && (
                    <span className="text-xs text-gray-500">Loading...</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
