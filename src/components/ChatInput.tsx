"use client"

import { useState } from "react"

type Props = {
  onSendMessage: (content: string) => void
  onUploadImage: (file: File) => void
  placeholder?: string
}

export function ChatInput({ onSendMessage, onUploadImage, placeholder }: Props) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadImage(file)
      e.target.value = ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2">
        {/* File upload button */}
        <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-full flex items-center justify-center w-10 h-10 shrink-0">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </label>

        {/* Message input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder || "Type a message..."}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-green-500"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim()}
          className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">➤</span>
        </button>
      </div>
    </form>
  )
}
