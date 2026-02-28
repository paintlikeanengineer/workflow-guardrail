// ===========================================
// PRD & Goals
// ===========================================

export type PRD = {
  prdId: string
  projectTitle: string
  clientName: string
  designerName: string
  brief: {
    description: string
    style: string
    referenceImageUrl: string
  }
  timeline: {
    totalDays: number
    phases: Array<{ name: string; week: number }>
    currentDay: number
    currentPhase: string
  }
  terms: {
    freeIterationsUntil: string
    hourlyRateAfter: number
    currency: string
  }
  summary: string
}

export type Goal = {
  goalId: string
  text: string
  source: 'brief' | 'conversation'
  approved: boolean
  approvedAt?: string
  conversationRef?: string
}

// ===========================================
// Thread & Messages
// ===========================================

export type MessageQuestion = {
  questionId: string
  text: string
  options: string[]
  answer?: string
  answeredAt?: string
}

export type Message = {
  messageId: string
  sender: 'designer' | 'client'
  type: 'text' | 'image' | 'annotation' | 'doc'
  content: string
  attachments?: string[]
  timestamp: string
  question?: MessageQuestion
}

export type Thread = {
  threadId: string
  prdId: string
  participants: {
    designer: { name: string; avatar: string }
    client: { name: string; role: string; company: string; avatar: string }
  }
  messages: Message[]
}

// ===========================================
// Agent Outputs
// ===========================================

// ScopeScribe: Extracts goals from brief/conversation
export type ScopeScribeOutput = {
  extractedGoals: Array<{
    text: string
    source: 'brief' | 'conversation'
    confidence: number
  }>
}

// ScopeWatcher: Validates uploads against approved goals
export type GoalViolation = {
  goalId: string
  goalText: string
  reason: string
  severity: 'high' | 'medium' | 'low'
}

export type ScopeWatcherOutput = {
  valid: boolean
  violations: GoalViolation[]
  confidence: number
}

// ChangeTriage: Extracts tasks from client messages
export type ParsedTask = {
  taskId: string
  description: string
  complexity: 'trivial' | 'moderate' | 'major'
}

export type ChangeTriageOutput = {
  hasTask: boolean
  task?: ParsedTask
  confidence: number
}

// CostCalculator: Estimates time/cost impact
export type CostCalculatorOutput = {
  estimatedHours: number
  estimatedDays: number
  estimatedCost: number
  reasoning: string
  recommendation: 'proceed' | 'warn' | 'block'
}

// ===========================================
// Validation Cards (UI)
// ===========================================

export type ValidationCardType =
  | 'goal_violation'    // ScopeWatcher found missing goal
  | 'scope_warning'     // CostCalculator warns about impact
  | 'add_to_goals'      // Ask if new item should become goal
  | 'task_complete'     // Task was marked done

export type ValidationCard = {
  cardId: string
  type: ValidationCardType
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
  actions: Array<{
    label: string
    action: 'accept' | 'reject' | 'edit'
  }>
  data?: {
    violation?: GoalViolation
    estimate?: CostCalculatorOutput
    task?: ParsedTask
  }
  timestamp: number
}

// ===========================================
// Trace Events (for debug/demo visibility)
// ===========================================

export type AgentName = 'ScopeScribe' | 'ScopeWatcher' | 'ChangeTriage' | 'CostCalculator' | 'PRD-Sync' | 'IntentLens'

export type TraceEvent = {
  agent: AgentName
  status: 'started' | 'completed' | 'violation' | 'warning' | 'error'
  message: string
  timestamp: number
  data?: unknown
}
