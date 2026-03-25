import {
  type FormEvent,
  type ReactNode,
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
  Pause,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  Square,
  SunMedium,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  getCategoryLabel,
  getPriorityLabel,
  getSourceLabel,
  getStatusLabel,
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

const STORAGE_KEYS = {
  tasks: 'taskbrick.v2.tasks',
  completions: 'taskbrick.v2.completions',
  dailyScores: 'taskbrick.v2.dailyScores',
  highScore: 'taskbrick.v2.highScore',
  profile: 'taskbrick.v2.profile',
  flowEvents: 'taskbrick.v2.flowEvents',
  focusSessions: 'taskbrick.v2.focusSessions',
  locale: 'taskbrick.locale',
  theme: 'taskbrick.theme',
}

const EMPTY_TASKS: Task[] = []
const EMPTY_COMPLETIONS: TaskCompletion[] = []
const EMPTY_DAILY_SCORES: DailyScore[] = []
const EMPTY_HIGH_SCORE = 0
const EMPTY_FLOW_EVENTS: FlowEvent[] = []
const EMPTY_FOCUS_SESSIONS: FocusSession[] = []
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
  'border-[var(--line)] bg-[var(--panel)] py-0 shadow-[var(--panel-shadow)] backdrop-blur-xl'
const quietCardClass = 'border-[var(--line)] bg-[var(--panel)] py-0 backdrop-blur-xl'
const outlineBadgeClass = 'border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)]'

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
  const bins = Array.from({ length: 24 }, () => 0)
  const dayKey = getDateKey(selectedDate, timezone)

  for (const session of sessions) {
    const sessionKey = getDateKey(session.startedAt, timezone)
    if (sessionKey !== dayKey) continue

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
    return mode === 'interrupt' ? '끼어들기' : '전환됨'
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

function getPriorityOptionLabel(priority: TaskPriority, locale: Locale): string {
  const labels = {
    ko: {
      low: '낮음 · 가벼운 정리',
      medium: '보통 · 일반 업무',
      high: '높음 · 오늘 꼭 처리',
      critical: '중요 · 가장 먼저',
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
      low: '짧게 처리해도 되는 가벼운 일.',
      medium: '오늘 안에 마무리하면 좋은 일반 업무.',
      high: '오늘 반드시 처리해야 하는 중요한 일.',
      critical: '가장 먼저 끝내야 하는 핵심 업무.',
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
  const [selectedDayOffset, setSelectedDayOffset] = useState(0)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null)
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([])
  const [isDockCollapsed, setIsDockCollapsed] = useState(false)
  const [rewardBurst, setRewardBurst] = useState<RewardBurst | null>(null)
  const [nextTaskPrompt, setNextTaskPrompt] = useState<NextTaskPromptState | null>(null)
  const [switchPrompt, setSwitchPrompt] = useState<SwitchPromptState | null>(null)

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
  const selectedFocusSessions = focusSessions
    .filter((session) => getDateKey(session.startedAt, profile.timezone) === selectedDateKey)
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime())
  const selectedTrackedFocusSeconds = selectedFocusSessions.reduce(
    (sum, session) => sum + session.durationSeconds,
    0,
  )
  const selectedTrackedFocusMinutes = Math.max(0, Math.round(selectedTrackedFocusSeconds / 60))
  const selectedHourlyFocus = buildHourlyFocusSessions(selectedFocusSessions, selectedDate, profile.timezone)
  const selectedActiveHours = selectedHourlyFocus
    .map((seconds, hour) => ({ hour, seconds }))
    .filter((entry) => entry.seconds > 0)
  const firstFocusSession = selectedFocusSessions[0] ?? null
  const lastFocusSession = selectedFocusSessions.length > 0 ? selectedFocusSessions.at(-1) ?? null : null
  const displayFocusMinutes = selectedTrackedFocusMinutes > 0 ? selectedTrackedFocusMinutes : todayScore.focusMinutes
  const timerTask = activeTimer ? tasks.find((task) => task.id === activeTimer.taskId) ?? null : null
  const promptedNextTasks = nextTaskPrompt
    ? nextTaskPrompt.candidateTaskIds
        .map((taskId) => tasks.find((task) => task.id === taskId) ?? null)
        .filter((task): task is Task => Boolean(task))
    : []
  const promptedNextTask = promptedNextTasks[0] ?? null
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

  const displayedTasks = filteredTasks.filter((task) => {
    if (currentView === 'today') return task.status !== 'done'
    if (currentView === 'inbox') return task.status === 'todo'
    if (currentView === 'done') return task.status === 'done'
    return false
  })

  const topMetrics = [
    { label: copy.todayScore, value: todayScore.totalScore.toString(), accent: true },
    { label: copy.highScore, value: highScore.toString(), accent: false },
    { label: copy.focusMinutes, value: `${displayFocusMinutes}m`, accent: false },
    { label: copy.level, value: `${profile.level}`, accent: false },
  ]

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify(locale))
    window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme))
  }, [locale, theme])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
    window.localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions))
    window.localStorage.setItem(STORAGE_KEYS.dailyScores, JSON.stringify(dailyScores))
    window.localStorage.setItem(STORAGE_KEYS.highScore, JSON.stringify(highScore))
    window.localStorage.setItem(STORAGE_KEYS.flowEvents, JSON.stringify(flowEvents))
    window.localStorage.setItem(STORAGE_KEYS.focusSessions, JSON.stringify(focusSessions))
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  }, [completions, dailyScores, flowEvents, focusSessions, highScore, profile, tasks])

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
    setActiveTimer(null)
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

  function resetBoard() {
    startTransition(() => {
      setTasks(EMPTY_TASKS)
      setCompletions(EMPTY_COMPLETIONS)
      setDailyScores(EMPTY_DAILY_SCORES)
      setHighScore(EMPTY_HIGH_SCORE)
      setFlowEvents(EMPTY_FLOW_EVENTS)
      setFocusSessions(EMPTY_FOCUS_SESSIONS)
      setProfile({ ...EMPTY_PROFILE })
      setActiveTimer(null)
      setPausedSessions([])
      setIsDockCollapsed(false)
      setRewardBurst(null)
      setNextTaskPrompt(null)
      setSwitchPrompt(null)
      setCurrentView('today')
      setStatusFilter('all')
      setPriorityFilter('all')
      setSearch('')
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
      setDraftHorizon('today')
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
      setProfile({ ...EMPTY_PROFILE })
      setActiveTimer(null)
      setPausedSessions([])
      setIsDockCollapsed(false)
      setRewardBurst(null)
      setNextTaskPrompt(null)
      setSwitchPrompt(null)
      setCurrentView('today')
      setStatusFilter('all')
      setPriorityFilter('all')
      setSearch('')
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
      setDraftHorizon('today')
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] p-4 md:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[248px_minmax(0,1fr)_420px] 2xl:grid-cols-[248px_minmax(0,1fr)_440px]">
        <aside className="flex min-h-0 flex-col gap-4">
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
            <CardContent className="space-y-2 pt-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setCurrentView(item.id)
                    setStatusFilter('all')
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
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
            <CardContent className="grid gap-3 pt-0">
              <SidebarMetric icon={Sparkles} label={copy.todayScore} value={todayScore.totalScore.toString()} />
              <SidebarMetric icon={Flame} label={copy.currentCombo} value={`x${todayScore.comboPeak || 1}`} />
              <SidebarMetric icon={Clock3} label={copy.focusMinutes} value={`${displayFocusMinutes}m`} />
              <SidebarMetric icon={CalendarClock} label={copy.taskCountLabel} value={openTasks.length.toString()} />
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

        <main className="flex min-h-0 flex-col gap-4">
          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                  <CardTitle className="text-[32px] leading-none font-semibold tracking-[-0.07em]">
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
                                  {locale === 'ko' ? '날짜 선택' : 'Pick a date'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                  {locale === 'ko'
                                    ? `이 날의 일정 ${selectedScheduledCount}개`
                                    : `${selectedScheduledCount} scheduled items`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsDatePickerOpen(false)}
                              >
                                {locale === 'ko' ? '닫기' : 'Close'}
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
                      {currentView === 'today'
                        ? `${openTasks.length} / ${copy.taskCountLabel}`
                        : currentView === 'inbox'
                          ? `${inboxTasks.length} / ${copy.navInbox}`
                          : currentView === 'done'
                            ? `${doneTasks.length} / ${copy.navDone}`
                            : currentView === 'history'
                              ? copy.historyTitle
                              : copy.navIntegrations}
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {displayFocusMinutes}m
                    </Badge>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      x{todayScore.comboPeak || 1}
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

            <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 2xl:grid-cols-4">
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
                              ? copy.historyTitle
                              : copy.navIntegrations}
                    </CardTitle>
                    {currentView === 'history' || currentView === 'integrations' ? (
                      <CardDescription>
                        {currentView === 'history' ? copy.historyBody : copy.integrationsBody}
                      </CardDescription>
                    ) : null}
                  </div>

                  {currentView === 'today' || currentView === 'inbox' || currentView === 'done' ? (
                    <div className="flex flex-col gap-2 xl:flex-row">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={copy.searchPlaceholder}
                        className="h-9 w-full rounded-2xl border-[var(--line)] bg-[var(--surface)] pl-9 xl:w-72"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as FilterValue)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-2xl border-[var(--line)] bg-[var(--surface)] xl:w-36">
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
                      <SelectTrigger className="h-9 w-full rounded-2xl border-[var(--line)] bg-[var(--surface)] xl:w-40">
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
                    {dailyScores
                      .slice()
                      .reverse()
                      .map((score) => (
                        <div
                          key={score.date}
                          className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">{score.date}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {score.completedCount} tasks · combo x{score.comboPeak || 1}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-xl text-foreground">{score.totalScore}</p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">{score.focusMinutes}m</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
                    {displayedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        locale={locale}
                        isActive={activeTimer?.taskId === task.id}
                        dueLabel={formatDueLabel(task.dueAt, profile.timezone, locale)}
                        onComplete={handleCompleteTask}
                        onDelete={handleDeleteTask}
                        onStartTimer={handleStartTimer}
                      />
                    ))}

                    {displayedTasks.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-12 text-center">
                        <p className="text-base font-medium text-foreground">{copy.noVisibleTasks}</p>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">{copy.noVisibleTasksBody}</p>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {currentView === 'today' || currentView === 'inbox' ? (
              <CardFooter className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--panel-strong)]/90 backdrop-blur-xl">
                <form
                  onSubmit={handleAddTask}
                  className="grid w-full gap-4 rounded-[30px] border border-[var(--line)] bg-[var(--panel-strong)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase">
                        {locale === 'ko' ? '작업 제목' : 'Task'}
                      </p>
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder={locale === 'ko' ? '다음 할 일을 한 줄로 입력' : 'Write the next task in one line'}
                        className="h-12 rounded-[22px] border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                      />
                    </div>

                    <Button type="submit" className="h-12 rounded-[22px] px-6 md:min-w-28">
                      {copy.addTask}
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[160px_180px_minmax(0,1fr)]">
                    <ComposerField
                      label={locale === 'ko' ? '예상 시간' : 'Estimate'}
                      hint={locale === 'ko' ? '집중할 시간' : 'Focus window'}
                    >
                      <div className="space-y-2 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base text-foreground">+{effectiveDraftMinutes.toString().padStart(3, '0')}</span>
                          <span className="text-sm text-[var(--text-muted)]">{locale === 'ko' ? '분' : 'min'}</span>
                          <Input
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            value={draftMinutes}
                            onChange={(event) => setDraftMinutes(Number(event.target.value))}
                            className="ml-auto h-8 w-20 border-0 bg-transparent px-0 text-right font-mono shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[15, 25, 45, 60].map((minutes) => (
                            <button
                              key={minutes}
                              type="button"
                              onClick={() => setDraftMinutes(minutes)}
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                                draftMinutes === minutes
                                  ? 'border-amber-300/30 bg-amber-300/12 text-amber-200'
                                  : 'border-[var(--line)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]',
                              )}
                            >
                              +{minutes}
                              {locale === 'ko' ? '분' : 'm'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </ComposerField>

                    <ComposerField
                      label={locale === 'ko' ? '우선순위' : 'Priority'}
                      hint={locale === 'ko' ? '점수 기준' : 'Scoring weight'}
                    >
                      <Select
                        value={draftPriority}
                        onValueChange={(value) => setDraftPriority(value as TaskPriority)}
                      >
                        <SelectTrigger className="h-[54px] rounded-[20px] border-[var(--line)] bg-[var(--surface)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {getPriorityOptionLabel(priority, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ComposerField>

                    <ComposerField
                      label={locale === 'ko' ? '처리 시점' : 'When'}
                      hint={locale === 'ko' ? '오늘 처리할지 선택' : 'Today or later'}
                    >
                      <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-1.5">
                        <button
                          type="button"
                          onClick={() => setDraftHorizon('today')}
                          className={cn(
                            'rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                            draftHorizon === 'today'
                              ? 'bg-amber-300 text-zinc-950'
                              : 'text-[var(--text-soft)] hover:bg-[var(--surface-soft)]',
                          )}
                        >
                          {locale === 'ko' ? '오늘' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftHorizon('tomorrow')}
                          className={cn(
                            'rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                            draftHorizon === 'tomorrow'
                              ? 'bg-amber-300 text-zinc-950'
                              : 'text-[var(--text-soft)] hover:bg-[var(--surface-soft)]',
                          )}
                        >
                          {locale === 'ko' ? '내일' : 'Tomorrow'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftHorizon('later')}
                          className={cn(
                            'rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                            draftHorizon === 'later'
                              ? 'bg-amber-300 text-zinc-950'
                              : 'text-[var(--text-soft)] hover:bg-[var(--surface-soft)]',
                          )}
                        >
                          {locale === 'ko' ? '나중' : 'Later'}
                        </button>
                      </div>
                    </ComposerField>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
                      {locale === 'ko' ? '예상 시간' : 'Estimate'} · {effectiveDraftMinutes}
                      {locale === 'ko' ? '분' : 'm'}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
                      {locale === 'ko' ? '우선순위' : 'Priority'} · {getPriorityLabel(effectiveDraftPriority, locale)}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
                      {locale === 'ko' ? '처리 시점' : 'When'} · {locale === 'ko' ? (effectiveDraftHorizon === 'today' ? '오늘' : effectiveDraftHorizon === 'tomorrow' ? '내일' : '나중') : effectiveDraftHorizon === 'today' ? 'Today' : effectiveDraftHorizon === 'tomorrow' ? 'Tomorrow' : 'Later'}
                    </span>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
                      {locale === 'ko' ? 'Enter로 바로 추가' : 'Press Enter to add'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-[var(--text-muted)]">
                    <p>{getPriorityHint(effectiveDraftPriority, locale)}</p>
                    <p>
                      {locale === 'ko'
                        ? '예: 내일 45분 중요 제안서 정리'
                        : 'Example: tomorrow 45m high proposal cleanup'}
                    </p>
                  </div>
                </form>
              </CardFooter>
            ) : null}
          </Card>
        </main>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                    {copy.timerTitle}
                  </CardTitle>
                  <CardDescription>{copy.rightPanelHint}</CardDescription>
                </div>
                <Badge variant="outline" className={outlineBadgeClass}>
                  {timerTask ? copy.runningNow : copy.stateIdle}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {activeTimer && timerTask ? (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--text-soft)]">{copy.activeTimerLabel}</p>
                        <div className="flex items-center gap-2">
                          <LoaderCircle className="size-4 animate-spin text-amber-300" />
                          <p className="text-base font-semibold tracking-[-0.02em] text-foreground">
                            {getTaskTitle(timerTask, locale)}
                          </p>
                        </div>
                        <p className="text-xs text-amber-200">{copy.workingNow}</p>
                      </div>
                      <Badge className="bg-[var(--surface-soft)] text-foreground">{timerTone}</Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{copy.runningNow}</span>
                      <span>{Math.min(Math.round(progress), 100)}%</span>
                    </div>
                    <Progress value={progress} className="mt-2" />

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricSurface label={copy.estimate} value={estimateClock} />
                      <MetricSurface label={copy.elapsed} value={elapsedClock} />
                      <MetricSurface label={copy.remaining} value={remainingClock} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTogglePauseTimer}
                    >
                      {activeTimer.isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                      {activeTimer.isPaused ? copy.resume : copy.pause}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setActiveTimer((current) =>
                          current
                            ? { ...current, estimatedMinutes: current.estimatedMinutes + 10 }
                            : current,
                        )
                      }
                    >
                      {copy.extend}
                    </Button>
                    <Button onClick={() => handleCompleteTask(activeTimer.taskId)}>
                      <CheckCircle2 className="size-3.5" />
                      {copy.finish}
                    </Button>
                    <Button variant="secondary" onClick={handleStopActiveTimer}>
                      <Square className="size-3.5" />
                      {copy.stop}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="font-medium text-foreground">{copy.timerIdleTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{copy.timerIdleBody}</p>
                </div>
              )}

              {pausedTaskDetails.length > 0 ? (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {locale === 'ko' ? '멈춘 작업' : 'Paused tasks'}
                    </p>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {pausedTaskDetails.length}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pausedTaskDetails.slice(0, 3).map(({ session, task }) => (
                      <div
                        key={session.taskId}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {getTaskTitle(task, locale)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatClock(session.elapsedSeconds)} /{' '}
                            {getPausedSessionLabel(session.mode, locale)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResumePausedTask(session.taskId)}
                          >
                            {locale === 'ko' ? '복귀' : 'Resume'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePausedTask(session.taskId)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                {copy.reportTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--text-soft)]">
                {copy.reportSentence(todayReport.completedCount, todayReport.totalScore)}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ReportMetricSurface label={copy.focusMinutes} value={`${displayFocusMinutes}m`} />
                <ReportMetricSurface label={copy.onTime} value={todayReport.onTimeCount.toString()} />
                <ReportMetricSurface label={copy.overtime} value={todayReport.overtimeCount.toString()} />
                <ReportMetricSurface
                  label={locale === 'ko' ? '전환' : 'Switches'}
                  value={todaySwitchCount.toString()}
                />
                <ReportMetricSurface
                  className="sm:col-span-2"
                  label={locale === 'ko' ? '끼어들기' : 'Interrupts'}
                  value={todayInterruptCount.toString()}
                />
              </div>

              <Separator />

              <ul className="space-y-2 text-sm text-[var(--text-soft)]">
                {reportItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                {locale === 'ko' ? '시간대 집중' : 'Focus by hour'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko'
                  ? '타이머를 실제로 눌러서 집중한 시간만 집계합니다.'
                  : 'Only time tracked by the focus timer is included.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricSurface
                  label={locale === 'ko' ? '첫 집중' : 'First focus'}
                  value={firstFocusSession ? formatShortTime(firstFocusSession.startedAt, locale, profile.timezone) : '--:--'}
                />
                <MetricSurface
                  label={locale === 'ko' ? '마지막 집중' : 'Last focus'}
                  value={lastFocusSession ? formatShortTime(lastFocusSession.endedAt, locale, profile.timezone) : '--:--'}
                />
                <MetricSurface
                  label={locale === 'ko' ? '실집중' : 'Tracked'}
                  value={`${displayFocusMinutes}m`}
                />
              </div>

              {selectedActiveHours.length > 0 ? (
                <div className="space-y-2">
                  {selectedActiveHours.map(({ hour, seconds }) => {
                    const width = Math.max(12, Math.round((seconds / 3600) * 100))

                    return (
                      <div key={hour} className="grid grid-cols-[44px_minmax(0,1fr)_56px] items-center gap-3">
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-amber-300/80"
                            style={{ width: `${Math.min(width, 100)}%` }}
                          />
                        </div>
                        <span className="text-right font-mono text-xs text-foreground">
                          {Math.round(seconds / 60)}m
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
                  {locale === 'ko'
                    ? '아직 이 날짜의 집중 세션이 없습니다.'
                    : 'No tracked focus sessions for this date yet.'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={shellCardClass}>
            <CardHeader className="border-b border-[var(--line)] pb-4">
              <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                {copy.feedTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 pt-4">
              <ScrollArea className="h-[320px] pr-3">
                <div className="space-y-3">
                  {todayCompletions.length > 0 ? (
                    todayCompletions
                      .slice()
                      .reverse()
                      .map((completion) => {
                        const linkedTask = tasks.find((task) => task.id === completion.taskId)

                        return (
                          <div
                            key={completion.id}
                            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {linkedTask ? getTaskTitle(linkedTask, locale) : 'Task'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                  {copy.completionMeta(
                                    completion.scoreEarned,
                                    completion.actualMinutes,
                                  )}
                                </p>
                              </div>
                              <Badge variant="outline" className={outlineBadgeClass}>
                                {completion.completionState === 'overtime'
                                  ? copy.overtime
                                  : completion.completionState === 'early'
                                    ? copy.early
                                    : copy.onTime}
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
                      {copy.noCompletionYet}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
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

      {nextTaskPrompt && promptedNextTasks.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {locale === 'ko' ? '다음 할 일' : 'Next up'}
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {nextTaskPrompt.kind === 'resume'
                ? locale === 'ko'
                  ? `'${nextTaskPrompt.completedTaskTitle}' 완료. 멈춘 작업으로 돌아갈까요?`
                  : `Finished '${nextTaskPrompt.completedTaskTitle}'. Resume the paused task?`
                : locale === 'ko'
                  ? `'${nextTaskPrompt.completedTaskTitle}' 완료. 이 작업을 바로 시작할까요?`
                  : `Finished '${nextTaskPrompt.completedTaskTitle}'. Start this next?`}
            </p>

            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={outlineBadgeClass}>
                  {getPriorityLabel(promptedNextTask.priority, locale)}
                </Badge>
                <Badge variant="outline" className={outlineBadgeClass}>
                  {getCategoryLabel(promptedNextTask.category, locale)}
                </Badge>
              </div>
              <p className="mt-3 text-base font-medium text-foreground">
                {getTaskTitle(promptedNextTask, locale)}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {nextTaskPrompt.kind === 'resume'
                  ? locale === 'ko'
                    ? `이전 경과 ${formatClock(pausedSessions.find((session) => session.taskId === promptedNextTask.id)?.elapsedSeconds ?? 0)}`
                    : `Previous elapsed ${formatClock(pausedSessions.find((session) => session.taskId === promptedNextTask.id)?.elapsedSeconds ?? 0)}`
                  : locale === 'ko'
                    ? `예상 ${promptedNextTask.estimatedMinutes}분`
                    : `Estimate ${promptedNextTask.estimatedMinutes}m`}
              </p>
            </div>

            {promptedNextTasks.length > 1 ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {locale === 'ko' ? '다른 후보' : 'Other options'}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {promptedNextTasks.slice(1).map((task) => {
                    const pausedSession = pausedSessions.find((session) => session.taskId === task.id)

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleStartSuggestedTask(task.id)}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-left transition-colors hover:bg-[var(--surface-soft)]"
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {getTaskTitle(task, locale)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {pausedSession
                            ? locale === 'ko'
                              ? `이어 하기 · ${formatClock(pausedSession.elapsedSeconds)}`
                              : `Resume · ${formatClock(pausedSession.elapsedSeconds)}`
                            : locale === 'ko'
                              ? `예상 ${task.estimatedMinutes}분`
                              : `Estimate ${task.estimatedMinutes}m`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNextTaskPrompt(null)}>
                {locale === 'ko' ? '나중에' : 'Later'}
              </Button>
              <Button onClick={() => promptedNextTask && handleStartSuggestedTask(promptedNextTask.id)}>
                {locale === 'ko' ? '바로 시작' : 'Start now'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {switchPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {locale === 'ko' ? '작업 전환' : 'Switch task'}
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {locale === 'ko'
                ? '지금 작업을 멈추고 다른 작업으로 이동할까요?'
                : 'Pause the current task and move to another one?'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {locale === 'ko'
                ? '전환은 멈춘 작업 목록에 보관되고, 끼어들기는 잠깐 처리할 일로 기록됩니다.'
                : 'Switch keeps it in the paused list. Interrupt marks it as a quick interruption.'}
            </p>

            <div className="mt-5 grid gap-2">
              <Button variant="outline" onClick={() => commitTaskSwitch('switch')}>
                {locale === 'ko' ? '일시정지 후 전환' : 'Pause and switch'}
              </Button>
              <Button variant="secondary" onClick={() => commitTaskSwitch('interrupt')}>
                {locale === 'ko' ? '끼어들기 작업으로 시작' : 'Start as interruption'}
              </Button>
            </div>

            <div className="mt-3 flex justify-end">
              <Button variant="ghost" onClick={() => setSwitchPrompt(null)}>
                {locale === 'ko' ? '취소' : 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
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

function SidebarMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--text-soft)]">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
        <p className="font-mono text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

function TopMetric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4',
        accent ? 'border-amber-300/25 bg-amber-300/8' : 'border-[var(--line)] bg-[var(--surface)]',
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-mono text-[22px] leading-none text-foreground">{value}</p>
    </div>
  )
}

function MetricSurface({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-mono text-lg leading-none text-foreground">{value}</p>
    </div>
  )
}

function ReportMetricSurface({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4',
        className,
      )}
    >
      <p className="text-[12px] leading-snug font-medium tracking-[-0.02em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-3 font-mono text-[28px] leading-none text-foreground">{value}</p>
    </div>
  )
}

function ComposerField({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function TaskRow({
  task,
  locale,
  isActive,
  onStartTimer,
  onComplete,
  onDelete,
  dueLabel,
}: {
  task: Task
  locale: Locale
  isActive: boolean
  onStartTimer: (taskId: string, estimatedMinutes: number) => void
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  dueLabel: string
}) {
  const copy = uiCopy[locale]
  const [customMinutes, setCustomMinutes] = useState(task.estimatedMinutes)

  return (
    <div
      className={cn(
        'group grid gap-4 rounded-3xl border px-4 py-4 transition-colors xl:grid-cols-[minmax(0,1fr)_160px_240px_88px]',
        isActive
          ? 'border-amber-300/25 bg-amber-300/7'
          : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]',
      )}
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline" className={outlineBadgeClass}>
            {getSourceLabel(task.source, locale)}
          </Badge>
          <Badge variant="outline" className={outlineBadgeClass}>
            {getCategoryLabel(task.category, locale)}
          </Badge>
          <Badge variant="outline" className={outlineBadgeClass}>
            {getPriorityLabel(task.priority, locale)}
          </Badge>
          {task.tags.includes('interrupt') ? (
            <Badge variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-200">
              {locale === 'ko' ? '끼어들기' : 'Interrupt'}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isActive ? <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" /> : null}
          <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
            {getTaskTitle(task, locale)}
          </p>
          {isActive ? (
            <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] font-medium text-amber-200">
              {copy.workingNow}
            </span>
          ) : null}
        </div>

        {task.notes ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">{task.notes}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>{task.points} base</span>
          <span>{task.estimatedMinutes} min</span>
          <span>{dueLabel}</span>
          <span>{getStatusLabel(task.status, locale)}</span>
        </div>
      </div>

      <div className="grid content-start gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {copy.scoreDeltaLabel}
        </p>
        <p className="font-mono text-xl leading-none text-foreground">+{task.points}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {copy.estimate} {task.estimatedMinutes}m
        </p>
      </div>

      <div className="grid gap-2">
        {task.status !== 'done' ? (
          <>
            <Button
              variant={isActive ? 'secondary' : 'default'}
              className="h-10 justify-between rounded-2xl px-4"
              onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
            >
              <span>{locale === 'ko' ? '시작' : 'Start'}</span>
              <span className="font-mono text-sm">{task.estimatedMinutes}m</span>
            </Button>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {locale === 'ko' ? '직접 시간' : 'Custom time'}
              </p>
              <div className="mt-2 grid grid-cols-[84px_1fr] gap-2">
                <Input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(Number(event.target.value))}
                  className="h-9 rounded-xl border-[var(--line)] bg-transparent text-center font-mono"
                />
                <Button
                  variant="outline"
                  className="h-9 rounded-xl"
                  onClick={() => onStartTimer(task.id, Math.max(5, customMinutes))}
                >
                  {locale === 'ko' ? `${customMinutes}분 시작` : `Start ${customMinutes}m`}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-center text-xs text-[var(--text-muted)]">
            {copy.completeTask}
          </div>
        )}
      </div>

      <div className="flex h-full flex-col gap-2">
        {task.status !== 'done' ? (
          <Button className="min-h-10" onClick={() => onComplete(task.id)}>
            {copy.completeTask}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="min-h-10 self-end rounded-2xl opacity-30 transition-opacity hover:opacity-100 group-hover:opacity-60"
          onClick={() => onDelete(task.id)}
          aria-label={copy.deleteTask}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default App
