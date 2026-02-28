// Image region data for pre-dissected areas
const imageRegions: Record<string, ImageRegions> = {
  "v2_with_bench.jpg": {
    width: 1024,
    height: 768,
    regions: [
      { name: "awning", label: "storefront awning with signage", bbox: [280, 150, 750, 280], importance: "high" },
      { name: "signage", label: "Eye Clinic of San Jose sign", bbox: [320, 180, 720, 250], importance: "critical" },
      { name: "bench_people", label: "people sitting on bench", bbox: [30, 380, 220, 580], importance: "critical" },
      { name: "entrance", label: "main entrance doors", bbox: [450, 280, 650, 520], importance: "high" },
      { name: "windows_upper", label: "upper floor windows", bbox: [280, 50, 700, 150], importance: "medium" },
      { name: "planters", label: "decorative planters and greenery", bbox: [200, 400, 450, 550], importance: "low" },
      { name: "trees_left", label: "trees on left side", bbox: [0, 100, 150, 450], importance: "low" },
      { name: "trees_right", label: "trees on right side", bbox: [850, 100, 1024, 450], importance: "low" },
      { name: "sky", label: "sky and clouds", bbox: [0, 0, 1024, 120], importance: "low" },
      { name: "sidewalk", label: "sidewalk and pavement", bbox: [0, 550, 1024, 768], importance: "low" },
      { name: "street_lamp", label: "street lamp", bbox: [750, 200, 820, 500], importance: "low" },
    ]
  },
  "v1_no_bench.png": {
    width: 1024,
    height: 768,
    regions: [
      { name: "awning", label: "storefront awning with signage", bbox: [280, 150, 750, 280], importance: "high" },
      { name: "signage", label: "Eye Clinic of San Jose sign", bbox: [320, 180, 720, 250], importance: "critical" },
      { name: "bench_empty", label: "empty bench area", bbox: [30, 380, 220, 580], importance: "critical" },
      { name: "entrance", label: "main entrance doors", bbox: [450, 280, 650, 520], importance: "high" },
      { name: "windows_upper", label: "upper floor windows", bbox: [280, 50, 700, 150], importance: "medium" },
      { name: "planters", label: "decorative planters and greenery", bbox: [200, 400, 450, 550], importance: "low" },
      { name: "sky", label: "sky and clouds", bbox: [0, 0, 1024, 120], importance: "low" },
      { name: "sidewalk", label: "sidewalk and pavement", bbox: [0, 550, 1024, 768], importance: "low" },
    ]
  }
}

type Region = {
  name: string
  label: string
  bbox: [number, number, number, number] // [x1, y1, x2, y2]
  importance: "critical" | "high" | "medium" | "low"
}

type ImageRegions = {
  width: number
  height: number
  regions: Region[]
}

type Annotation = {
  type: "rect" | "circle" | "line" | "text"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
}

type IntentResult = {
  region: string
  label: string
  importance: string
  action: string
  summary: string
  isMinorChange: boolean
}

// Check if a point is inside a bounding box
function pointInBbox(x: number, y: number, bbox: [number, number, number, number]): boolean {
  const [x1, y1, x2, y2] = bbox
  return x >= x1 && x <= x2 && y >= y1 && y <= y2
}

// Check if two bounding boxes overlap
function bboxOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean {
  const [ax1, ay1, ax2, ay2] = a
  const [bx1, by1, bx2, by2] = b
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

// Get annotation bounding box
function getAnnotationBbox(
  annotation: Annotation,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): [number, number, number, number] {
  // Scale from canvas coordinates to image coordinates
  const scaleX = imageWidth / canvasWidth
  const scaleY = imageHeight / canvasHeight

  const x = annotation.x * scaleX
  const y = annotation.y * scaleY

  switch (annotation.type) {
    case "rect":
      return [
        x,
        y,
        x + (annotation.width || 0) * scaleX,
        y + (annotation.height || 0) * scaleY,
      ]
    case "circle":
      const r = (annotation.radius || 0) * Math.max(scaleX, scaleY)
      return [x - r, y - r, x + r, y + r]
    case "line":
      if (annotation.points && annotation.points.length >= 4) {
        const points = annotation.points.map((p, i) =>
          i % 2 === 0 ? p * scaleX : p * scaleY
        )
        const xs = points.filter((_, i) => i % 2 === 0)
        const ys = points.filter((_, i) => i % 2 === 1)
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
      }
      return [x, y, x + 10, y + 10]
    case "text":
      // Approximate text box
      return [x, y, x + 100 * scaleX, y + 30 * scaleY]
    default:
      return [x, y, x + 50, y + 50]
  }
}

// Get action description based on annotation type
function getActionDescription(annotation: Annotation): string {
  switch (annotation.type) {
    case "rect":
      return "highlighted an area"
    case "circle":
      return "circled"
    case "line":
      return "drew attention to"
    case "text":
      return `added note "${annotation.text || "..."}"`
    default:
      return "marked"
  }
}

// Analyze annotation and determine intent
export function analyzeAnnotation(
  annotation: Annotation,
  imageName: string,
  canvasWidth: number,
  canvasHeight: number
): IntentResult {
  // Get regions for this image, fallback to v2_with_bench
  const imageData = (imageRegions as Record<string, ImageRegions>)[imageName] ||
    (imageRegions as Record<string, ImageRegions>)["v2_with_bench.jpg"]

  const annotationBbox = getAnnotationBbox(
    annotation,
    imageData.width,
    imageData.height,
    canvasWidth,
    canvasHeight
  )

  // Find overlapping regions
  const overlappingRegions = imageData.regions.filter((region) =>
    bboxOverlap(annotationBbox, region.bbox as [number, number, number, number])
  )

  // If no overlap, find nearest region by center point
  if (overlappingRegions.length === 0) {
    const centerX = (annotationBbox[0] + annotationBbox[2]) / 2
    const centerY = (annotationBbox[1] + annotationBbox[3]) / 2

    let nearestRegion = imageData.regions[0]
    let minDist = Infinity

    for (const region of imageData.regions) {
      const [x1, y1, x2, y2] = region.bbox
      const regionCenterX = (x1 + x2) / 2
      const regionCenterY = (y1 + y2) / 2
      const dist = Math.sqrt(
        Math.pow(centerX - regionCenterX, 2) + Math.pow(centerY - regionCenterY, 2)
      )
      if (dist < minDist) {
        minDist = dist
        nearestRegion = region
      }
    }
    overlappingRegions.push(nearestRegion)
  }

  // Pick the most important overlapping region
  const importanceOrder = ["critical", "high", "medium", "low"]
  overlappingRegions.sort(
    (a, b) =>
      importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance)
  )

  const primaryRegion = overlappingRegions[0]
  const action = getActionDescription(annotation)

  // Determine if this is a minor change
  const isMinorChange =
    primaryRegion.importance === "low" || primaryRegion.importance === "medium"

  // Generate summary
  const summary = isMinorChange
    ? `Client ${action} the ${primaryRegion.label}. This is a minor adjustment that won't affect the approved scope.`
    : `Client ${action} the ${primaryRegion.label}. This is a key element - changes may require review.`

  return {
    region: primaryRegion.name,
    label: primaryRegion.label,
    importance: primaryRegion.importance,
    action,
    summary,
    isMinorChange,
  }
}

// Analyze multiple annotations
export function analyzeAnnotations(
  annotations: Annotation[],
  imageName: string,
  canvasWidth: number,
  canvasHeight: number
): {
  intents: IntentResult[]
  overallSummary: string
  isMinorOverall: boolean
} {
  const intents = annotations.map((a) =>
    analyzeAnnotation(a, imageName, canvasWidth, canvasHeight)
  )

  const hasNonMinor = intents.some((i) => !i.isMinorChange)

  // Group by region
  const regionCounts = new Map<string, number>()
  for (const intent of intents) {
    regionCounts.set(intent.label, (regionCounts.get(intent.label) || 0) + 1)
  }

  const regions = Array.from(regionCounts.keys())
  const regionList =
    regions.length === 1
      ? regions[0]
      : regions.slice(0, -1).join(", ") + " and " + regions[regions.length - 1]

  const overallSummary = hasNonMinor
    ? `Client feedback on ${regionList}. Contains changes to key elements.`
    : `Client feedback on ${regionList}. Minor adjustments only.`

  return {
    intents,
    overallSummary,
    isMinorOverall: !hasNonMinor,
  }
}
