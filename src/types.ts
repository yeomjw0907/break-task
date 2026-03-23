export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskCategory =
  | 'deep_work'
  | 'admin'
  | 'meeting'
  | 'communication'
  | 'planning'
  | 'maintenance'

export type CompletionSource = 'manual' | 'notion' | 'calendar' | 'import'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  estimatedMinutes: number
  dueAt: string | null
  points: number
  source: CompletionSource
  tags: string[]
  notes?: string
}

export interface TaskCompletion {
  id: string
  taskId: string
  completedAt: string
  focusMinutes: number
  estimatedMinutes: number
  actualMinutes: number
  wasOverdue: boolean
  comboIndex: number
  scoreEarned: number
  bonusPoints: number
  timeBonus: number
  completionState: 'early' | 'on_time' | 'overtime'
}

export interface DailyScore {
  date: string
  totalScore: number
  completedCount: number
  comboPeak: number
  focusMinutes: number
  highScore: boolean
}

export interface UserProfile {
  id: string
  name: string
  timezone: string
  currentStreak: number
  bestStreak: number
  lifetimeScore: number
  level: number
}

export interface SeededWorkspace {
  profile: UserProfile
  tasks: Task[]
  completions: TaskCompletion[]
  dailyScores: DailyScore[]
}

export interface ScoreBreakdown {
  baseScore: number
  priorityBonus: number
  focusBonus: number
  overdueBonus: number
  timeBonus: number
  comboBonus: number
  totalScore: number
  comboMultiplier: number
  completionState: 'early' | 'on_time' | 'overtime'
}

export interface DailyReport {
  date: string
  completedCount: number
  totalScore: number
  comboPeak: number
  focusMinutes: number
  onTimeCount: number
  overtimeCount: number
  highScore: boolean
  topTaskTitle: string | null
  wins: string[]
  nextActions: string[]
}
