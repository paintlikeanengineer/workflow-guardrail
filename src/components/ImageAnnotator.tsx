"use client"

import { useState, useRef, useEffect } from "react"
import { Stage, Layer, Rect, Circle, Line, Image as KonvaImage } from "react-konva"

type Annotation = {
  id: string
  type: "rect" | "circle" | "arrow"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  color: string
}

type Tool = "select" | "rect" | "circle" | "arrow"

type Props = {
  imageUrl: string
  onSave?: (annotations: Annotation[]) => void
  onClose?: () => void
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"]

export function ImageAnnotator({ imageUrl, onSave, onClose }: Props) {
  const [tool, setTool] = useState<Tool>("rect")
  const [color, setColor] = useState(COLORS[0])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 600, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
      // Calculate stage size to fit container while maintaining aspect ratio
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32 // padding
        const scale = containerWidth / img.width
        setStageSize({
          width: containerWidth,
          height: img.height * scale,
        })
      }
    }
  }, [imageUrl])

  const handleMouseDown = (e: { target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } } }) => {
    if (tool === "select") return

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    setIsDrawing(true)
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: tool === "arrow" ? "arrow" : tool,
      x: pos.x,
      y: pos.y,
      color,
    }

    if (tool === "rect") {
      newAnnotation.width = 0
      newAnnotation.height = 0
    } else if (tool === "circle") {
      newAnnotation.radius = 0
    } else if (tool === "arrow") {
      newAnnotation.points = [pos.x, pos.y, pos.x, pos.y]
    }

    setCurrentAnnotation(newAnnotation)
  }

  const handleMouseMove = (e: { target: { getStage: () => { getPointerPosition: () => { x: number; y: number } | null } } }) => {
    if (!isDrawing || !currentAnnotation) return

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    if (!pos) return

    const updated = { ...currentAnnotation }

    if (currentAnnotation.type === "rect") {
      updated.width = pos.x - currentAnnotation.x
      updated.height = pos.y - currentAnnotation.y
    } else if (currentAnnotation.type === "circle") {
      const dx = pos.x - currentAnnotation.x
      const dy = pos.y - currentAnnotation.y
      updated.radius = Math.sqrt(dx * dx + dy * dy)
    } else if (currentAnnotation.type === "arrow") {
      updated.points = [currentAnnotation.x, currentAnnotation.y, pos.x, pos.y]
    }

    setCurrentAnnotation(updated)
  }

  const handleMouseUp = () => {
    if (isDrawing && currentAnnotation) {
      // Only add if it has some size
      const hasSize =
        (currentAnnotation.type === "rect" && Math.abs(currentAnnotation.width || 0) > 5) ||
        (currentAnnotation.type === "circle" && (currentAnnotation.radius || 0) > 5) ||
        (currentAnnotation.type === "arrow" && currentAnnotation.points)

      if (hasSize) {
        setAnnotations([...annotations, currentAnnotation])
      }
    }
    setIsDrawing(false)
    setCurrentAnnotation(null)
  }

  const handleUndo = () => {
    setAnnotations(annotations.slice(0, -1))
  }

  const handleClear = () => {
    setAnnotations([])
  }

  const handleSave = () => {
    onSave?.(annotations)
  }

  const renderAnnotation = (ann: Annotation) => {
    if (ann.type === "rect") {
      return (
        <Rect
          key={ann.id}
          x={ann.x}
          y={ann.y}
          width={ann.width || 0}
          height={ann.height || 0}
          stroke={ann.color}
          strokeWidth={3}
          fill={`${ann.color}20`}
        />
      )
    } else if (ann.type === "circle") {
      return (
        <Circle
          key={ann.id}
          x={ann.x}
          y={ann.y}
          radius={ann.radius || 0}
          stroke={ann.color}
          strokeWidth={3}
          fill={`${ann.color}20`}
        />
      )
    } else if (ann.type === "arrow") {
      return (
        <Line
          key={ann.id}
          points={ann.points || []}
          stroke={ann.color}
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
        />
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Annotate Image</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-gray-50">
          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTool("rect")}
              className={`p-2 rounded ${tool === "rect" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Rectangle"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </button>
            <button
              onClick={() => setTool("circle")}
              className={`p-2 rounded ${tool === "circle" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Circle"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            <button
              onClick={() => setTool("arrow")}
              className={`p-2 rounded ${tool === "arrow" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Line"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Colors */}
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Actions */}
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            Undo
          </button>
          <button
            onClick={handleClear}
            disabled={annotations.length === 0}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            style={{ cursor: tool === "select" ? "default" : "crosshair" }}
          >
            <Layer>
              {image && (
                <KonvaImage
                  image={image}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              )}
              {annotations.map(renderAnnotation)}
              {currentAnnotation && renderAnnotation(currentAnnotation)}
            </Layer>
          </Stage>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Annotations
          </button>
        </div>
      </div>
    </div>
  )
}
