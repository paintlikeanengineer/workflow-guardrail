// Demo state for hackathon
// Hardcoded users: Athena (designer), Marcus (client)

export type ThreadState = {
  threadId: string
  currentView: "designer" | "client"
  decisions: {
    selectedRough: string
    benchApproved: boolean
  }
  latestDesign: {
    imageId: string | null
    detectedObjects: string[]
    includesBench: boolean
  }
}

// Seeded demo state:
// - selectedRough = "C" (client chose this)
// - benchApproved = false (will be set to true when client clicks Yes)
// - includesBench = false (v1 image will be missing it - triggers catch)
export const demoState: ThreadState = {
  threadId: "thread-eye-clinics-001",
  currentView: "designer",
  decisions: {
    selectedRough: "C",
    benchApproved: false, // Will be set when client answers
  },
  latestDesign: {
    imageId: null,
    detectedObjects: [],
    includesBench: false,
  },
}

// Mutable state for demo
let currentState: ThreadState = { ...demoState }

export function getState(): ThreadState {
  return currentState
}

export function updateState(updates: Partial<ThreadState>): ThreadState {
  currentState = { ...currentState, ...updates }
  return currentState
}

export function updateLatestDesign(
  updates: Partial<ThreadState["latestDesign"]>
): ThreadState {
  currentState = {
    ...currentState,
    latestDesign: { ...currentState.latestDesign, ...updates },
  }
  return currentState
}

export function resetState(): ThreadState {
  currentState = { ...demoState }
  return currentState
}
