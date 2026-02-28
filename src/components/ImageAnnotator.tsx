"use client"

import { useState, useRef, useEffect } from "react"
import { Stage, Layer, Rect, Circle, Line, Image as KonvaImage, Transformer } from "react-konva"
import { KonvaEventObject } from "konva/lib/Node"
import Konva from "konva"

type Annotation = {
  id: string
  type: "rect" | "circle" | "arrow"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  scaleX?: number
  scaleY?: number
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
  const [tool, setTool] = useState<Tool>("select")
  const [color, setColor] = useState(COLORS[0])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 600, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const shapeRefs = useRef<Map<string, Konva.Shape>>(new Map())

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

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = shapeRefs.current.get(selectedId)
      if (node) {
        transformerRef.current.nodes([node])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId])

  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If clicking on empty area, deselect
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // In select mode, don't start drawing
    if (tool === "select") return

    // If clicking on existing shape, don't start new drawing
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === "background"
    if (!clickedOnEmpty) return

    const stage = e.target.getStage()
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return

    setSelectedId(null)
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

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || !currentAnnotation) return

    const stage = e.target.getStage()
    if (!stage) return
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
    const newAnnotations = annotations.slice(0, -1)
    setAnnotations(newAnnotations)
    setSelectedId(null)
  }

  const handleClear = () => {
    setAnnotations([])
    setSelectedId(null)
  }

  const handleDelete = () => {
    if (selectedId) {
      setAnnotations(annotations.filter(a => a.id !== selectedId))
      setSelectedId(null)
    }
  }

  const handleSave = () => {
    onSave?.(annotations)
  }

  const handleShapeClick = (id: string) => {
    setSelectedId(id)
    setTool("select")
  }

  const handleDragEnd = (id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    setAnnotations(annotations.map(ann =>
      ann.id === id
        ? { ...ann, x: node.x(), y: node.y() }
        : ann
    ))
  }

  const handleTransformEnd = (id: string, e: KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale and apply to dimensions
    node.scaleX(1)
    node.scaleY(1)

    setAnnotations(annotations.map(ann => {
      if (ann.id !== id) return ann

      if (ann.type === "rect") {
        return {
          ...ann,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, (ann.width || 0) * scaleX),
          height: Math.max(5, (ann.height || 0) * scaleY),
        }
      } else if (ann.type === "circle") {
        return {
          ...ann,
          x: node.x(),
          y: node.y(),
          radius: Math.max(5, (ann.radius || 0) * Math.max(scaleX, scaleY)),
        }
      }
      return ann
    }))
  }

  const renderAnnotation = (ann: Annotation, isPreview = false) => {
    const isSelected = selectedId === ann.id && !isPreview
    const commonProps = {
      onClick: () => !isPreview && handleShapeClick(ann.id),
      onTap: () => !isPreview && handleShapeClick(ann.id),
      draggable: !isPreview,
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleDragEnd(ann.id, e),
      onTransformEnd: (e: KonvaEventObject<Event>) => handleTransformEnd(ann.id, e),
      ref: (node: Konva.Shape | null) => {
        if (node && !isPreview) {
          shapeRefs.current.set(ann.id, node)
        }
      },
    }

    if (ann.type === "rect") {
      return (
        <Rect
          key={ann.id}
          x={ann.x}
          y={ann.y}
          width={ann.width || 0}
          height={ann.height || 0}
          stroke={ann.color}
          strokeWidth={isSelected ? 4 : 3}
          fill={`${ann.color}20`}
          {...commonProps}
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
          strokeWidth={isSelected ? 4 : 3}
          fill={`${ann.color}20`}
          {...commonProps}
        />
      )
    } else if (ann.type === "arrow") {
      return (
        <Line
          key={ann.id}
          points={ann.points || []}
          stroke={ann.color}
          strokeWidth={isSelected ? 4 : 3}
          lineCap="round"
          lineJoin="round"
          draggable={!isPreview}
          onClick={() => !isPreview && handleShapeClick(ann.id)}
          onTap={() => !isPreview && handleShapeClick(ann.id)}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const node = e.target
            const dx = node.x()
            const dy = node.y()
            node.x(0)
            node.y(0)
            const points = ann.points || []
            setAnnotations(annotations.map(a =>
              a.id === ann.id
                ? { ...a, points: points.map((p, i) => p + (i % 2 === 0 ? dx : dy)) }
                : a
            ))
          }}
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
              onClick={() => setTool("select")}
              className={`p-2 rounded ${tool === "select" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Select & Move"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
            </button>
            <button
              onClick={() => { setTool("rect"); setSelectedId(null) }}
              className={`p-2 rounded ${tool === "rect" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Rectangle"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </button>
            <button
              onClick={() => { setTool("circle"); setSelectedId(null) }}
              className={`p-2 rounded ${tool === "circle" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-200"}`}
              title="Circle"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
              </svg>
            </button>
            <button
              onClick={() => { setTool("arrow"); setSelectedId(null) }}
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
            onClick={handleDelete}
            disabled={!selectedId}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Delete selected"
          >
            Delete
          </button>
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
            onClick={handleStageClick}
            onTap={handleStageClick}
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
                  name="background"
                />
              )}
              {annotations.map(ann => renderAnnotation(ann, false))}
              {currentAnnotation && renderAnnotation(currentAnnotation, true)}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit minimum size
                  if (newBox.width < 10 || newBox.height < 10) {
                    return oldBox
                  }
                  return newBox
                }}
              />
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
