import {
  type FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react'
import {
  Activity,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  Layers3,
  Link2,
  LoaderCircle,
  MoonStar,
  RefreshCcw,
  Search,
  Sparkles,
  SunMedium,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FocusSidebar } from '@/components/app/focus-sidebar'
import { CompletionFeedPanel, FocusByHourPanel, TodayReportPanel } from '@/components/app/insight-panels'
import { MetricSurface, SidebarMetric, TopMetric } from '@/components/app/metrics'
import { StartDayPanel } from '@/components/app/start-day-panel'
import { TaskRow } from '@/components/app/task-row'
import { ClockOutSummaryModal, NextTaskModal, SwitchTaskModal } from '@/components/app/task-modals'
import { TaskComposer } from '@/components/app/task-composer'
import { WeeklyReviewPanel } from '@/components/app/weekly-review-panel'
import {
  getCategoryLabel,
  getPriorityLabel,
  getTaskTitle,
  type Locale,
  uiCopy,
} from '@/copy'
import { seedProfile } from '@/data/seed'
import { calculateDailyScore, calculateTaskScore, createDailyReport, updateHighScore } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type {
  DailyScore,
  ScoreBreakdown,
  Task,
  TaskCompletion,
  TaskPriority,
  TaskStatus,
  UserProfile,
} from '@/types'

type FilterValue = 'all' | TaskStatus
type ViewMode = 'today' | 'inbox' | 'done' | 'history' | 'integrations'
type ThemeMode = 'dark' | 'light'
type DraftHorizon = 'today' | 'tomorrow' | 'later'
type RewardBurst = ScoreBreakdown & { taskTitle: string; highScore: boolean }
type TimerState = {
  taskId: string
  estimatedMinutes: number
  elapsedSeconds: number
  isPaused: boolean
  segmentStartedAt: string | null
}

type NextTaskPromptState = {
  completedTaskTitle: string
  candidateTaskIds: string[]
  kind: 'resume' | 'next'
}

type PausedSession = TimerState & {
  mode: 'switch' | 'interrupt'
  pausedAt: string
}

type SwitchPromptState = {
  nextTaskId: string
  estimatedMinutes: number
  source: 'new' | 'resume'
}

type FlowEvent = {
  id: string
  type: 'switch' | 'interrupt' | 'resume'
  at: string
}

type FocusSession = {
  id: string
  taskId: string
  startedAt: string
  endedAt: string
  durationSeconds: number
}

type WorkSession = {
  id: string
  clockInAt: string
  clockOutAt: string | null
}

type DailyReflectionMap = Record<string, string>

type ClockOutSummary = {
  dayKey: string
  clockInAt: string
  clockOutAt: string
  workSeconds: number
  focusSeconds: number
  focusRatio: number
  completedCount: number
  totalScore: number
  switchCount: number
  interruptCount: number
  firstFocusAt: string | null
  lastFocusAt: string | null
  peakHour: number | null
  carryOverCount: number
}

const STORAGE_KEYS = {
  tasks: 'taskbrick.v2.tasks',
  completions: 'taskbrick.v2.completions',
  dailyScores: 'taskbrick.v2.dailyScores',
  highScore: 'taskbrick.v2.highScore',
  profile: 'taskbrick.v2.profile',
  flowEvents: 'taskbrick.v2.flowEvents',
  focusSessions: 'taskbrick.v2.focusSessions',
  workSessions: 'taskbrick.v2.workSessions',
  dailyReflections: 'taskbrick.v2.dailyReflections',
  workBudgetMinutes: 'taskbrick.v2.workBudgetMinutes',
  focusTaskIds: 'taskbrick.v2.focusTaskIds',
  locale: 'taskbrick.locale',
  theme: 'taskbrick.theme',
}

const EMPTY_TASKS: Task[] = []
const EMPTY_COMPLETIONS: TaskCompletion[] = []
const EMPTY_DAILY_SCORES: DailyScore[] = []
const EMPTY_HIGH_SCORE = 0
const EMPTY_FLOW_EVENTS: FlowEvent[] = []
const EMPTY_FOCUS_SESSIONS: FocusSession[] = []
const EMPTY_WORK_SESSIONS: WorkSession[] = []
const EMPTY_DAILY_REFLECTIONS: DailyReflectionMap = {}
const EMPTY_PROFILE: UserProfile = {
  ...seedProfile,
  currentStreak: 0,
  bestStreak: 0,
  lifetimeScore: 0,
  level: 1,
}

const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'critical']

const notionPreviewTasks: Task[] = [
  {
    id: 'notion-preview-01',
    title: 'Draft founder update for investors',
    category: 'communication',
    priority: 'high',
    status: 'todo',
    estimatedMinutes: 35,
    dueAt: '2026-03-20T16:30:00+09:00',
    points: 22,
    source: 'notion',
    tags: ['investor', 'weekly'],
    notes: 'Auto-imported from Notion preview sync.',
  },
  {
    id: 'notion-preview-02',
    title: 'Clean up roadmap blockers before Friday review',
    category: 'planning',
    priority: 'critical',
    status: 'todo',
    estimatedMinutes: 40,
    dueAt: '2026-03-20T18:00:00+09:00',
    points: 28,
    source: 'notion',
    tags: ['roadmap', 'review'],
    notes: 'Auto-imported from Notion preview sync.',
  },
]

const shellCardClass =
  'rounded-[26px] border-[var(--line)] bg-[var(--panel)] py-0 shadow-[var(--panel-shadow)] backdrop-blur-xl'
const quietCardClass =
  'rounded-[22px] border-[var(--line)] bg-[var(--panel-soft)] py-0 shadow-[0_8px_22px_rgba(7,10,18,0.045)] backdrop-blur-xl'
const outlineBadgeClass = 'border-[var(--line)] bg-transparent text-[var(--text-soft)] shadow-none'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  const stored = loadStoredValue<ThemeMode | null>(STORAGE_KEYS.theme, null)
  if (stored === 'light' || stored === 'dark') return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getDraftDueAt(horizon: DraftHorizon): string | null {
  const due = new Date()
  if (horizon === 'later') return null
  if (horizon === 'tomorrow') {
    due.setDate(due.getDate() + 1)
  }

  due.setHours(18, 0, 0, 0)

  if (due.getTime() <= Date.now()) {
    due.setHours(due.getHours() + 2)
  }

  return due.toISOString()
}

function addDays(input: Date, amount: number): Date {
  const next = new Date(input)
  next.setDate(next.getDate() + amount)
  return next
}

function formatPlannerDate(date: Date, locale: Locale, timezone: string): string {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: timezone,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function getDayOffsetFromKey(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return Math.round((target.getTime() - startOfToday.getTime()) / 86400000)
}

function getRelativeDayLabel(offset: number, locale: Locale): string {
  if (locale === 'ko') {
    if (offset === 0) return '오늘'
    if (offset === -1) return '어제'
    if (offset === 1) return '내일'
    return offset < 0 ? `${Math.abs(offset)}일 전` : `${offset}일 후`
  }

  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  return offset < 0 ? `${Math.abs(offset)}d ago` : `In ${offset}d`
}

function parseDraftInput(title: string, locale: Locale) {
  let cleaned = title
  let parsedPriority: TaskPriority | null = null
  let parsedMinutes: number | null = null
  let parsedHorizon: DraftHorizon | null = null

  const priorityPatterns: Array<[TaskPriority, RegExp]> = [
    ['critical', /\b(critical|urgent|asap)\b/i],
    ['high', /\b(high|important)\b/i],
    ['medium', /\b(medium|normal)\b/i],
    ['low', /\b(low|light)\b/i],
    ['critical', /(중요|긴급|급함)/],
    ['high', /(높음|우선)/],
    ['medium', /(보통|일반)/],
    ['low', /(낮음|가벼운)/],
  ]

  for (const [priority, pattern] of priorityPatterns) {
    if (pattern.test(cleaned)) {
      parsedPriority = priority
      cleaned = cleaned.replace(pattern, ' ')
      break
    }
  }

  const minuteMatch = cleaned.match(/(\d{1,3})\s*(m|min|minutes?|분)\b/i)
  if (minuteMatch) {
    parsedMinutes = Math.min(240, Math.max(5, Number(minuteMatch[1])))
    cleaned = cleaned.replace(minuteMatch[0], ' ')
  }

  const horizonPatterns: Array<[DraftHorizon, RegExp]> =
    locale === 'ko'
      ? [
          ['tomorrow', /(내일|다음날)/],
          ['today', /(오늘|당일)/],
          ['later', /(나중|언젠가)/],
        ]
      : [
          ['tomorrow', /\b(tomorrow|tmr)\b/i],
          ['today', /\b(today)\b/i],
          ['later', /\b(later|someday)\b/i],
        ]

  for (const [horizon, pattern] of horizonPatterns) {
    if (pattern.test(cleaned)) {
      parsedHorizon = horizon
      cleaned = cleaned.replace(pattern, ' ')
      break
    }
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return {
    title: cleaned.length > 0 ? cleaned : title.trim(),
    priority: parsedPriority,
    minutes: parsedMinutes,
    horizon: parsedHorizon,
  }
}

function createFocusSession(timer: TimerState, endedAt = new Date().toISOString()): FocusSession | null {
  if (!timer.segmentStartedAt) return null

  const durationSeconds = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(timer.segmentStartedAt).getTime()) / 1000),
  )

  if (durationSeconds <= 0) return null

  return {
    id: `focus-${timer.taskId}-${endedAt.replaceAll(/[:.]/g, '-')}`,
    taskId: timer.taskId,
    startedAt: timer.segmentStartedAt,
    endedAt,
    durationSeconds,
  }
}

function buildHourlyFocusSessions(
  sessions: FocusSession[],
  selectedDate: Date,
  timezone: string,
): number[] {
  void selectedDate
  void timezone
  const bins = Array.from({ length: 24 }, () => 0)

  for (const session of sessions) {
    let cursor = new Date(session.startedAt).getTime()
    const end = new Date(session.endedAt).getTime()

    while (cursor < end) {
      const current = new Date(cursor)
      const hour = current.getHours()
      const nextHour = new Date(current)
      nextHour.setMinutes(0, 0, 0)
      nextHour.setHours(hour + 1)
      const segmentEnd = Math.min(nextHour.getTime(), end)

      bins[hour] += Math.max(0, Math.round((segmentEnd - cursor) / 1000))
      cursor = segmentEnd
    }
  }

  return bins
}

function formatShortTime(timestamp: string, locale: Locale, timezone: string): string {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function loadStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback

  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function getDateKey(input: string | Date, timezone: string): string {
  const date = typeof input === 'string' ? new Date(input) : input

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatDueLabel(dueAt: string | null, timezone: string, locale: Locale): string {
  const copy = uiCopy[locale]
  if (!dueAt) return copy.noDue

  const date = new Date(dueAt)
  const dateKey = getDateKey(date, timezone)
  const timeLabel = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  if (dateKey === getDateKey(new Date(), timezone)) {
    return copy.dueTodayAt(timeLabel)
  }

  return `${dateKey} ${timeLabel}`
}

function getTimerTone(locale: Locale, timer: TimerState | null): string {
  const copy = uiCopy[locale]
  if (!timer) return copy.stateIdle

  const elapsedMinutes = Math.max(1, Math.ceil(timer.elapsedSeconds / 60))
  if (timer.isPaused) return copy.statePaused
  if (elapsedMinutes > timer.estimatedMinutes) return copy.stateOvertime
  if (elapsedMinutes >= Math.round(timer.estimatedMinutes * 0.75)) return copy.stateClosing

  return copy.stateRunning
}

function upsertDailyScore(scores: DailyScore[], nextScore: DailyScore): DailyScore[] {
  const updated = scores.some((score) => score.date === nextScore.date)
    ? scores.map((score) => (score.date === nextScore.date ? nextScore : score))
    : [...scores, nextScore]

  return updated.sort((left, right) => left.date.localeCompare(right.date))
}

function getPriorityRank(priority: TaskPriority): number {
  const rank: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }

  return rank[priority]
}

function getNextTaskChoices(tasks: Task[], completedTaskId: string, pausedSessions: PausedSession[]): Task[] {
  const pausedTaskIds = pausedSessions.map((session) => session.taskId)
  const sortedOpenTasks = tasks
    .filter((task) => task.id !== completedTaskId && task.status !== 'done' && task.status !== 'archived')
    .sort((left, right) => {
      const leftIsPaused = pausedTaskIds.includes(left.id)
      const rightIsPaused = pausedTaskIds.includes(right.id)

      if (leftIsPaused !== rightIsPaused) {
        return leftIsPaused ? -1 : 1
      }

      if (left.status !== right.status) {
        return left.status === 'in_progress' ? -1 : 1
      }

      if (getPriorityRank(left.priority) !== getPriorityRank(right.priority)) {
        return getPriorityRank(left.priority) - getPriorityRank(right.priority)
      }

      if (left.dueAt && right.dueAt) {
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
      }

      if (left.dueAt) return -1
      if (right.dueAt) return 1

      return left.estimatedMinutes - right.estimatedMinutes
    })

  return sortedOpenTasks.slice(0, 4)
}

function getPausedSessionLabel(mode: PausedSession['mode'], locale: Locale): string {
  if (locale === 'ko') {
    return mode === 'interrupt' ? '끼어들기' : '전환'
  }

  return mode === 'interrupt' ? 'Interrupted' : 'Switched'
}

function createFlowEvent(type: FlowEvent['type']): FlowEvent {
  const now = new Date().toISOString()

  return {
    id: `flow-${type}-${now.replaceAll(/[:.]/g, '-')}`,
    type,
    at: now,
  }
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = safeSeconds % 60

  if (hours > 0) {
    return [hours, minutes, secs].map((value) => value.toString().padStart(2, '0')).join(':')
  }

  return [minutes, secs].map((value) => value.toString().padStart(2, '0')).join(':')
}

function getDayBounds(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return {
    start,
    end,
  }
}

function getWorkSessionDurationSeconds(session: WorkSession, now = Date.now()) {
  const end = session.clockOutAt ? new Date(session.clockOutAt).getTime() : now
  return Math.max(0, Math.round((end - new Date(session.clockInAt).getTime()) / 1000))
}

function getOverlapSeconds(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  const start = Math.max(new Date(startA).getTime(), new Date(startB).getTime())
  const end = Math.min(new Date(endA).getTime(), new Date(endB).getTime())
  return Math.max(0, Math.round((end - start) / 1000))
}

function sliceFocusSessionToDay(session: FocusSession, date: Date): FocusSession | null {
  const { start, end } = getDayBounds(date)
  const clippedStart = Math.max(new Date(session.startedAt).getTime(), start.getTime())
  const clippedEnd = Math.min(new Date(session.endedAt).getTime(), end.getTime())
  const durationSeconds = Math.max(0, Math.round((clippedEnd - clippedStart) / 1000))

  if (durationSeconds <= 0) return null

  return {
    ...session,
    startedAt: new Date(clippedStart).toISOString(),
    endedAt: new Date(clippedEnd).toISOString(),
    durationSeconds,
  }
}

function getWorkSessionOverlapForDay(session: WorkSession, date: Date, now = Date.now()) {
  const { start, end } = getDayBounds(date)
  return getOverlapSeconds(
    session.clockInAt,
    session.clockOutAt ?? new Date(now).toISOString(),
    start.toISOString(),
    end.toISOString(),
  )
}

function getPriorityOptionLabel(priority: TaskPriority, locale: Locale): string {
  const labels = {
    ko: {
      low: '낮음 · 가벼운 정리',
      medium: '보통 · 일반 업무',
      high: '높음 · 오늘 처리',
      critical: '중요 · 먼저 처리',
    },
    en: {
      low: 'Low · light cleanup',
      medium: 'Medium · standard work',
      high: 'High · must do today',
      critical: 'Critical · do first',
    },
  }

  return labels[locale][priority]
}

function getPriorityHint(priority: TaskPriority, locale: Locale): string {
  const hints = {
    ko: {
      low: '지금 처리해도 되는 가벼운 일.',
      medium: '오늘 안에 마무리하면 좋은 일반 업무.',
      high: '오늘 반드시 처리해야 하는 중요한 일.',
      critical: '가장 먼저 끝내야 하는 최우선 업무.',
    },
    en: {
      low: 'A light task you can clear quickly.',
      medium: 'A normal task worth finishing today.',
      high: 'An important task that should be done today.',
      critical: 'A core task you should finish first.',
    },
  }

  return hints[locale][priority]
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredValue(STORAGE_KEYS.tasks, EMPTY_TASKS))
  const [completions, setCompletions] = useState<TaskCompletion[]>(() =>
    loadStoredValue(STORAGE_KEYS.completions, EMPTY_COMPLETIONS),
  )
  const [dailyScores, setDailyScores] = useState<DailyScore[]>(() =>
    loadStoredValue(STORAGE_KEYS.dailyScores, EMPTY_DAILY_SCORES),
  )
  const [highScore, setHighScore] = useState<number>(() =>
    loadStoredValue(STORAGE_KEYS.highScore, EMPTY_HIGH_SCORE),
  )
  const [flowEvents, setFlowEvents] = useState<FlowEvent[]>(() =>
    loadStoredValue(STORAGE_KEYS.flowEvents, EMPTY_FLOW_EVENTS),
  )
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() =>
    loadStoredValue(STORAGE_KEYS.focusSessions, EMPTY_FOCUS_SESSIONS),
  )
  const [workSessions, setWorkSessions] = useState<WorkSession[]>(() =>
    loadStoredValue(STORAGE_KEYS.workSessions, EMPTY_WORK_SESSIONS),
  )
  const [dailyReflections, setDailyReflections] = useState<DailyReflectionMap>(() =>
    loadStoredValue(STORAGE_KEYS.dailyReflections, EMPTY_DAILY_REFLECTIONS),
  )
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadStoredValue(STORAGE_KEYS.profile, EMPTY_PROFILE),
  )
  const [locale, setLocale] = useState<Locale>(() => loadStoredValue(STORAGE_KEYS.locale, 'ko'))
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [currentView, setCurrentView] = useState<ViewMode>('today')
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [search, setSearch] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('medium')
  const [draftMinutes, setDraftMinutes] = useState(25)
  const [draftHorizon, setDraftHorizon] = useState<DraftHorizon>('today')
  const [plannedWorkMinutes, setPlannedWorkMinutes] = useState<number>(() =>
    loadStoredValue(STORAGE_KEYS.workBudgetMinutes, 360),
  )
  const [focusTaskIds, setFocusTaskIds] = useState<string[]>(() =>
    loadStoredValue(STORAGE_KEYS.focusTaskIds, []),
  )
  const [selectedDayOffset, setSelectedDayOffset] = useState(0)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null)
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([])
  const [isDockCollapsed, setIsDockCollapsed] = useState(false)
  const [rewardBurst, setRewardBurst] = useState<RewardBurst | null>(null)
  const [nextTaskPrompt, setNextTaskPrompt] = useState<NextTaskPromptState | null>(null)
  const [switchPrompt, setSwitchPrompt] = useState<SwitchPromptState | null>(null)
  const [clockOutSummary, setClockOutSummary] = useState<ClockOutSummary | null>(null)
  const [clockOutReflection, setClockOutReflection] = useState('')
  const [workTimerTick, setWorkTimerTick] = useState(() => Date.now())

  const copy = uiCopy[locale]
  const deferredSearch = useDeferredValue(search)
  const selectedDate = useMemo(() => addDays(new Date(), selectedDayOffset), [selectedDayOffset])
  const selectedDateKey = getDateKey(selectedDate, profile.timezone)
  const selectedDateLabel = formatPlannerDate(selectedDate, locale, profile.timezone)
  const selectedCompletions = completions.filter(
    (completion) => getDateKey(completion.completedAt, profile.timezone) === selectedDateKey,
  )
  const selectedFlowEvents = flowEvents.filter(
    (event) => getDateKey(event.at, profile.timezone) === selectedDateKey,
  )
  const selectedSwitchCount = selectedFlowEvents.filter((event) => event.type !== 'resume').length
  const selectedInterruptCount = selectedFlowEvents.filter((event) => event.type === 'interrupt').length
  const selectedScore =
    dailyScores.find((score) => score.date === selectedDateKey) ??
    {
      ...calculateDailyScore(selectedCompletions, highScore),
      date: selectedDateKey,
    }

  const selectedReport = createDailyReport(selectedScore, selectedCompletions, tasks)
  const parsedDraft = useMemo(() => parseDraftInput(draftTitle, locale), [draftTitle, locale])
  const effectiveDraftPriority = parsedDraft.priority ?? draftPriority
  const effectiveDraftMinutes = parsedDraft.minutes ?? draftMinutes
  const effectiveDraftHorizon = parsedDraft.horizon ?? draftHorizon
  const todayKey = selectedDateKey
  const todayCompletions = selectedCompletions
  const todaySwitchCount = selectedSwitchCount
  const todayInterruptCount = selectedInterruptCount
  const todayScore = selectedScore
  const todayReport = selectedReport

  const matchesSelectedDate = (task: Task) => {
    if (!task.dueAt) {
      return selectedDayOffset === 0
    }

    return getDateKey(task.dueAt, profile.timezone) === selectedDateKey
  }

  const completedTaskIdsForSelectedDate = new Set(selectedCompletions.map((completion) => completion.taskId))
  const openTasks = tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'archived' && matchesSelectedDate(task),
  )
  const inboxTasks = tasks.filter((task) => task.status === 'todo' && matchesSelectedDate(task))
  const doneTasks = tasks.filter((task) => completedTaskIdsForSelectedDate.has(task.id))
  const selectedScheduledCount = tasks.filter((task) => matchesSelectedDate(task)).length
  const selectedOpenMinutes = openTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
  const recommendedStartTasks = openTasks
    .slice()
    .sort((left, right) => {
      if (getPriorityRank(left.priority) !== getPriorityRank(right.priority)) {
        return getPriorityRank(left.priority) - getPriorityRank(right.priority)
      }

      if (left.dueAt && right.dueAt) {
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
      }

      if (left.dueAt) return -1
      if (right.dueAt) return 1
      return left.estimatedMinutes - right.estimatedMinutes
    })
  const prioritizedTaskIds = focusTaskIds.filter((taskId) => openTasks.some((task) => task.id === taskId))
  const startDayTasks = [
    ...prioritizedTaskIds
      .map((taskId) => openTasks.find((task) => task.id === taskId) ?? null)
      .filter((task): task is Task => Boolean(task)),
    ...recommendedStartTasks.filter((task) => !prioritizedTaskIds.includes(task.id)),
  ].slice(0, 3)
  const startDayTaskItems = startDayTasks.map((task) => ({
    id: task.id,
    title: getTaskTitle(task, locale),
    priorityLabel: getPriorityLabel(task.priority, locale),
    estimateLabel: `${task.estimatedMinutes}m`,
    dueLabel: formatDueLabel(task.dueAt, profile.timezone, locale),
    pinned: focusTaskIds.includes(task.id),
    estimatedMinutes: task.estimatedMinutes,
  }))
  const budgetProgress = plannedWorkMinutes > 0 ? Math.min((selectedOpenMinutes / plannedWorkMinutes) * 100, 100) : 0
  const budgetDeltaMinutes = plannedWorkMinutes - selectedOpenMinutes
  const selectedFocusSessions = focusSessions
    .map((session) => sliceFocusSessionToDay(session, selectedDate))
    .filter((session): session is FocusSession => Boolean(session))
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime())
  const selectedTrackedFocusSeconds = selectedFocusSessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  )
  const selectedHourlyFocus = buildHourlyFocusSessions(selectedFocusSessions, selectedDate, profile.timezone)
  const selectedActiveHours = selectedHourlyFocus
    .map((seconds, hour) => ({ hour, seconds }))
    .filter((entry) => entry.seconds > 0)
  const firstFocusSession = selectedFocusSessions[0] ?? null
  const lastFocusSession = selectedFocusSessions.length > 0 ? selectedFocusSessions.at(-1) ?? null : null
  const displayFocusSeconds =
    selectedTrackedFocusSeconds > 0 ? selectedTrackedFocusSeconds : todayScore.focusMinutes * 60
  const displayFocusLabel = formatClock(displayFocusSeconds)
  const timerTask = activeTimer ? tasks.find((task) => task.id === activeTimer.taskId) ?? null : null
  const activeWorkSession =
    workSessions
      .slice()
      .reverse()
      .find((session) => session.clockOutAt === null) ?? null
  const selectedWorkSessions = workSessions
    .filter((session) => getWorkSessionOverlapForDay(session, selectedDate, workTimerTick) > 0)
    .sort((left, right) => new Date(left.clockInAt).getTime() - new Date(right.clockInAt).getTime())
  const selectedWorkSeconds = selectedWorkSessions.reduce(
    (sum, session) => sum + getWorkSessionOverlapForDay(session, selectedDate, workTimerTick),
    0,
  )
  const displayWorkLabel = formatClock(selectedWorkSeconds)
  const selectedFocusRatio = selectedWorkSeconds > 0 ? Math.round((selectedTrackedFocusSeconds / selectedWorkSeconds) * 100) : 0
  const weeklyReviewDays = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 6)).map((day) => {
    const dayKey = getDateKey(day, profile.timezone)
    const dayScore =
      dailyScores.find((score) => score.date === dayKey) ??
      {
        ...calculateDailyScore(
          completions.filter((completion) => getDateKey(completion.completedAt, profile.timezone) === dayKey),
          highScore,
        ),
        date: dayKey,
      }
    const dayFocusSeconds = focusSessions
      .map((session) => sliceFocusSessionToDay(session, day))
      .filter((session): session is FocusSession => Boolean(session))
      .reduce((sum, session) => sum + session.durationSeconds, 0)
    const dayWorkSeconds = workSessions.reduce(
      (sum, session) => sum + getWorkSessionOverlapForDay(session, day, workTimerTick),
      0,
    )
    const dayFlowEvents = flowEvents.filter((event) => getDateKey(event.at, profile.timezone) === dayKey)

    return {
      day,
      key: dayKey,
      label: new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        timeZone: profile.timezone,
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      }).format(day),
      score: dayScore.totalScore,
      completedCount: dayScore.completedCount,
      focusSeconds: dayFocusSeconds,
      workSeconds: dayWorkSeconds,
      focusRatio: dayWorkSeconds > 0 ? Math.round((dayFocusSeconds / dayWorkSeconds) * 100) : 0,
      switchCount: dayFlowEvents.filter((event) => event.type !== 'resume').length,
      interruptCount: dayFlowEvents.filter((event) => event.type === 'interrupt').length,
      reflection: dailyReflections[dayKey] ?? '',
    }
  })
  const weeklyScoreTotal = weeklyReviewDays.reduce((sum, day) => sum + day.score, 0)
  const weeklyFocusTotal = weeklyReviewDays.reduce((sum, day) => sum + day.focusSeconds, 0)
  const weeklyWorkTotal = weeklyReviewDays.reduce((sum, day) => sum + day.workSeconds, 0)
  const weeklyCompletedTotal = weeklyReviewDays.reduce((sum, day) => sum + day.completedCount, 0)
  const bestFocusDay =
    weeklyReviewDays
      .slice()
      .sort((left, right) => right.focusSeconds - left.focusSeconds)[0] ?? null
  const bestCompletionDay =
    weeklyReviewDays
      .filter((day) => day.completedCount > 0)
      .slice()
      .sort((left, right) => right.completedCount - left.completedCount || right.score - left.score)[0] ?? null
  const mostInterruptedDay =
    weeklyReviewDays
      .filter((day) => day.interruptCount > 0 || day.switchCount > 0)
      .slice()
      .sort((left, right) => right.interruptCount - left.interruptCount || right.switchCount - left.switchCount)[0] ?? null
  const weeklyReviewItems = weeklyReviewDays.map((day) => ({
    key: day.key,
    label: day.label,
    completedLabel: locale === 'ko' ? `${day.completedCount}개 완료` : `${day.completedCount} done`,
    focusLabel: formatClock(day.focusSeconds),
    ratioLabel: `${day.focusRatio}%`,
    scoreLabel: day.score.toString(),
    switchLabel: locale === 'ko' ? `전환 ${day.switchCount}` : `${day.switchCount} switches`,
    reflection: day.reflection,
    widthPercent: Math.max(
      10,
      bestFocusDay?.focusSeconds ? (day.focusSeconds / Math.max(bestFocusDay.focusSeconds, 1)) * 100 : 10,
    ),
  }))
  const weeklyBestFocusTitle = bestFocusDay && bestFocusDay.focusSeconds > 0 ? bestFocusDay.label : '--'
  const weeklyBestFocusBody = bestFocusDay
    ? bestFocusDay.focusSeconds > 0
      ? locale === 'ko'
        ? `${formatClock(bestFocusDay.focusSeconds)} 집중, ${bestFocusDay.focusRatio}% 비율, ${bestFocusDay.completedCount}개 완료`
        : `${formatClock(bestFocusDay.focusSeconds)} tracked, ${bestFocusDay.focusRatio}% ratio, ${bestFocusDay.completedCount} completed`
      : locale === 'ko'
        ? '아직 집중 데이터가 충분하지 않습니다.'
        : 'Not enough focus data yet.'
    : locale === 'ko'
      ? '아직 주간 데이터가 충분하지 않습니다.'
      : 'Not enough weekly data yet.'
  const weeklyInterpretation = weeklyWorkTotal > 0
    ? locale === 'ko'
      ? `최근 7일 동안 근무 ${formatClock(weeklyWorkTotal)} 중 실집중 ${formatClock(weeklyFocusTotal)}가 기록되었습니다. 근무 대비 집중 비율은 ${Math.round((weeklyFocusTotal / Math.max(weeklyWorkTotal, 1)) * 100)}%입니다.`
      : `Across the last 7 days, ${formatClock(weeklyFocusTotal)} of ${formatClock(weeklyWorkTotal)} turned into tracked focus.`
    : locale === 'ko'
      ? '출근과 집중 데이터가 쌓이면 주간 해석이 여기에 보입니다.'
      : 'Weekly interpretation appears once workday and focus data accumulate.'
  const weeklyCompletionTitle = bestCompletionDay ? bestCompletionDay.label : '--'
  const weeklyCompletionBody = bestCompletionDay
    ? locale === 'ko'
      ? `${bestCompletionDay.completedCount}개 완료, ${bestCompletionDay.score}점, 실집중 ${formatClock(bestCompletionDay.focusSeconds)}`
      : `${bestCompletionDay.completedCount} done, ${bestCompletionDay.score} score, ${formatClock(bestCompletionDay.focusSeconds)} tracked`
    : locale === 'ko'
      ? '아직 완료 기록이 충분하지 않습니다.'
      : 'Not enough completion data yet.'
  const weeklyInterruptTitle = mostInterruptedDay && mostInterruptedDay.interruptCount > 0 ? mostInterruptedDay.label : '--'
  const weeklyInterruptBody =
    mostInterruptedDay && (mostInterruptedDay.interruptCount > 0 || mostInterruptedDay.switchCount > 0)
      ? locale === 'ko'
        ? `전환 ${mostInterruptedDay.switchCount}회, 끼어들기 ${mostInterruptedDay.interruptCount}회`
        : `${mostInterruptedDay.switchCount} switches, ${mostInterruptedDay.interruptCount} interrupts`
      : locale === 'ko'
        ? '이번 주엔 큰 흐름 붕괴가 두드러지지 않았습니다.'
        : 'No standout interruption spike this week.'
  const weeklyReflectionItems = weeklyReviewDays
    .filter((day) => day.reflection.trim().length > 0)
    .slice(-3)
    .reverse()
    .map((day) => ({
      key: day.key,
      label: day.label,
      text: day.reflection,
    }))
  const activeWorkElapsedSeconds = activeWorkSession ? getWorkSessionDurationSeconds(activeWorkSession, workTimerTick) : 0
  const activeWorkStartLabel = activeWorkSession
    ? formatShortTime(activeWorkSession.clockInAt, locale, profile.timezone)
    : '--:--'
  const workspaceModeLabel =
    currentView === 'today'
      ? activeTimer
        ? locale === 'ko'
          ? '실행 중'
          : 'Running'
        : activeWorkSession
          ? locale === 'ko'
            ? '근무 중'
            : 'Workday open'
          : locale === 'ko'
            ? '준비됨'
            : 'Ready'
      : currentView === 'history'
        ? locale === 'ko'
          ? '주간 리뷰'
          : 'Weekly review'
        : currentView === 'done'
          ? locale === 'ko'
            ? '완료 기록'
            : 'Completed'
          : currentView === 'inbox'
            ? locale === 'ko'
              ? '정리 필요'
              : 'Triage'
            : locale === 'ko'
              ? '연동'
              : 'Integrations'
  const promptedNextTasks = nextTaskPrompt
    ? nextTaskPrompt.candidateTaskIds
        .map((taskId) => tasks.find((task) => task.id === taskId) ?? null)
        .filter((task): task is Task => Boolean(task))
    : []
  const pausedTaskDetails = pausedSessions
    .slice()
    .sort((left, right) => {
      if (left.mode !== right.mode) {
        return left.mode === 'interrupt' ? -1 : 1
      }

      return new Date(right.pausedAt).getTime() - new Date(left.pausedAt).getTime()
    })
    .map((session) => ({
      session,
      task: tasks.find((task) => task.id === session.taskId) ?? null,
    }))
    .filter((item): item is { session: PausedSession; task: Task } => Boolean(item.task))
  const pausedTaskItems = pausedTaskDetails.map(({ session, task }) => ({
    taskId: session.taskId,
    title: getTaskTitle(task, locale),
    elapsedLabel: formatClock(session.elapsedSeconds),
    modeLabel: getPausedSessionLabel(session.mode, locale),
  }))
  const elapsedMinutes = activeTimer ? Math.max(1, Math.ceil(activeTimer.elapsedSeconds / 60)) : 0
  const elapsedClock = activeTimer ? formatClock(activeTimer.elapsedSeconds) : '00:00'
  const estimateClock = activeTimer ? formatClock(activeTimer.estimatedMinutes * 60) : '00:00'
  const remainingClock = activeTimer
    ? elapsedMinutes > activeTimer.estimatedMinutes
      ? `+${formatClock((elapsedMinutes - activeTimer.estimatedMinutes) * 60)}`
      : formatClock(Math.max(activeTimer.estimatedMinutes * 60 - activeTimer.elapsedSeconds, 0))
    : '00:00'
  const progress = activeTimer
    ? Math.min((elapsedMinutes / Math.max(activeTimer.estimatedMinutes, 1)) * 100, 100)
    : 0
  const timerTone = getTimerTone(locale, activeTimer)

  const filteredTasks = tasks.filter((task) => {
    const query = deferredSearch.trim().toLowerCase()
    const localizedTitle = getTaskTitle(task, locale).toLowerCase()
    const note = task.notes?.toLowerCase() ?? ''
    const tags = task.tags.join(' ').toLowerCase()

    return (
      task.status !== 'archived' &&
      (statusFilter === 'all' || task.status === statusFilter) &&
      (priorityFilter === 'all' || task.priority === priorityFilter) &&
      (query.length === 0 ||
        localizedTitle.includes(query) ||
        note.includes(query) ||
        tags.includes(query))
    )
  })

  const navItems = useMemo(
    () => [
      { id: 'today' as const, label: copy.navToday, icon: Activity },
      { id: 'inbox' as const, label: copy.navInbox, icon: Inbox },
      { id: 'done' as const, label: copy.navDone, icon: CheckCircle2 },
      { id: 'history' as const, label: copy.navHistory, icon: Layers3 },
      { id: 'integrations' as const, label: copy.navIntegrations, icon: Link2 },
    ],
    [copy],
  )

  const reportItems =
    locale === 'ko'
      ? [
          `${todayReport.completedCount}개 완료`,
          `${todayReport.totalScore}점 획득`,
          `콤보 최고 x${todayReport.comboPeak || 1}`,
        ]
      : [
          `${todayReport.completedCount} tasks finished`,
          `${todayReport.totalScore} score earned`,
          `Peak combo x${todayReport.comboPeak || 1}`,
        ]

  if (todayReport.highScore) {
    reportItems.unshift(copy.rewardHigh)
  }

  const completionFeedItems = todayCompletions
    .slice()
    .reverse()
    .map((completion) => {
      const linkedTask = tasks.find((task) => task.id === completion.taskId)

      return {
        id: completion.id,
        title: linkedTask ? getTaskTitle(linkedTask, locale) : 'Task',
        meta: copy.completionMeta(completion.scoreEarned, completion.actualMinutes),
        statusLabel:
          completion.completionState === 'overtime'
            ? copy.overtime
            : completion.completionState === 'early'
              ? copy.early
              : copy.onTime,
      }
    })

  const promptedTaskItems = promptedNextTasks.map((task) => {
    const pausedSession = pausedSessions.find((session) => session.taskId === task.id)

    return {
      id: task.id,
      title: getTaskTitle(task, locale),
      priorityLabel: getPriorityLabel(task.priority, locale),
      categoryLabel: getCategoryLabel(task.category, locale),
      detail: pausedSession
        ? locale === 'ko'
          ? `이어 하기 · ${formatClock(pausedSession.elapsedSeconds)}`
          : `Resume · ${formatClock(pausedSession.elapsedSeconds)}`
        : locale === 'ko'
          ? `예상 ${task.estimatedMinutes}분`
          : `Estimate ${task.estimatedMinutes}m`,
    }
  })
  const promptedPrimaryTask = promptedTaskItems[0] ?? null
  const promptedOtherTasks = promptedTaskItems.slice(1)

  const displayedTasks = filteredTasks.filter((task) => {
    if (currentView === 'today') return task.status !== 'done'
    if (currentView === 'inbox') return task.status === 'todo'
    if (currentView === 'done') return task.status === 'done'
    return false
  })

  const topMetrics = [
    { label: copy.todayScore, value: todayScore.totalScore.toString(), accent: true },
    { label: copy.highScore, value: highScore.toString(), accent: false },
    { label: copy.focusMinutes, value: displayFocusLabel, accent: false },
    { label: copy.level, value: `${profile.level}`, accent: false },
  ]

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify(locale))
    window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme))
    window.localStorage.setItem(STORAGE_KEYS.workBudgetMinutes, JSON.stringify(plannedWorkMinutes))
    window.localStorage.setItem(STORAGE_KEYS.focusTaskIds, JSON.stringify(focusTaskIds))
  }, [focusTaskIds, locale, plannedWorkMinutes, theme])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
    window.localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions))
    window.localStorage.setItem(STORAGE_KEYS.dailyScores, JSON.stringify(dailyScores))
    window.localStorage.setItem(STORAGE_KEYS.highScore, JSON.stringify(highScore))
    window.localStorage.setItem(STORAGE_KEYS.flowEvents, JSON.stringify(flowEvents))
    window.localStorage.setItem(STORAGE_KEYS.focusSessions, JSON.stringify(focusSessions))
    window.localStorage.setItem(STORAGE_KEYS.workSessions, JSON.stringify(workSessions))
    window.localStorage.setItem(STORAGE_KEYS.dailyReflections, JSON.stringify(dailyReflections))
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  }, [completions, dailyReflections, dailyScores, flowEvents, focusSessions, highScore, profile, tasks, workSessions])

  const playRewardSound = useEffectEvent((nextReward: RewardBurst) => {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioCtx) return

    const context = new AudioCtx()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = nextReward.highScore ? 'triangle' : 'square'
    oscillator.frequency.value = nextReward.highScore ? 880 : 660
    gain.gain.value = 0.0001

    oscillator.connect(gain)
    gain.connect(context.destination)

    const now = context.currentTime
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
    oscillator.start(now)
    oscillator.stop(now + 0.2)

    window.setTimeout(() => {
      void context.close().catch(() => undefined)
    }, 260)
  })

  useEffect(() => {
    if (!rewardBurst) return undefined

    playRewardSound(rewardBurst)
    const timeout = window.setTimeout(() => setRewardBurst(null), 1500)

    return () => window.clearTimeout(timeout)
  }, [rewardBurst])

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return undefined

    const interval = window.setInterval(() => {
      setActiveTimer((current) =>
        current && !current.isPaused
          ? { ...current, elapsedSeconds: current.elapsedSeconds + 1 }
          : current,
      )
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeTimer])

  useEffect(() => {
    setTasks((current) =>
      current.some((task) => task.status === 'in_progress')
        ? current.map((task) =>
            task.status === 'in_progress' ? { ...task, status: 'todo' } : task,
          )
        : current,
    )
  }, [])

  useEffect(() => {
    if (!activeWorkSession) return undefined

    const interval = window.setInterval(() => {
      setWorkTimerTick(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeWorkSession])

  function trackFocusSegment(timer: TimerState | null, endedAt = new Date().toISOString()) {
    if (!timer) return

    const nextSession = createFocusSession(timer, endedAt)
    if (!nextSession) return

    setFocusSessions((current) => [...current, nextSession])
  }

  function handleTogglePauseTimer() {
    if (!activeTimer) return

    const now = new Date().toISOString()

    if (activeTimer.isPaused) {
      setActiveTimer((current) =>
        current
          ? {
              ...current,
              isPaused: false,
              segmentStartedAt: now,
            }
          : current,
      )
      return
    }

    trackFocusSegment(activeTimer, now)
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            isPaused: true,
            segmentStartedAt: null,
          }
        : current,
    )
  }

  function handleStopActiveTimer() {
    if (!activeTimer) return

    trackFocusSegment(activeTimer)
    setTasks((current) =>
      current.map((task) =>
        task.id === activeTimer.taskId && task.status === 'in_progress'
          ? { ...task, status: 'todo' }
          : task,
      ),
    )
    setActiveTimer(null)
  }

  function handleClockIn() {
    if (activeWorkSession) return

    const now = new Date().toISOString()
    setWorkSessions((current) => [
      ...current,
      {
        id: `work-${now.replaceAll(/[:.]/g, '-')}`,
        clockInAt: now,
        clockOutAt: null,
      },
    ])
    setWorkTimerTick(Date.now())
    setClockOutSummary(null)
    setClockOutReflection('')
  }

  function handleClockOut() {
    if (!activeWorkSession) return

    const clockOutAt = new Date().toISOString()
    const nextDayKey = getDateKey(activeWorkSession.clockInAt, profile.timezone)
    const nextWorkSeconds = getWorkSessionDurationSeconds(
      { ...activeWorkSession, clockOutAt },
      workTimerTick,
    )
    const activeFocusSegment = activeTimer ? createFocusSession(activeTimer, clockOutAt) : null
    const allFocusSessions = activeFocusSegment ? [...focusSessions, activeFocusSegment] : focusSessions
    const focusSessionsInRange = allFocusSessions.filter(
      (session) => getOverlapSeconds(session.startedAt, session.endedAt, activeWorkSession.clockInAt, clockOutAt) > 0,
    )
    const focusSecondsInRange = focusSessionsInRange.reduce(
      (sum, session) =>
        sum + getOverlapSeconds(session.startedAt, session.endedAt, activeWorkSession.clockInAt, clockOutAt),
      0,
    )
    const completionsForSessionDay = completions.filter(
      (completion) => getDateKey(completion.completedAt, profile.timezone) === nextDayKey,
    )
    const dailyScoreForSessionDay =
      dailyScores.find((score) => score.date === nextDayKey) ??
      {
        ...calculateDailyScore(completionsForSessionDay, highScore),
        date: nextDayKey,
      }
    const flowEventsForSessionDay = flowEvents.filter(
      (event) => getDateKey(event.at, profile.timezone) === nextDayKey,
    )
    const carryOverCount = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length
    const hourlyFocus = buildHourlyFocusSessions(
      focusSessionsInRange,
      new Date(activeWorkSession.clockInAt),
      profile.timezone,
    )
    const peakHourEntry = hourlyFocus
      .map((seconds, hour) => ({ hour, seconds }))
      .sort((left, right) => right.seconds - left.seconds)[0]

    if (activeTimer) {
      trackFocusSegment(activeTimer, clockOutAt)
      setTasks((current) =>
        current.map((task) =>
          task.id === activeTimer.taskId && task.status === 'in_progress'
            ? { ...task, status: 'todo' }
            : task,
        ),
      )
      setActiveTimer(null)
    }

    setWorkSessions((current) =>
      current.map((session) =>
        session.id === activeWorkSession.id
          ? {
              ...session,
              clockOutAt,
            }
          : session,
      ),
    )
    setClockOutSummary({
      dayKey: nextDayKey,
      clockInAt: activeWorkSession.clockInAt,
      clockOutAt,
      workSeconds: nextWorkSeconds,
      focusSeconds: focusSecondsInRange,
      focusRatio: nextWorkSeconds > 0 ? Math.round((focusSecondsInRange / nextWorkSeconds) * 100) : 0,
      completedCount: completionsForSessionDay.length,
      totalScore: dailyScoreForSessionDay.totalScore,
      switchCount: flowEventsForSessionDay.filter((event) => event.type !== 'resume').length,
      interruptCount: flowEventsForSessionDay.filter((event) => event.type === 'interrupt').length,
      firstFocusAt: focusSessionsInRange[0]?.startedAt ?? null,
      lastFocusAt: focusSessionsInRange.length > 0 ? (focusSessionsInRange.at(-1)?.endedAt ?? null) : null,
      peakHour: peakHourEntry && peakHourEntry.seconds > 0 ? peakHourEntry.hour : null,
      carryOverCount,
    })
    setClockOutReflection(dailyReflections[nextDayKey] ?? '')
  }

  function handleSaveClockOutReflection(value: string) {
    if (!clockOutSummary) return

    const trimmed = value.trim()
    setDailyReflections((current) => {
      if (!trimmed) {
        const next = { ...current }
        delete next[clockOutSummary.dayKey]
        return next
      }

      return {
        ...current,
        [clockOutSummary.dayKey]: trimmed,
      }
    })
  }

  function handleCloseClockOutSummary() {
    handleSaveClockOutReflection(clockOutReflection)
    setClockOutSummary(null)
    setClockOutReflection('')
  }

  function handleCompleteTask(taskId: string) {
    const task = tasks.find((candidate) => candidate.id === taskId)
    if (!task || task.status === 'done') return
    const nextTaskChoices = getNextTaskChoices(tasks, taskId, pausedSessions)
    const activeSegment = activeTimer?.taskId === taskId ? activeTimer : null

    const completedAt = new Date().toISOString()
    const actualMinutes =
      activeTimer?.taskId === taskId
        ? Math.max(1, Math.ceil(activeTimer.elapsedSeconds / 60))
        : task.estimatedMinutes
    const estimatedMinutes =
      activeTimer?.taskId === taskId ? activeTimer.estimatedMinutes : task.estimatedMinutes
    const wasOverdue = Boolean(
      task.dueAt && new Date(task.dueAt).getTime() < new Date(completedAt).getTime(),
    )

    const breakdown = calculateTaskScore(task, {
      comboIndex: todayCompletions.length + 1,
      focusMinutes: actualMinutes,
      estimatedMinutes,
      actualMinutes,
      wasOverdue,
    })

    const nextCompletion: TaskCompletion = {
      id: `completion-${completedAt.replaceAll(/[:.]/g, '-')}`,
      taskId,
      completedAt,
      focusMinutes: actualMinutes,
      estimatedMinutes,
      actualMinutes,
      wasOverdue,
      comboIndex: todayCompletions.length + 1,
      scoreEarned: breakdown.totalScore,
      bonusPoints: breakdown.totalScore - task.points,
      timeBonus: breakdown.timeBonus,
      completionState: breakdown.completionState,
    }

    const nextDailyScore = {
      ...calculateDailyScore([...todayCompletions, nextCompletion], highScore),
      date: todayKey,
    }

    startTransition(() => {
      if (activeSegment) {
        trackFocusSegment(activeSegment, completedAt)
      }
      setTasks((current) =>
        current.map((item) => (item.id === taskId ? { ...item, status: 'done' } : item)),
      )
      setCompletions((current) => [...current, nextCompletion])
      setDailyScores((current) => upsertDailyScore(current, nextDailyScore))
      setHighScore((current) => updateHighScore(current, nextDailyScore.totalScore))
      setProfile((current) => ({
        ...current,
        lifetimeScore: current.lifetimeScore + breakdown.totalScore,
        level: 1 + Math.floor((current.lifetimeScore + breakdown.totalScore) / 700),
      }))
      setRewardBurst({
        ...breakdown,
        taskTitle: getTaskTitle(task, locale),
        highScore: nextDailyScore.totalScore > highScore,
      })
      setNextTaskPrompt(
        nextTaskChoices.length > 0
          ? {
              completedTaskTitle: getTaskTitle(task, locale),
              candidateTaskIds: nextTaskChoices.map((candidate) => candidate.id),
              kind: pausedSessions.some((session) => session.taskId === nextTaskChoices[0]?.id)
                ? 'resume'
                : 'next',
            }
          : null,
      )
      setActiveTimer((current) => (current?.taskId === taskId ? null : current))
    })
  }

  function handleStartTimer(taskId: string, estimatedMinutes: number) {
    if (activeTimer && activeTimer.taskId !== taskId) {
      setSwitchPrompt({
        nextTaskId: taskId,
        estimatedMinutes,
        source: pausedSessions.some((session) => session.taskId === taskId) ? 'resume' : 'new',
      })
      return
    }

    setIsDockCollapsed(false)
    setNextTaskPrompt(null)
    setSwitchPrompt(null)
    setActiveTimer({
      taskId,
      estimatedMinutes,
      elapsedSeconds: 0,
      isPaused: false,
      segmentStartedAt: new Date().toISOString(),
    })

    setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId && task.status === 'todo'
          ? { ...task, status: 'in_progress' }
          : task,
      ),
    )
  }

  function handleStartSuggestedTask(taskId: string) {
    const selectedTask = tasks.find((task) => task.id === taskId)

    if (!selectedTask) {
      setNextTaskPrompt(null)
      return
    }

    const pausedSession = pausedSessions.find((session) => session.taskId === selectedTask.id)

    if (pausedSession) {
      setPausedSessions((current) =>
        current.filter((session) => session.taskId !== selectedTask.id),
      )
      setFlowEvents((current) => [...current, createFlowEvent('resume')])
      setActiveTimer({
        taskId: pausedSession.taskId,
        estimatedMinutes: pausedSession.estimatedMinutes,
        elapsedSeconds: pausedSession.elapsedSeconds,
        isPaused: false,
        segmentStartedAt: new Date().toISOString(),
      })
      setIsDockCollapsed(false)
    } else {
      handleStartTimer(selectedTask.id, selectedTask.estimatedMinutes)
    }

    setNextTaskPrompt(null)
  }

  function commitTaskSwitch(mode: 'switch' | 'interrupt') {
    if (!switchPrompt || !activeTimer) return
    const resumeSession = pausedSessions.find((session) => session.taskId === switchPrompt.nextTaskId)
    const switchedAt = new Date().toISOString()

    trackFocusSegment(activeTimer, switchedAt)

    setPausedSessions((current) => [
      {
        ...activeTimer,
        isPaused: true,
        segmentStartedAt: null,
        mode,
        pausedAt: switchedAt,
      },
      ...current.filter(
        (session) =>
          session.taskId !== activeTimer.taskId && session.taskId !== switchPrompt.nextTaskId,
      ),
    ])
    setFlowEvents((current) => [...current, createFlowEvent(mode)])

    setActiveTimer({
      taskId: switchPrompt.nextTaskId,
      estimatedMinutes: resumeSession?.estimatedMinutes ?? switchPrompt.estimatedMinutes,
      elapsedSeconds: resumeSession?.elapsedSeconds ?? 0,
      isPaused: false,
      segmentStartedAt: switchedAt,
    })
    setTasks((current) =>
      current.map((task) =>
        task.id === switchPrompt.nextTaskId
          ? {
              ...task,
              status: task.status === 'todo' ? 'in_progress' : task.status,
              tags:
                mode === 'interrupt' && !task.tags.includes('interrupt')
                  ? [...task.tags, 'interrupt']
                  : task.tags,
            }
          : task,
      ),
    )
    setSwitchPrompt(null)
    setNextTaskPrompt(null)
    setIsDockCollapsed(false)
  }

  function handleResumePausedTask(taskId: string) {
    const pausedSession = pausedSessions.find((session) => session.taskId === taskId)
    if (!pausedSession) return

    if (activeTimer && activeTimer.taskId !== taskId) {
      setSwitchPrompt({
        nextTaskId: taskId,
        estimatedMinutes: pausedSession.estimatedMinutes,
        source: 'resume',
      })
      return
    }

    setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
    setFlowEvents((current) => [...current, createFlowEvent('resume')])
    setActiveTimer({
      taskId: pausedSession.taskId,
      estimatedMinutes: pausedSession.estimatedMinutes,
      elapsedSeconds: pausedSession.elapsedSeconds,
      isPaused: false,
      segmentStartedAt: new Date().toISOString(),
    })
    setIsDockCollapsed(false)
    setNextTaskPrompt(null)
  }

  function handleRemovePausedTask(taskId: string) {
    setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
    setNextTaskPrompt((current) =>
      current
        ? {
            ...current,
            candidateTaskIds: current.candidateTaskIds.filter((candidateId) => candidateId !== taskId),
          }
        : null,
    )
    setSwitchPrompt((current) => (current?.nextTaskId === taskId ? null : current))
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = parsedDraft.title.trim()
    if (!title) return

    const points =
      effectiveDraftPriority === 'critical'
        ? 24
        : effectiveDraftPriority === 'high'
          ? 18
          : effectiveDraftPriority === 'medium'
            ? 13
            : 9

    const nextTask: Task = {
      id: `manual-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
      title,
      category: 'planning',
      priority: effectiveDraftPriority,
      status: 'todo',
      estimatedMinutes: effectiveDraftMinutes,
      dueAt: getDraftDueAt(effectiveDraftHorizon),
      points,
      source: 'manual',
      tags: ['quick-add', effectiveDraftHorizon],
      notes: locale === 'ko' ? '직접 추가한 태스크' : 'Manually added task',
    }

    startTransition(() => {
      setTasks((current) => [...current, nextTask])
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
      setDraftHorizon('today')
    })
  }

  function loadDemoBoard() {
    startTransition(() => {
      setTasks((current) => {
        const existingIds = new Set(current.map((task) => task.id))
        return [...notionPreviewTasks.filter((task) => !existingIds.has(task.id)), ...current]
      })
    })
  }

  function handleDeleteTask(taskId: string) {
    const removedCompletionScore = completions
      .filter((completion) => completion.taskId === taskId)
      .reduce((sum, completion) => sum + completion.scoreEarned, 0)

    startTransition(() => {
      const nextTasks = tasks.filter((task) => task.id !== taskId)
      const nextCompletions = completions.filter((completion) => completion.taskId !== taskId)
      const groupedByDate = nextCompletions.reduce<Record<string, TaskCompletion[]>>((acc, completion) => {
        const dateKey = getDateKey(completion.completedAt, profile.timezone)
        acc[dateKey] = [...(acc[dateKey] ?? []), completion]
        return acc
      }, {})

      const nextDailyScores = Object.entries(groupedByDate)
        .map(([, groupedCompletions]) => {
          const score = calculateDailyScore(groupedCompletions, 0)
          return { ...score, date: getDateKey(groupedCompletions[0].completedAt, profile.timezone) }
        })
        .sort((left, right) => left.date.localeCompare(right.date))

      const nextHighScore = Math.max(0, ...nextDailyScores.map((score) => score.totalScore))

      setTasks(nextTasks)
      setCompletions(nextCompletions)
      setFocusSessions((current) => current.filter((session) => session.taskId !== taskId))
      setDailyScores(nextDailyScores)
      setHighScore(nextHighScore)
      setProfile((current) => ({
        ...current,
        lifetimeScore: Math.max(0, current.lifetimeScore - removedCompletionScore),
        level: 1 + Math.floor(Math.max(0, current.lifetimeScore - removedCompletionScore) / 700),
      }))
      setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
      setFocusTaskIds((current) => current.filter((id) => id !== taskId))
      setNextTaskPrompt((current) =>
        current
          ? {
              ...current,
              candidateTaskIds: current.candidateTaskIds.filter((candidateId) => candidateId !== taskId),
            }
          : null,
      )
      setActiveTimer((current) => (current?.taskId === taskId ? null : current))
    })
  }

  function toggleFocusTask(taskId: string) {
    setFocusTaskIds((current) => {
      if (current.includes(taskId)) {
        return current.filter((id) => id !== taskId)
      }

      if (current.length >= 3) {
        return [...current.slice(1), taskId]
      }

      return [...current, taskId]
    })
  }

  function resetBoard() {
    startTransition(() => {
      setTasks(EMPTY_TASKS)
      setCompletions(EMPTY_COMPLETIONS)
      setDailyScores(EMPTY_DAILY_SCORES)
      setHighScore(EMPTY_HIGH_SCORE)
      setFlowEvents(EMPTY_FLOW_EVENTS)
      setFocusSessions(EMPTY_FOCUS_SESSIONS)
      setWorkSessions(EMPTY_WORK_SESSIONS)
      setProfile({ ...EMPTY_PROFILE })
      setActiveTimer(null)
      setPausedSessions([])
      setIsDockCollapsed(false)
      setRewardBurst(null)
      setNextTaskPrompt(null)
      setSwitchPrompt(null)
      setClockOutSummary(null)
      setCurrentView('today')
      setStatusFilter('all')
      setPriorityFilter('all')
      setSearch('')
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
      setDraftHorizon('today')
      setPlannedWorkMinutes(360)
      setFocusTaskIds([])
    })
  }

  function clearAll() {
    startTransition(() => {
      setTasks(EMPTY_TASKS)
      setCompletions(EMPTY_COMPLETIONS)
      setDailyScores(EMPTY_DAILY_SCORES)
      setHighScore(EMPTY_HIGH_SCORE)
      setFlowEvents(EMPTY_FLOW_EVENTS)
      setFocusSessions(EMPTY_FOCUS_SESSIONS)
      setWorkSessions(EMPTY_WORK_SESSIONS)
      setProfile({ ...EMPTY_PROFILE })
      setActiveTimer(null)
      setPausedSessions([])
      setIsDockCollapsed(false)
      setRewardBurst(null)
      setNextTaskPrompt(null)
      setSwitchPrompt(null)
      setClockOutSummary(null)
      setCurrentView('today')
      setStatusFilter('all')
      setPriorityFilter('all')
      setSearch('')
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
      setDraftHorizon('today')
      setPlannedWorkMinutes(360)
      setFocusTaskIds([])
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] px-3 py-3 md:px-5 md:py-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 xl:grid-cols-[232px_minmax(0,1fr)_416px] 2xl:grid-cols-[232px_minmax(0,1fr)_432px]">
        <aside className="flex min-h-0 flex-col gap-3">
          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-[18px] font-semibold tracking-[-0.04em]">
                    {copy.appTitle}
                  </CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {copy.appSubtitle}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-300/20 bg-amber-300/10 text-amber-200"
                >
                  {copy.demoBadge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setCurrentView(item.id)
                    setStatusFilter('all')
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                    currentView === item.id
                      ? 'bg-[var(--surface)] text-foreground shadow-[inset_0_0_0_1px_var(--line-strong)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-foreground',
                  )}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className={quietCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{copy.profileLabel}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0">
              <SidebarMetric icon={Sparkles} label={copy.todayScore} value={todayScore.totalScore.toString()} />
              <SidebarMetric icon={Flame} label={copy.currentCombo} value={`x${todayScore.comboPeak || 1}`} />
              <SidebarMetric icon={Clock3} label={copy.focusMinutes} value={displayFocusLabel} />
              <SidebarMetric icon={CalendarClock} label={copy.taskCountLabel} value={openTasks.length.toString()} />
            </CardContent>
          </Card>

          <Card className={quietCardClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '근무 시간' : 'Workday'}
                </CardTitle>
                <Badge variant="outline" className={outlineBadgeClass}>
                  {activeWorkSession ? (locale === 'ko' ? '근무 중' : 'Clocked in') : locale === 'ko' ? '오프' : 'Off'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SidebarMetric
                  icon={CalendarClock}
                  label={locale === 'ko' ? '출근' : 'Clock in'}
                  value={activeWorkSession ? activeWorkStartLabel : '--:--'}
                />
                <SidebarMetric
                  icon={Clock3}
                  label={locale === 'ko' ? '근무 누적' : 'Elapsed'}
                  value={activeWorkSession ? formatClock(activeWorkElapsedSeconds) : formatClock(selectedWorkSeconds)}
                />
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      {locale === 'ko' ? '실집중 비율' : 'Focus ratio'}
                    </p>
                    <p className="mt-2 font-mono text-lg leading-none text-foreground">
                      {selectedWorkSeconds > 0 ? `${selectedFocusRatio}%` : '--'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--text-muted)]">
                    <p>{locale === 'ko' ? `실집중 ${displayFocusLabel}` : `Focus ${displayFocusLabel}`}</p>
                    <p>{locale === 'ko' ? `근무 ${displayWorkLabel}` : `Work ${displayWorkLabel}`}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleClockIn} disabled={Boolean(activeWorkSession)}>
                  {locale === 'ko' ? '출근' : 'Clock in'}
                </Button>
                <Button variant="outline" onClick={handleClockOut} disabled={!activeWorkSession}>
                  {locale === 'ko' ? '퇴근' : 'Clock out'}
                </Button>
              </div>

              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {activeWorkSession
                  ? locale === 'ko'
                    ? '근무 시간은 따로 흐르고, 실집중 시간은 타이머를 켠 작업만 집계됩니다.'
                    : 'Workday time keeps running separately. Focus time only counts while a task timer is running.'
                  : locale === 'ko'
                    ? '출근을 누르면 근무 시간이 기록되고, 퇴근하면 하루 요약이 열립니다.'
                    : 'Clock in starts a separate workday timer. Clock out opens a short daily report.'}
              </p>
            </CardContent>
          </Card>

          <Card className={quietCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{copy.language}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-0">
              <Button
                variant={locale === 'ko' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocale('ko')}
              >
                한글
              </Button>
              <Button
                variant={locale === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocale('en')}
              >
                EN
              </Button>
            </CardContent>
          </Card>

          <Card className={quietCardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{locale === 'ko' ? '테마' : 'Theme'}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pt-0">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                <SunMedium className="size-3.5" />
                {locale === 'ko' ? '라이트' : 'Light'}
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <MoonStar className="size-3.5" />
                {locale === 'ko' ? '다크' : 'Dark'}
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="flex min-h-0 flex-col gap-3">
          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                  <CardTitle className="text-[28px] leading-none font-semibold tracking-[-0.06em] xl:text-[32px]">
                    {currentView === 'today'
                      ? copy.workspaceTitle
                      : currentView === 'inbox'
                        ? copy.navInbox
                        : currentView === 'done'
                          ? copy.navDone
                          : currentView === 'history'
                            ? copy.navHistory
                            : copy.navIntegrations}
                  </CardTitle>
                  {(currentView === 'today' || currentView === 'inbox' || currentView === 'done') ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full"
                        onClick={() => {
                          setSelectedDayOffset((current) => current - 1)
                          setIsDatePickerOpen(false)
                        }}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDatePickerOpen((current) => !current)}
                          className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-soft)]"
                        >
                          <CalendarDays className="size-4 text-[var(--text-soft)]" />
                          <span className="font-medium text-foreground">{selectedDateLabel}</span>
                          <span className="text-[var(--text-muted)]">
                            {getRelativeDayLabel(selectedDayOffset, locale)}
                          </span>
                        </button>

                        {isDatePickerOpen ? (
                          <div className="absolute top-full left-0 z-20 mt-2 w-[280px] rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-4 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {locale === 'ko' ? '?좎쭨 ?좏깮' : 'Pick a date'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                  {locale === 'ko'
                                    ? `이 날짜의 일정 ${selectedScheduledCount}개`
                                    : `${selectedScheduledCount} scheduled items`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsDatePickerOpen(false)}
                              >
                                {locale === 'ko' ? '?リ린' : 'Close'}
                              </Button>
                            </div>

                            <Input
                              type="date"
                              value={selectedDateKey}
                              onChange={(event) => {
                                setSelectedDayOffset(getDayOffsetFromKey(event.target.value))
                              }}
                              className="mt-4 h-11 rounded-2xl border-[var(--line)] bg-[var(--surface)]"
                            />

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDayOffset(-1)}
                              >
                                {locale === 'ko' ? '어제' : 'Yesterday'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDayOffset(0)}
                              >
                                {locale === 'ko' ? '오늘' : 'Today'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDayOffset(1)}
                              >
                                {locale === 'ko' ? '내일' : 'Tomorrow'}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          setSelectedDayOffset(0)
                          setIsDatePickerOpen(false)
                        }}
                      >
                        {locale === 'ko' ? '오늘' : 'Today'}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 rounded-full"
                        onClick={() => {
                          setSelectedDayOffset((current) => current + 1)
                          setIsDatePickerOpen(false)
                        }}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {workspaceModeLabel}
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {currentView === 'today'
                        ? `${openTasks.length} / ${copy.taskCountLabel}`
                        : currentView === 'inbox'
                          ? `${inboxTasks.length} / ${copy.navInbox}`
                          : currentView === 'done'
                            ? `${doneTasks.length} / ${copy.navDone}`
                            : currentView === 'history'
                              ? '7d'
                              : copy.navIntegrations}
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {displayFocusLabel}
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      x{todayScore.comboPeak || 1}
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {locale === 'ko' ? '근무' : 'Work'} {activeWorkSession ? formatClock(activeWorkElapsedSeconds) : displayWorkLabel}
                    </Badge>
                  </div>
                  <CardDescription className="hidden">
                    {currentView === 'today'
                      ? `${openTasks.length} · ${copy.taskCountLabel}`
                      : currentView === 'inbox'
                        ? `${inboxTasks.length} · ${copy.navInbox}`
                        : currentView === 'done'
                          ? `${doneTasks.length} · ${copy.navDone}`
                          : currentView === 'history'
                            ? copy.historyBody
                            : copy.integrationsBody}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {currentView !== 'history' ? (
                    <Button size="sm" variant="secondary" onClick={loadDemoBoard}>
                      {copy.demoSyncLabel}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="destructive" onClick={clearAll}>
                    {copy.clearAll}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetBoard}>
                    <RefreshCcw className="size-3.5" />
                    {copy.resetBoard}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-2.5 pt-4 sm:grid-cols-2 2xl:grid-cols-4">
              {topMetrics.map((metric) => (
                <TopMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  accent={metric.accent}
                />
              ))}
            </CardContent>
          </Card>

          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-semibold tracking-[-0.04em]">
                      {currentView === 'today'
                        ? copy.boardTitle
                        : currentView === 'inbox'
                          ? copy.navInbox
                          : currentView === 'done'
                            ? copy.navDone
                            : currentView === 'history'
                              ? (locale === 'ko' ? '주간 리뷰' : 'Weekly review')
                              : copy.navIntegrations}
                    </CardTitle>
                    {currentView === 'history' || currentView === 'integrations' ? (
                      <CardDescription>
                        {currentView === 'history' ? copy.historyBody : copy.integrationsBody}
                      </CardDescription>
                    ) : null}
                  </div>

                  {currentView === 'today' || currentView === 'inbox' || currentView === 'done' ? (
                    <div className="flex flex-col gap-2 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-2 xl:flex-row">
                    <div className="relative xl:min-w-[280px] xl:flex-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={copy.searchPlaceholder}
                        className="h-10 w-full rounded-[16px] border-[var(--line)] bg-[var(--surface-soft)] pl-9"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as FilterValue)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-[16px] border-[var(--line)] bg-[var(--surface-soft)] xl:w-36">
                        <SelectValue placeholder={copy.allStatuses} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allStatuses}</SelectItem>
                        <SelectItem value="todo">{copy.todo}</SelectItem>
                        <SelectItem value="in_progress">{copy.inProgress}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={priorityFilter}
                      onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
                    >
                      <SelectTrigger className="h-10 w-full rounded-[16px] border-[var(--line)] bg-[var(--surface-soft)] xl:w-40">
                        <SelectValue placeholder={copy.allPriorities} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{copy.allPriorities}</SelectItem>
                        {priorityOptions.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {getPriorityLabel(priority, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  ) : null}
                </div>

              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 pt-4">
              {currentView === 'history' ? (
                <ScrollArea className="h-[calc(100vh-22rem)] pr-3">
                  <div className="space-y-3">
                    <WeeklyReviewPanel
                      locale={locale}
                      outlineBadgeClass={outlineBadgeClass}
                      weeklyScoreTotal={weeklyScoreTotal.toString()}
                      weeklyFocusTotal={formatClock(weeklyFocusTotal)}
                      weeklyWorkTotal={formatClock(weeklyWorkTotal)}
                      weeklyCompletedTotal={weeklyCompletedTotal.toString()}
                      days={weeklyReviewItems}
                      bestFocusTitle={weeklyBestFocusTitle}
                      bestFocusBody={weeklyBestFocusBody}
                      bestCompletionTitle={weeklyCompletionTitle}
                      bestCompletionBody={weeklyCompletionBody}
                      interruptTitle={weeklyInterruptTitle}
                      interruptBody={weeklyInterruptBody}
                      interpretation={weeklyInterpretation}
                      reflections={weeklyReflectionItems}
                    />

                    <div className="grid gap-3 lg:grid-cols-2">
                      {dailyScores
                        .slice()
                        .reverse()
                        .map((score) => (
                          <div
                            key={score.date}
                            className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] px-4 py-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{score.date}</p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                  {score.completedCount} tasks · combo x{score.comboPeak || 1}
                                </p>
                                <p className="mt-3 text-xs text-[var(--text-muted)]">
                                  {locale === 'ko' ? '집중' : 'Focus'} {score.focusMinutes}m
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-xl text-foreground">{score.totalScore}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                  {locale === 'ko' ? '점수' : 'Score'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </ScrollArea>
              ) : currentView === 'integrations' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-sm font-medium text-foreground">Notion</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                      {copy.integrationsBody}
                    </p>
                    <Button className="mt-4" size="sm" variant="secondary" onClick={loadDemoBoard}>
                      {copy.demoSyncLabel}
                    </Button>
                  </div>
                  <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4">
                    <p className="text-sm font-medium text-foreground">Calendar</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                      {copy.integrationSecondary}
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-22rem)] pr-3">
                  <div className="space-y-3">
                    {currentView === 'today' ? (
                      <StartDayPanel
                        locale={locale}
                        activeWorkSession={Boolean(activeWorkSession)}
                        activeWorkStartLabel={activeWorkStartLabel}
                        plannedWorkMinutes={plannedWorkMinutes}
                        selectedOpenMinutes={selectedOpenMinutes}
                        budgetProgress={budgetProgress}
                        budgetDeltaMinutes={budgetDeltaMinutes}
                        tasks={startDayTaskItems}
                        pinnedCount={focusTaskIds.length}
                        outlineBadgeClass={outlineBadgeClass}
                        onClockIn={handleClockIn}
                        onStartTimer={handleStartTimer}
                        onToggleFocusTask={toggleFocusTask}
                        onChangeBudget={setPlannedWorkMinutes}
                      />
                    ) : null}

                    {displayedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        locale={locale}
                        isActive={activeTimer?.taskId === task.id}
                        dueLabel={formatDueLabel(task.dueAt, profile.timezone, locale)}
                        outlineBadgeClass={outlineBadgeClass}
                        onComplete={handleCompleteTask}
                        onDelete={handleDeleteTask}
                        onStartTimer={handleStartTimer}
                      />
                    ))}

                    {displayedTasks.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-14 text-center">
                        <p className="text-base font-medium text-foreground">{copy.noVisibleTasks}</p>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">{copy.noVisibleTasksBody}</p>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {currentView === 'today' || currentView === 'inbox' ? (
              <CardFooter className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--panel-strong)]/92 backdrop-blur-xl">
                <TaskComposer
                  locale={locale}
                  draftTitle={draftTitle}
                  draftMinutes={draftMinutes}
                  effectiveDraftMinutes={effectiveDraftMinutes}
                  draftPriority={draftPriority}
                  effectiveDraftPriority={effectiveDraftPriority}
                  draftHorizon={draftHorizon}
                  effectiveDraftHorizon={effectiveDraftHorizon}
                  priorityOptions={priorityOptions}
                  addTaskLabel={copy.addTask}
                  getPriorityOptionLabel={getPriorityOptionLabel}
                  getPriorityLabel={getPriorityLabel}
                  getPriorityHint={getPriorityHint}
                  onSubmit={handleAddTask}
                  onTitleChange={setDraftTitle}
                  onMinutesChange={setDraftMinutes}
                  onPriorityChange={setDraftPriority}
                  onHorizonChange={setDraftHorizon}
                />
              </CardFooter>
            ) : null}
          </Card>
        </main>

        <aside className="flex min-h-0 flex-col gap-3">
          <FocusSidebar
            locale={locale}
            shellCardClass={shellCardClass}
            outlineBadgeClass={outlineBadgeClass}
            timerTitle={copy.timerTitle}
            rightPanelHint={copy.rightPanelHint}
            runningNow={copy.runningNow}
            stateIdle={copy.stateIdle}
            activeTimerLabel={copy.activeTimerLabel}
            workingNow={copy.workingNow}
            timerIdleTitle={copy.timerIdleTitle}
            timerIdleBody={copy.timerIdleBody}
            estimateLabel={copy.estimate}
            elapsedLabel={copy.elapsed}
            remainingLabel={copy.remaining}
            pauseLabel={copy.pause}
            resumeLabel={copy.resume}
            extendLabel={copy.extend}
            finishLabel={copy.finish}
            stopLabel={copy.stop}
            activeTaskTitle={timerTask ? getTaskTitle(timerTask, locale) : null}
            activeTimerPaused={activeTimer?.isPaused ?? false}
            timerTone={timerTone}
            progress={progress}
            estimateClock={estimateClock}
            elapsedClock={elapsedClock}
            remainingClock={remainingClock}
            pausedTasks={pausedTaskItems}
            onTogglePause={handleTogglePauseTimer}
            onExtend={() =>
              setActiveTimer((current) =>
                current ? { ...current, estimatedMinutes: current.estimatedMinutes + 10 } : current,
              )
            }
            onComplete={() => activeTimer && handleCompleteTask(activeTimer.taskId)}
            onStop={handleStopActiveTimer}
            onResumePaused={handleResumePausedTask}
            onRemovePaused={handleRemovePausedTask}
          />

          <TodayReportPanel
            shellCardClass={quietCardClass}
            title={copy.reportTitle}
            sentence={copy.reportSentence(todayReport.completedCount, todayReport.totalScore)}
            focusMinutesLabel={copy.focusMinutes}
            onTimeLabel={copy.onTime}
            overtimeLabel={copy.overtime}
            switchLabel={locale === 'ko' ? '전환' : 'Switches'}
            interruptLabel={locale === 'ko' ? '끼어들기' : 'Interrupts'}
            focusValue={displayFocusLabel}
            onTimeValue={todayReport.onTimeCount.toString()}
            overtimeValue={todayReport.overtimeCount.toString()}
            switchValue={todaySwitchCount.toString()}
            interruptValue={todayInterruptCount.toString()}
            reportItems={reportItems}
          />

          <FocusByHourPanel
            locale={locale}
            shellCardClass={quietCardClass}
            title={locale === 'ko' ? '시간대 집중' : 'Focus by hour'}
            description={
              locale === 'ko'
                ? '타이머로 실제로 눌러서 기록한 실집중 시간만 집계됩니다.'
                : 'Only time tracked by the focus timer is included.'
            }
            firstFocusLabel={locale === 'ko' ? '첫 집중' : 'First focus'}
            firstFocusValue={firstFocusSession ? formatShortTime(firstFocusSession.startedAt, locale, profile.timezone) : '--:--'}
            lastFocusLabel={locale === 'ko' ? '마지막 집중' : 'Last focus'}
            lastFocusValue={lastFocusSession ? formatShortTime(lastFocusSession.endedAt, locale, profile.timezone) : '--:--'}
            trackedLabel={locale === 'ko' ? '실집중' : 'Tracked'}
            trackedValue={displayFocusLabel}
            activeHours={selectedActiveHours}
            emptyText={locale === 'ko' ? '아직 이 날짜에 기록된 집중 세션이 없습니다.' : 'No tracked focus sessions for this date yet.'}
          />

          <CompletionFeedPanel
            shellCardClass={quietCardClass}
            title={copy.feedTitle}
            items={completionFeedItems}
            emptyText={copy.noCompletionYet}
            outlineBadgeClass={outlineBadgeClass}
          />
        </aside>
      </div>

      {activeTimer && timerTask ? (
        <div className="fixed right-4 bottom-4 z-40">
          {isDockCollapsed ? (
            <button
              type="button"
              onClick={() => setIsDockCollapsed(false)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-left shadow-2xl backdrop-blur-xl"
            >
              <LoaderCircle className="size-4 animate-spin text-amber-300" />
              <div>
                <p className="max-w-48 truncate text-sm font-medium text-foreground">
                  {getTaskTitle(timerTask, locale)}
                </p>
                <p className="text-xs text-[var(--text-soft)]">{remainingClock}</p>
              </div>
              <ChevronsUp className="size-4 text-[var(--text-soft)]" />
            </button>
          ) : (
            <div className="w-[320px] rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {locale === 'ko' ? '지금 진행 중' : 'Now running'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" />
                    <p className="truncate text-sm font-medium text-foreground">
                      {getTaskTitle(timerTask, locale)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDockCollapsed(true)}
                  className="rounded-xl border border-[var(--line)] p-2 text-[var(--text-soft)] transition-colors hover:text-foreground"
                >
                  <ChevronsDown className="size-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricSurface label={copy.remaining} value={remainingClock} />
                <MetricSurface label={copy.elapsed} value={elapsedClock} />
                <MetricSurface label={copy.estimate} value={estimateClock} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePauseTimer}
                >
                  {activeTimer.isPaused ? copy.resume : copy.pause}
                </Button>
                <Button size="sm" onClick={() => handleCompleteTask(activeTimer.taskId)}>
                  {copy.finish}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleStopActiveTimer}>
                  {copy.stop}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {nextTaskPrompt && promptedPrimaryTask ? (
        <NextTaskModal
          locale={locale}
          outlineBadgeClass={outlineBadgeClass}
          kind={nextTaskPrompt.kind}
          completedTaskTitle={nextTaskPrompt.completedTaskTitle}
          primaryTask={promptedPrimaryTask}
          otherTasks={promptedOtherTasks}
          onClose={() => setNextTaskPrompt(null)}
          onStartTask={handleStartSuggestedTask}
        />
      ) : null}

      {switchPrompt ? (
        <SwitchTaskModal
          locale={locale}
          onSwitch={() => commitTaskSwitch('switch')}
          onInterrupt={() => commitTaskSwitch('interrupt')}
          onClose={() => setSwitchPrompt(null)}
        />
      ) : null}

      {clockOutSummary ? (
        <ClockOutSummaryModal
          locale={locale}
          workRangeLabel={`${formatShortTime(clockOutSummary.clockInAt, locale, profile.timezone)} - ${formatShortTime(clockOutSummary.clockOutAt, locale, profile.timezone)}`}
          focusRatioLabel={
            locale === 'ko'
              ? `집중 비율 ${clockOutSummary.focusRatio}%`
              : `Focus ratio ${clockOutSummary.focusRatio}%`
          }
          workdayValue={formatClock(clockOutSummary.workSeconds)}
          focusValue={formatClock(clockOutSummary.focusSeconds)}
          completedValue={clockOutSummary.completedCount.toString()}
          scoreValue={clockOutSummary.totalScore.toString()}
          switchValue={clockOutSummary.switchCount.toString()}
          interruptValue={clockOutSummary.interruptCount.toString()}
          firstFocusValue={
            clockOutSummary.firstFocusAt
              ? formatShortTime(clockOutSummary.firstFocusAt, locale, profile.timezone)
              : '--:--'
          }
          lastFocusValue={
            clockOutSummary.lastFocusAt
              ? formatShortTime(clockOutSummary.lastFocusAt, locale, profile.timezone)
              : '--:--'
          }
          peakHourValue={
            clockOutSummary.peakHour !== null
              ? `${clockOutSummary.peakHour.toString().padStart(2, '0')}:00`
              : '--:--'
          }
          interpretation={
            clockOutSummary.focusRatio >= 50
              ? locale === 'ko'
                ? '오늘은 근무 시간 대비 실집중 비율이 안정적으로 유지됐습니다.'
                : 'You spent a healthy share of the day in focused work.'
              : locale === 'ko'
                ? '근무 시간은 길었지만, 실집중 시간은 상대적으로 짧았습니다.'
                : 'You were around for a while, but your tracked focus time stayed relatively low.'
          }
          carryOverCount={clockOutSummary.carryOverCount.toString()}
          reflection={clockOutReflection}
          onReflectionChange={setClockOutReflection}
          onClose={handleCloseClockOutSummary}
        />
      ) : null}

      {rewardBurst ? (
        <div className="fixed right-4 bottom-28 z-50 rounded-2xl border border-amber-300/20 bg-[var(--panel-strong)] px-4 py-3 text-foreground shadow-2xl backdrop-blur-xl">
          <div className="font-mono text-lg text-amber-300">+{rewardBurst.totalScore}</div>
          <div className="mt-1 text-sm font-medium">{rewardBurst.taskTitle}</div>
          <div className="mt-1 text-xs text-[var(--text-soft)]">
            {copy.rewardCombo} x{rewardBurst.comboMultiplier.toFixed(2)} · {copy.rewardFocus} +
            {rewardBurst.focusBonus}
            {rewardBurst.highScore ? ` · ${copy.rewardHigh}` : ''}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
