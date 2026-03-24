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
  ChevronsDown,
  ChevronsUp,
  CheckCircle2,
  Clock3,
  Flame,
  Inbox,
  Layers3,
  Link2,
  LoaderCircle,
  Pause,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  Square,
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
type RewardBurst = ScoreBreakdown & { taskTitle: string; highScore: boolean }
type TimerState = {
  taskId: string
  estimatedMinutes: number
  elapsedSeconds: number
  isPaused: boolean
}

type NextTaskPromptState = {
  completedTaskTitle: string
  nextTaskId: string
  kind: 'resume' | 'next'
}

type PausedSession = TimerState & {
  mode: 'switch' | 'interrupt'
}

type SwitchPromptState = {
  nextTaskId: string
  estimatedMinutes: number
  source: 'new' | 'resume'
}

const STORAGE_KEYS = {
  tasks: 'taskbrick.v2.tasks',
  completions: 'taskbrick.v2.completions',
  dailyScores: 'taskbrick.v2.dailyScores',
  highScore: 'taskbrick.v2.highScore',
  profile: 'taskbrick.v2.profile',
  locale: 'taskbrick.locale',
}

const EMPTY_TASKS: Task[] = []
const EMPTY_COMPLETIONS: TaskCompletion[] = []
const EMPTY_DAILY_SCORES: DailyScore[] = []
const EMPTY_HIGH_SCORE = 0
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

function getNextTaskSuggestion(tasks: Task[], completedTaskId: string): Task | null {
  const available = tasks
    .filter((task) => task.id !== completedTaskId && task.status !== 'done' && task.status !== 'archived')
    .sort((left, right) => {
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

  return available[0] ?? null
}

function getPausedSessionLabel(mode: PausedSession['mode'], locale: Locale): string {
  if (locale === 'ko') {
    return mode === 'interrupt' ? '끼어들기' : '전환됨'
  }

  return mode === 'interrupt' ? 'Interrupted' : 'Switched'
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
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadStoredValue(STORAGE_KEYS.profile, EMPTY_PROFILE),
  )
  const [locale, setLocale] = useState<Locale>(() => loadStoredValue(STORAGE_KEYS.locale, 'ko'))
  const [currentView, setCurrentView] = useState<ViewMode>('today')
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [search, setSearch] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('medium')
  const [draftMinutes, setDraftMinutes] = useState(25)
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null)
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([])
  const [isDockCollapsed, setIsDockCollapsed] = useState(false)
  const [rewardBurst, setRewardBurst] = useState<RewardBurst | null>(null)
  const [nextTaskPrompt, setNextTaskPrompt] = useState<NextTaskPromptState | null>(null)
  const [switchPrompt, setSwitchPrompt] = useState<SwitchPromptState | null>(null)

  const copy = uiCopy[locale]
  const deferredSearch = useDeferredValue(search)
  const todayKey = getDateKey(new Date(), profile.timezone)
  const todayCompletions = completions.filter(
    (completion) => getDateKey(completion.completedAt, profile.timezone) === todayKey,
  )

  const todayScore =
    dailyScores.find((score) => score.date === todayKey) ??
    {
      ...calculateDailyScore(todayCompletions, highScore),
      date: todayKey,
    }

  const todayReport = createDailyReport(todayScore, todayCompletions, tasks)
  const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived')
  const inboxTasks = tasks.filter((task) => task.status === 'todo')
  const doneTasks = tasks.filter((task) => task.status === 'done')
  const timerTask = activeTimer ? tasks.find((task) => task.id === activeTimer.taskId) ?? null : null
  const promptedNextTask = nextTaskPrompt
    ? tasks.find((task) => task.id === nextTaskPrompt.nextTaskId) ?? null
    : null
  const pausedTaskDetails = pausedSessions
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
    { label: copy.focusMinutes, value: `${todayScore.focusMinutes}m`, accent: false },
    { label: copy.level, value: `${profile.level}`, accent: false },
  ]

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.classList.add('dark')
    window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify(locale))
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
    window.localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions))
    window.localStorage.setItem(STORAGE_KEYS.dailyScores, JSON.stringify(dailyScores))
    window.localStorage.setItem(STORAGE_KEYS.highScore, JSON.stringify(highScore))
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  }, [completions, dailyScores, highScore, profile, tasks])

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

  function handleCompleteTask(taskId: string) {
    const task = tasks.find((candidate) => candidate.id === taskId)
    if (!task || task.status === 'done') return
    const suggestedNextTask = getNextTaskSuggestion(tasks, taskId)
    const pausedCandidate = pausedSessions[0] ?? null

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
        pausedCandidate
          ? {
              completedTaskTitle: getTaskTitle(task, locale),
              nextTaskId: pausedCandidate.taskId,
              kind: 'resume',
            }
          : suggestedNextTask
          ? {
              completedTaskTitle: getTaskTitle(task, locale),
              nextTaskId: suggestedNextTask.id,
              kind: 'next',
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

  function handleStartSuggestedTask() {
    if (!promptedNextTask) {
      setNextTaskPrompt(null)
      return
    }

    const pausedSession = pausedSessions.find((session) => session.taskId === promptedNextTask.id)

    if (pausedSession) {
      setPausedSessions((current) =>
        current.filter((session) => session.taskId !== promptedNextTask.id),
      )
      setActiveTimer({
        taskId: pausedSession.taskId,
        estimatedMinutes: pausedSession.estimatedMinutes,
        elapsedSeconds: pausedSession.elapsedSeconds,
        isPaused: false,
      })
      setIsDockCollapsed(false)
    } else {
      handleStartTimer(promptedNextTask.id, promptedNextTask.estimatedMinutes)
    }

    setNextTaskPrompt(null)
  }

  function commitTaskSwitch(mode: 'switch' | 'interrupt') {
    if (!switchPrompt || !activeTimer) return
    const resumeSession = pausedSessions.find((session) => session.taskId === switchPrompt.nextTaskId)

    setPausedSessions((current) => [
      {
        ...activeTimer,
        isPaused: true,
        mode,
      },
      ...current.filter(
        (session) =>
          session.taskId !== activeTimer.taskId && session.taskId !== switchPrompt.nextTaskId,
      ),
    ])

    setActiveTimer({
      taskId: switchPrompt.nextTaskId,
      estimatedMinutes: resumeSession?.estimatedMinutes ?? switchPrompt.estimatedMinutes,
      elapsedSeconds: resumeSession?.elapsedSeconds ?? 0,
      isPaused: false,
    })
    setTasks((current) =>
      current.map((task) =>
        task.id === switchPrompt.nextTaskId && task.status === 'todo'
          ? { ...task, status: 'in_progress' }
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
    setActiveTimer({
      taskId: pausedSession.taskId,
      estimatedMinutes: pausedSession.estimatedMinutes,
      elapsedSeconds: pausedSession.elapsedSeconds,
      isPaused: false,
    })
    setIsDockCollapsed(false)
    setNextTaskPrompt(null)
  }

  function handleRemovePausedTask(taskId: string) {
    setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
    setNextTaskPrompt((current) => (current?.nextTaskId === taskId ? null : current))
    setSwitchPrompt((current) => (current?.nextTaskId === taskId ? null : current))
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draftTitle.trim()
    if (!title) return

    const points =
      draftPriority === 'critical'
        ? 24
        : draftPriority === 'high'
          ? 18
          : draftPriority === 'medium'
            ? 13
            : 9

    const nextTask: Task = {
      id: `manual-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`,
      title,
      category: 'planning',
      priority: draftPriority,
      status: 'todo',
      estimatedMinutes: draftMinutes,
      dueAt: null,
      points,
      source: 'manual',
      tags: ['quick-add'],
      notes: locale === 'ko' ? '직접 추가한 태스크' : 'Manually added task',
    }

    startTransition(() => {
      setTasks((current) => [...current, nextTask])
      setDraftTitle('')
      setDraftMinutes(25)
      setDraftPriority('medium')
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
      setDailyScores(nextDailyScores)
      setHighScore(nextHighScore)
      setProfile((current) => ({
        ...current,
        lifetimeScore: Math.max(0, current.lifetimeScore - removedCompletionScore),
        level: 1 + Math.floor(Math.max(0, current.lifetimeScore - removedCompletionScore) / 700),
      }))
      setPausedSessions((current) => current.filter((session) => session.taskId !== taskId))
      setNextTaskPrompt((current) => (current?.nextTaskId === taskId ? null : current))
      setActiveTimer((current) => (current?.taskId === taskId ? null : current))
    })
  }

  function resetBoard() {
    startTransition(() => {
      setTasks(EMPTY_TASKS)
      setCompletions(EMPTY_COMPLETIONS)
      setDailyScores(EMPTY_DAILY_SCORES)
      setHighScore(EMPTY_HIGH_SCORE)
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
    })
  }

  function clearAll() {
    startTransition(() => {
      setTasks(EMPTY_TASKS)
      setCompletions(EMPTY_COMPLETIONS)
      setDailyScores(EMPTY_DAILY_SCORES)
      setHighScore(EMPTY_HIGH_SCORE)
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
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1680px] p-4 md:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[248px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-0 flex-col gap-4">
          <Card className="border-white/8 bg-white/5 py-0 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-[18px] font-semibold tracking-[-0.04em]">
                    {copy.appTitle}
                  </CardTitle>
                  <CardDescription className="text-[13px] leading-relaxed">
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
                      ? 'bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                  )}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-white/5 py-0 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{copy.profileLabel}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              <SidebarMetric icon={Sparkles} label={copy.todayScore} value={todayScore.totalScore.toString()} />
              <SidebarMetric icon={Flame} label={copy.currentCombo} value={`x${todayScore.comboPeak || 1}`} />
              <SidebarMetric icon={Clock3} label={copy.focusMinutes} value={`${todayScore.focusMinutes}m`} />
              <SidebarMetric icon={CalendarClock} label={copy.taskCountLabel} value={openTasks.length.toString()} />
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-white/5 py-0 backdrop-blur-xl">
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
        </aside>

        <main className="flex min-h-0 flex-col gap-4">
          <Card className="border-white/8 bg-white/5 py-0 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-white/10 bg-black/20 text-zinc-300">
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
                    <Badge variant="outline" className="border-white/10 bg-black/20 text-zinc-300">
                      {todayScore.focusMinutes}m
                    </Badge>
                    <Badge variant="outline" className="border-white/10 bg-black/20 text-zinc-300">
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

          <Card className="flex min-h-0 flex-1 border-white/8 bg-white/5 py-0 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
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
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={copy.searchPlaceholder}
                        className="h-9 w-full rounded-2xl border-white/8 bg-black/20 pl-9 xl:w-72"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as FilterValue)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-2xl border-white/8 bg-black/20 xl:w-36">
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
                      <SelectTrigger className="h-9 w-full rounded-2xl border-white/8 bg-black/20 xl:w-40">
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
                          className="rounded-3xl border border-white/8 bg-black/20 px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-white">{score.date}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {score.completedCount} tasks · combo x{score.comboPeak || 1}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-xl text-white">{score.totalScore}</p>
                              <p className="mt-1 text-xs text-zinc-500">{score.focusMinutes}m</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              ) : currentView === 'integrations' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Notion</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      {copy.integrationsBody}
                    </p>
                    <Button className="mt-4" size="sm" variant="secondary" onClick={loadDemoBoard}>
                      {copy.demoSyncLabel}
                    </Button>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Calendar</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
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
                      <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-4 py-12 text-center">
                        <p className="text-base font-medium text-white">{copy.noVisibleTasks}</p>
                        <p className="mt-2 text-sm text-zinc-500">{copy.noVisibleTasksBody}</p>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {currentView === 'today' || currentView === 'inbox' ? (
              <CardFooter className="sticky bottom-0 border-t border-white/8 bg-black/40 backdrop-blur-xl">
                <form
                  onSubmit={handleAddTask}
                  className="grid w-full gap-3 rounded-[28px] border border-white/8 bg-zinc-950/70 p-3 md:grid-cols-[minmax(0,1fr)_180px_110px_100px]"
                >
                  <div className="space-y-2">
                    <Input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder={copy.addTaskPlaceholder}
                      className="h-11 rounded-2xl border-white/8 bg-black/30"
                    />
                    <p className="text-xs text-zinc-500">{getPriorityHint(draftPriority, locale)}</p>
                  </div>

                  <Select
                    value={draftPriority}
                    onValueChange={(value) => setDraftPriority(value as TaskPriority)}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-white/8 bg-black/30">
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

                  <Input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={draftMinutes}
                    onChange={(event) => setDraftMinutes(Number(event.target.value))}
                    className="h-11 rounded-2xl border-white/8 bg-black/30"
                  />

                  <Button type="submit" className="h-11 rounded-2xl">{copy.addTask}</Button>
                </form>
              </CardFooter>
            ) : null}
          </Card>
        </main>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card className="border-white/8 bg-white/5 py-0 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                    {copy.timerTitle}
                  </CardTitle>
                  <CardDescription>{copy.rightPanelHint}</CardDescription>
                </div>
                <Badge variant="outline" className="border-white/10 text-zinc-300">
                  {timerTask ? copy.runningNow : copy.stateIdle}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {activeTimer && timerTask ? (
                <>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-400">{copy.activeTimerLabel}</p>
                        <div className="flex items-center gap-2">
                          <LoaderCircle className="size-4 animate-spin text-amber-300" />
                          <p className="text-base font-semibold tracking-[-0.02em] text-white">
                            {getTaskTitle(timerTask, locale)}
                          </p>
                        </div>
                        <p className="text-xs text-amber-200">{copy.workingNow}</p>
                      </div>
                      <Badge className="bg-white/8 text-zinc-100">{timerTone}</Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
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
                      onClick={() =>
                        setActiveTimer((current) =>
                          current ? { ...current, isPaused: !current.isPaused } : current,
                        )
                      }
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
                    <Button variant="secondary" onClick={() => setActiveTimer(null)}>
                      <Square className="size-3.5" />
                      {copy.stop}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white">{copy.timerIdleTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{copy.timerIdleBody}</p>
                </div>
              )}

              {pausedTaskDetails.length > 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">
                      {locale === 'ko' ? '멈춘 작업' : 'Paused tasks'}
                    </p>
                    <Badge variant="outline" className="border-white/10 text-zinc-300">
                      {pausedTaskDetails.length}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pausedTaskDetails.slice(0, 3).map(({ session, task }) => (
                      <div
                        key={session.taskId}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-zinc-950/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {getTaskTitle(task, locale)}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
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

          <Card className="border-white/8 bg-white/5 py-0 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
              <CardTitle className="text-lg font-semibold tracking-[-0.04em]">
                {copy.reportTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-relaxed text-zinc-300">
                {copy.reportSentence(todayReport.completedCount, todayReport.totalScore)}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricSurface label={copy.focusMinutes} value={`${todayReport.focusMinutes}m`} />
                <MetricSurface label={copy.onTime} value={todayReport.onTimeCount.toString()} />
                <MetricSurface label={copy.overtime} value={todayReport.overtimeCount.toString()} />
              </div>

              <Separator />

              <ul className="space-y-2 text-sm text-zinc-400">
                {reportItems.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="min-h-0 border-white/8 bg-white/5 py-0 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CardHeader className="border-b border-white/8 pb-4">
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
                            className="rounded-2xl border border-white/8 bg-black/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                  {linkedTask ? getTaskTitle(linkedTask, locale) : 'Task'}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {copy.completionMeta(
                                    completion.scoreEarned,
                                    completion.actualMinutes,
                                  )}
                                </p>
                              </div>
                              <Badge variant="outline" className="border-white/10 text-zinc-300">
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
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
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
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-left shadow-2xl backdrop-blur-xl"
            >
              <LoaderCircle className="size-4 animate-spin text-amber-300" />
              <div>
                <p className="max-w-48 truncate text-sm font-medium text-white">
                  {getTaskTitle(timerTask, locale)}
                </p>
                <p className="text-xs text-zinc-400">{remainingClock}</p>
              </div>
              <ChevronsUp className="size-4 text-zinc-400" />
            </button>
          ) : (
            <div className="w-[320px] rounded-3xl border border-white/10 bg-zinc-950/92 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                    {locale === 'ko' ? '지금 진행 중' : 'Now running'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" />
                    <p className="truncate text-sm font-medium text-white">
                      {getTaskTitle(timerTask, locale)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDockCollapsed(true)}
                  className="rounded-xl border border-white/10 p-2 text-zinc-400 transition-colors hover:text-white"
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
                  onClick={() =>
                    setActiveTimer((current) =>
                      current ? { ...current, isPaused: !current.isPaused } : current,
                    )
                  }
                >
                  {activeTimer.isPaused ? copy.resume : copy.pause}
                </Button>
                <Button size="sm" onClick={() => handleCompleteTask(activeTimer.taskId)}>
                  {copy.finish}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setActiveTimer(null)}>
                  {copy.stop}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {nextTaskPrompt && promptedNextTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {locale === 'ko' ? '다음 할 일' : 'Next up'}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {nextTaskPrompt.kind === 'resume'
                ? locale === 'ko'
                  ? `'${nextTaskPrompt.completedTaskTitle}' 완료. 멈춘 작업으로 돌아갈까요?`
                  : `Finished '${nextTaskPrompt.completedTaskTitle}'. Resume the paused task?`
                : locale === 'ko'
                  ? `'${nextTaskPrompt.completedTaskTitle}' 완료. 이 작업을 바로 시작할까요?`
                  : `Finished '${nextTaskPrompt.completedTaskTitle}'. Start this next?`}
            </p>

            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/10 text-zinc-300">
                  {getPriorityLabel(promptedNextTask.priority, locale)}
                </Badge>
                <Badge variant="outline" className="border-white/10 text-zinc-300">
                  {getCategoryLabel(promptedNextTask.category, locale)}
                </Badge>
              </div>
              <p className="mt-3 text-base font-medium text-white">
                {getTaskTitle(promptedNextTask, locale)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                {nextTaskPrompt.kind === 'resume'
                  ? locale === 'ko'
                    ? `이전 경과 ${formatClock(pausedSessions.find((session) => session.taskId === promptedNextTask.id)?.elapsedSeconds ?? 0)}`
                    : `Previous elapsed ${formatClock(pausedSessions.find((session) => session.taskId === promptedNextTask.id)?.elapsedSeconds ?? 0)}`
                  : locale === 'ko'
                    ? `예상 ${promptedNextTask.estimatedMinutes}분`
                    : `Estimate ${promptedNextTask.estimatedMinutes}m`}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNextTaskPrompt(null)}>
                {locale === 'ko' ? '나중에' : 'Later'}
              </Button>
              <Button onClick={handleStartSuggestedTask}>
                {locale === 'ko' ? '바로 시작' : 'Start now'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {switchPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {locale === 'ko' ? '작업 전환' : 'Switch task'}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">
              {locale === 'ko'
                ? '지금 작업을 멈추고 다른 작업으로 이동할까요?'
                : 'Pause the current task and move to another one?'}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
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
        <div className="fixed right-4 bottom-28 z-50 rounded-2xl border border-amber-300/20 bg-zinc-950/92 px-4 py-3 text-zinc-100 shadow-2xl backdrop-blur-xl">
          <div className="font-mono text-lg text-amber-300">+{rewardBurst.totalScore}</div>
          <div className="mt-1 text-sm font-medium">{rewardBurst.taskTitle}</div>
          <div className="mt-1 text-xs text-zinc-400">
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
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-white/6 text-zinc-200">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
        <p className="font-mono text-sm text-zinc-100">{value}</p>
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
        accent ? 'border-amber-300/25 bg-amber-300/8' : 'border-white/8 bg-black/20',
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-[22px] leading-none text-white">{value}</p>
    </div>
  )
}

function MetricSurface({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 font-mono text-lg leading-none text-white">{value}</p>
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
        'grid gap-4 rounded-3xl border px-4 py-4 transition-colors xl:grid-cols-[minmax(0,1fr)_160px_204px_110px]',
        isActive
          ? 'border-amber-300/25 bg-amber-300/7'
          : 'border-white/8 bg-black/20 hover:bg-white/5',
      )}
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/10 text-zinc-300">
            {getSourceLabel(task.source, locale)}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-zinc-300">
            {getCategoryLabel(task.category, locale)}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-zinc-300">
            {getPriorityLabel(task.priority, locale)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" /> : null}
          <p className="truncate text-base font-semibold tracking-[-0.02em] text-white">
            {getTaskTitle(task, locale)}
          </p>
          {isActive ? (
            <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] font-medium text-amber-200">
              {copy.workingNow}
            </span>
          ) : null}
        </div>

        {task.notes ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">{task.notes}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>{task.points} base</span>
          <span>{task.estimatedMinutes} min</span>
          <span>{dueLabel}</span>
          <span>{getStatusLabel(task.status, locale)}</span>
        </div>
      </div>

      <div className="grid content-start gap-2 rounded-2xl border border-white/8 bg-black/20 p-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          {copy.scoreDeltaLabel}
        </p>
        <p className="font-mono text-xl leading-none text-white">+{task.points}</p>
        <p className="text-xs text-zinc-500">
          {copy.estimate} {task.estimatedMinutes}m
        </p>
      </div>

      <div className="grid gap-2">
        {task.status !== 'done' ? (
          <>
            <Button
              variant={isActive ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
            >
              {copy.estimate} {task.estimatedMinutes}m
            </Button>
            <div className="grid grid-cols-[72px_1fr] gap-2">
              <Input
                type="number"
                min={5}
                max={240}
                step={5}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Number(event.target.value))}
                className="h-7"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartTimer(task.id, Math.max(5, customMinutes))}
              >
                {copy.startTimer}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-center text-xs text-zinc-500">
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
        <Button variant="ghost" className="min-h-10" onClick={() => onDelete(task.id)}>
          <Trash2 className="size-3.5" />
          {copy.deleteTask}
        </Button>
      </div>
    </div>
  )
}

export default App
