import {
  type FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import './App.css'
import { uiCopy, type Locale, getCategoryLabel, getPriorityLabel, getSourceLabel, getStatusLabel, getTaskTitle } from './copy'
import { seedCompletions, seedDailyScores, seedHighScore, seedProfile, seedTasks } from './data/seed'
import { calculateDailyScore, calculateTaskScore, createDailyReport, updateHighScore } from './lib/scoring'
import type { DailyScore, ScoreBreakdown, Task, TaskCompletion, TaskPriority, TaskStatus, UserProfile } from './types'

type FilterValue = 'all' | TaskStatus

type RewardBurst = ScoreBreakdown & {
  taskTitle: string
  highScore: boolean
}

type TimerState = {
  taskId: string
  estimatedMinutes: number
  elapsedSeconds: number
  isPaused: boolean
}

const STORAGE_KEYS = {
  tasks: 'taskbrick.tasks',
  completions: 'taskbrick.completions',
  dailyScores: 'taskbrick.dailyScores',
  highScore: 'taskbrick.highScore',
  profile: 'taskbrick.profile',
  locale: 'taskbrick.locale',
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

function getTodayKey(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatDueLabel(dueAt: string | null, timezone: string, locale: Locale): string {
  const copy = uiCopy[locale]
  if (!dueAt) return copy.noDue

  const dueDate = new Date(dueAt)
  const dueKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dueDate)
  const time = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(dueDate)

  if (dueKey === getTodayKey(timezone)) {
    return locale === 'ko' ? `오늘 ${time}` : `Due ${time}`
  }

  return `${dueKey} ${time}`
}

function getLevelProgress(totalScore: number) {
  const current = totalScore % 700
  return { current, next: 700, progress: Math.min((current / 700) * 100, 100) }
}

function upsertDailyScore(scores: DailyScore[], nextScore: DailyScore): DailyScore[] {
  const hasExisting = scores.some((score) => score.date === nextScore.date)
  const updated = hasExisting
    ? scores.map((score) => (score.date === nextScore.date ? nextScore : score))
    : [...scores, nextScore]

  return updated.sort((left, right) => left.date.localeCompare(right.date))
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredValue(STORAGE_KEYS.tasks, seedTasks))
  const [completions, setCompletions] = useState<TaskCompletion[]>(() => loadStoredValue(STORAGE_KEYS.completions, seedCompletions))
  const [dailyScores, setDailyScores] = useState<DailyScore[]>(() => loadStoredValue(STORAGE_KEYS.dailyScores, seedDailyScores))
  const [highScore, setHighScore] = useState<number>(() => loadStoredValue(STORAGE_KEYS.highScore, seedHighScore))
  const [profile, setProfile] = useState<UserProfile>(() => loadStoredValue(STORAGE_KEYS.profile, seedProfile))
  const [locale, setLocale] = useState<Locale>(() => loadStoredValue(STORAGE_KEYS.locale, 'ko'))
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [search, setSearch] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('medium')
  const [draftMinutes, setDraftMinutes] = useState(25)
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null)
  const [rewardBurst, setRewardBurst] = useState<RewardBurst | null>(null)

  const copy = uiCopy[locale]
  const deferredSearch = useDeferredValue(search)
  const todayKey = getTodayKey(profile.timezone)
  const todayCompletions = completions.filter((completion) => completion.completedAt.slice(0, 10) === todayKey)
  const todayScore = dailyScores.find((score) => score.date === todayKey) ?? { ...calculateDailyScore(todayCompletions, highScore), date: todayKey }
  const todayReport = createDailyReport(todayScore, todayCompletions, tasks)
  const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived')
  const timerTask = activeTimer ? tasks.find((task) => task.id === activeTimer.taskId) ?? null : null
  const level = getLevelProgress(profile.lifetimeScore)
  const timerElapsedMinutes = activeTimer ? Math.max(1, Math.ceil(activeTimer.elapsedSeconds / 60)) : 0
  const timerRemainingMinutes = activeTimer ? Math.max(activeTimer.estimatedMinutes - timerElapsedMinutes, 0) : 0
  const timerStatus =
    !activeTimer ? copy.timerIdle : activeTimer.isPaused ? copy.pause : timerElapsedMinutes > activeTimer.estimatedMinutes ? copy.overtime : copy.inProgress

  const filteredTasks = openTasks.filter((task) => {
    const localizedTitle = getTaskTitle(task, locale).toLowerCase()
    const q = deferredSearch.trim().toLowerCase()
    return (statusFilter === 'all' || task.status === statusFilter)
      && (priorityFilter === 'all' || task.priority === priorityFilter)
      && (q.length === 0 || localizedTitle.includes(q) || task.tags.join(' ').toLowerCase().includes(q))
  })

  const reportWins = locale === 'ko'
    ? [`오늘 ${todayReport.completedCount}개 완료`, `${todayReport.totalScore}점 획득`, `최고 콤보 x${todayReport.comboPeak || 1}`]
    : [`${todayReport.completedCount} tasks finished`, `${todayReport.totalScore} score earned`, `Combo peak x${todayReport.comboPeak || 1}`]

  if (todayReport.highScore) {
    reportWins.unshift(copy.rewardHighScore)
  }

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify(locale))
  }, [locale])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
    window.localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions))
    window.localStorage.setItem(STORAGE_KEYS.dailyScores, JSON.stringify(dailyScores))
    window.localStorage.setItem(STORAGE_KEYS.highScore, JSON.stringify(highScore))
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile))
  }, [tasks, completions, dailyScores, highScore, profile])

  const playRewardSound = useEffectEvent((nextReward: RewardBurst) => {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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
    window.setTimeout(() => { void context.close().catch(() => undefined) }, 260)
  })

  useEffect(() => {
    if (!rewardBurst) return
    playRewardSound(rewardBurst)
    const timeout = window.setTimeout(() => setRewardBurst(null), 1400)
    return () => window.clearTimeout(timeout)
  }, [rewardBurst])

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return
    const interval = window.setInterval(() => {
      setActiveTimer((current) => current && !current.isPaused ? { ...current, elapsedSeconds: current.elapsedSeconds + 1 } : current)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [activeTimer])

  function handleCompleteTask(taskId: string) {
    const task = tasks.find((candidate) => candidate.id === taskId)
    if (!task || task.status === 'done') return

    const actualMinutes = activeTimer?.taskId === taskId ? Math.max(1, Math.ceil(activeTimer.elapsedSeconds / 60)) : task.estimatedMinutes
    const estimatedMinutes = activeTimer?.taskId === taskId ? activeTimer.estimatedMinutes : task.estimatedMinutes
    const completedAt = new Date().toISOString()
    const breakdown = calculateTaskScore(task, {
      comboIndex: todayCompletions.length + 1,
      focusMinutes: actualMinutes,
      estimatedMinutes,
      actualMinutes,
      wasOverdue: Boolean(task.dueAt && new Date(task.dueAt).getTime() < new Date(completedAt).getTime()),
    })

    const nextCompletion: TaskCompletion = {
      id: `completion-${completedAt.replaceAll(/[:.]/g, '-')}`,
      taskId,
      completedAt,
      focusMinutes: actualMinutes,
      estimatedMinutes,
      actualMinutes,
      wasOverdue: Boolean(task.dueAt && new Date(task.dueAt).getTime() < new Date(completedAt).getTime()),
      comboIndex: todayCompletions.length + 1,
      scoreEarned: breakdown.totalScore,
      bonusPoints: breakdown.totalScore - task.points,
      timeBonus: breakdown.timeBonus,
      completionState: breakdown.completionState,
    }

    const nextDailyScore = { ...calculateDailyScore([...todayCompletions, nextCompletion], highScore), date: todayKey }

    startTransition(() => {
      setTasks((current) => current.map((item) => item.id === taskId ? { ...item, status: 'done' } : item))
      setCompletions((current) => [...current, nextCompletion])
      setDailyScores((current) => upsertDailyScore(current, nextDailyScore))
      setHighScore((current) => updateHighScore(current, nextDailyScore.totalScore))
      setProfile((current) => {
        const lifetimeScore = current.lifetimeScore + breakdown.totalScore
        return { ...current, lifetimeScore, level: 1 + Math.floor(lifetimeScore / 700) }
      })
      setRewardBurst({ ...breakdown, taskTitle: getTaskTitle(task, locale), highScore: nextDailyScore.totalScore > highScore })
      setActiveTimer((current) => current?.taskId === taskId ? null : current)
    })
  }

  function handleStartTimer(taskId: string, estimatedMinutes: number) {
    setActiveTimer({ taskId, estimatedMinutes, elapsedSeconds: 0, isPaused: false })
    setTasks((current) => current.map((task) => task.id === taskId && task.status === 'todo' ? { ...task, status: 'in_progress' } : task))
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draftTitle.trim()
    if (!title) return

    const points = draftPriority === 'critical' ? 24 : draftPriority === 'high' ? 18 : draftPriority === 'medium' ? 13 : 9
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
      notes: locale === 'ko' ? 'TaskBrick 안에서 직접 만든 태스크.' : 'Created manually inside TaskBrick.',
    }

    startTransition(() => {
      setTasks((current) => [nextTask, ...current])
      setDraftTitle('')
    })
  }

  return (
    <div className={`app-shell locale-${locale}`}>
      <header className="hero-panel">
        <div className="hero-copy">
          <div className="hero-topline">
            <div className="eyebrow-row">
              <span className="eyebrow">TaskBrick MVP</span>
              <span className="eyebrow subtle">{copy.localOnly}</span>
            </div>
            <div className="locale-toggle" role="group" aria-label={copy.language}>
              <button className={locale === 'ko' ? 'locale-button active' : 'locale-button'} type="button" onClick={() => setLocale('ko')}>한글</button>
              <button className={locale === 'en' ? 'locale-button active' : 'locale-button'} type="button" onClick={() => setLocale('en')}>EN</button>
            </div>
          </div>
          <h1>{copy.heroTitle}</h1>
          <p className="hero-description">{copy.heroDescription}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setTasks((current) => [...notionPreviewTasks.filter((task) => !new Set(current.map((item) => item.id)).has(task.id)), ...current])}>{copy.loadDemo}</button>
            <button className="secondary-button" type="button" onClick={() => {
              setTasks(seedTasks.map((task) => ({ ...task })))
              setCompletions(seedCompletions.map((completion) => ({ ...completion })))
              setDailyScores(seedDailyScores.map((score) => ({ ...score })))
              setHighScore(seedHighScore)
              setProfile({ ...seedProfile })
              setActiveTimer(null)
              setRewardBurst(null)
            }}>{copy.resetBoard}</button>
            <div className="hero-caption">
              <strong>{openTasks.length}</strong>
              <span>{copy.openLeft}</span>
            </div>
          </div>
        </div>

        <div className="scoreboard-panel">
          <div className="score-header"><span>{copy.todayScore}</span><strong>{todayScore.totalScore}</strong></div>
          <div className="score-subline"><span>{copy.highScore}</span><strong>{highScore}</strong></div>
          <div className="brick-wall" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <span key={index} className={index < Math.min(todayCompletions.length + 2, 10) ? 'brick active' : 'brick'} />)}
          </div>
          <div className="stat-pairs">
            <div><span>{copy.focusMinutes}</span><strong>{todayScore.focusMinutes}</strong></div>
            <div><span>{copy.finished}</span><strong>{todayCompletions.length}</strong></div>
            <div><span>{copy.remaining}</span><strong>{openTasks.length}</strong></div>
            <div><span>Level</span><strong>{profile.level}</strong></div>
          </div>
        </div>
      </header>

      <main className="content-grid content-grid-dual">
        <section className="panel task-panel">
          <div className="panel-header">
            <div><span className="panel-kicker">{copy.board}</span><h2>{copy.boardTitle}</h2></div>
            <div className="filter-row">
              <input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterValue)}>
                <option value="all">{copy.allStatus}</option>
                <option value="todo">{copy.todo}</option>
                <option value="in_progress">{copy.inProgress}</option>
              </select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | 'all')}>
                <option value="all">{copy.allPriority}</option>
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{getPriorityLabel(priority, locale)}</option>)}
              </select>
            </div>
          </div>

          <form className="quick-capture" onSubmit={handleAddTask}>
            <input type="text" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={copy.addTaskPlaceholder} />
            <select value={draftPriority} onChange={(event) => setDraftPriority(event.target.value as TaskPriority)}>
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{getPriorityLabel(priority, locale)}</option>)}
            </select>
            <input type="number" min={10} max={180} step={5} value={draftMinutes} onChange={(event) => setDraftMinutes(Number(event.target.value))} />
            <button className="secondary-button" type="submit">{copy.addTask}</button>
          </form>

          <div className="task-list">
            {filteredTasks.map((task) => (
              <article key={task.id} className={`task-card status-${task.status} priority-${task.priority}`}>
                <div className="task-main">
                  <div className="task-meta-row">
                    <span className="chip chip-source">{getSourceLabel(task.source, locale)}</span>
                    <span className="chip">{getCategoryLabel(task.category, locale)}</span>
                    <span className={`chip chip-priority ${task.priority}`}>{getPriorityLabel(task.priority, locale)}</span>
                  </div>
                  <h3>{getTaskTitle(task, locale)}</h3>
                  <p>{task.notes}</p>
                  <div className="task-stats">
                    <span>{task.points} base</span>
                    <span>{task.estimatedMinutes} min</span>
                    <span>{formatDueLabel(task.dueAt, profile.timezone, locale)}</span>
                    <span>{getStatusLabel(task.status, locale)}</span>
                  </div>
                </div>
                <div className="task-actions">
                  <div className="sprint-buttons">
                    {[task.estimatedMinutes, 25, 45].filter((minutes, index, array) => array.indexOf(minutes) === index).map((minutes) => (
                      <button key={minutes} className={activeTimer?.taskId === task.id && activeTimer.estimatedMinutes === minutes ? 'sprint-pill active' : 'sprint-pill'} type="button" onClick={() => handleStartTimer(task.id, minutes)}>
                        {minutes}m
                      </button>
                    ))}
                  </div>
                  <button className="primary-button task-complete" type="button" onClick={() => handleCompleteTask(task.id)}>{copy.finish}</button>
                </div>
              </article>
            ))}
            {filteredTasks.length === 0 ? <div className="empty-state"><h3>{copy.noVisibleTasks}</h3><p>{copy.noVisibleTasksCopy}</p></div> : null}
          </div>
        </section>

        <aside className="sidebar">
          <section className="panel">
            <div className="panel-header compact"><div><span className="panel-kicker">{copy.timer}</span><h2>{copy.timerTitle}</h2></div></div>
            {activeTimer && timerTask ? (
              <div className="focus-card active">
                <strong>{getTaskTitle(timerTask, locale)}</strong>
                <p>{timerStatus}</p>
                <div className="timer-grid">
                  <div><span>{copy.estimate}</span><strong>{activeTimer.estimatedMinutes}m</strong></div>
                  <div><span>{copy.elapsed}</span><strong>{timerElapsedMinutes}m</strong></div>
                  <div><span>{copy.left}</span><strong>{timerElapsedMinutes > activeTimer.estimatedMinutes ? `+${timerElapsedMinutes - activeTimer.estimatedMinutes}m` : `${timerRemainingMinutes}m`}</strong></div>
                </div>
                <div className="timer-progress"><div className="timer-progress-bar" style={{ width: `${Math.min((timerElapsedMinutes / Math.max(activeTimer.estimatedMinutes, 1)) * 100, 100)}%` }} /></div>
                <div className="timer-actions">
                  <button className="secondary-button" type="button" onClick={() => setActiveTimer((current) => current ? { ...current, isPaused: !current.isPaused } : current)}>{activeTimer.isPaused ? copy.resume : copy.pause}</button>
                  <button className="secondary-button" type="button" onClick={() => setActiveTimer((current) => current ? { ...current, estimatedMinutes: current.estimatedMinutes + 10 } : current)}>+10m</button>
                  <button className="primary-button" type="button" onClick={() => handleCompleteTask(activeTimer.taskId)}>{copy.finish}</button>
                  <button className="secondary-button" type="button" onClick={() => setActiveTimer(null)}>{copy.stop}</button>
                </div>
              </div>
            ) : (
              <div className="focus-card"><strong>{copy.timerIdle}</strong><p>{copy.timerIdleCopy}</p></div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header compact"><div><span className="panel-kicker">{copy.report}</span><h2>{copy.reportTitle}</h2></div></div>
            <div className="report-card">
              <span className="report-label">{copy.summary}</span>
              <p className="summary-copy">
                {locale === 'ko'
                  ? <>오늘 <strong>{todayReport.completedCount}</strong>개를 끝냈고 <strong>{todayReport.totalScore}</strong>점을 얻었다.</>
                  : <>You finished <strong>{todayReport.completedCount}</strong> tasks and earned <strong>{todayReport.totalScore}</strong> points today.</>}
              </p>
              <div className="report-metrics">
                <div><span>{copy.focusMinutes}</span><strong>{todayReport.focusMinutes}m</strong></div>
                <div><span>{copy.onTime}</span><strong>{todayReport.onTimeCount}</strong></div>
                <div><span>{copy.overtime}</span><strong>{todayReport.overtimeCount}</strong></div>
              </div>
              <div className="bullet-columns">
                <div><h3>{copy.summary}</h3><ul className="signal-list">{reportWins.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </div>
          </section>
        </aside>
      </main>

      <section className="bottom-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="panel-kicker">{copy.feed}</span><h2>{copy.feed}</h2></div></div>
          <div className="feed-list">
            {todayCompletions.length > 0 ? todayCompletions.slice().reverse().map((completion) => {
              const linkedTask = tasks.find((task) => task.id === completion.taskId)
              return (
                <div key={completion.id} className="feed-item">
                  <div>
                    <strong>{linkedTask ? getTaskTitle(linkedTask, locale) : 'Task'}</strong>
                    <p>+{completion.scoreEarned} score, {completion.actualMinutes}m, {completion.completionState === 'overtime' ? copy.overtime : completion.completionState === 'early' ? copy.early : copy.onTime}</p>
                  </div>
                  <span>{completion.focusMinutes}m</span>
                </div>
              )
            }) : <div className="empty-feed">{copy.noCompletionYet}</div>}
          </div>
        </section>

        <section className="panel history-panel">
          <div className="panel-header"><div><span className="panel-kicker">{copy.history}</span><h2>{copy.history}</h2></div></div>
          <div className="history-chart">
            {dailyScores.slice(-5).map((score) => (
              <div key={score.date} className="chart-column">
                <div className="chart-bar-wrap">
                  <div className={score.highScore ? 'chart-bar high' : 'chart-bar'} style={{ height: `${Math.max((score.totalScore / Math.max(highScore, 1)) * 100, 12)}%` }} />
                </div>
                <strong>{score.totalScore}</strong>
                <span>{score.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <p className="history-caption">Level {profile.level} · {level.current}/{level.next}</p>
        </section>
      </section>

      {rewardBurst ? (
        <div className="reward-burst" role="status" aria-live="polite">
          <span className="reward-pill">+{rewardBurst.totalScore}</span>
          <strong>{rewardBurst.taskTitle}</strong>
          <p>{copy.rewardCombo} x{rewardBurst.comboMultiplier.toFixed(2)} | {copy.rewardFocus} +{rewardBurst.focusBonus}{rewardBurst.highScore ? ` | ${copy.rewardHighScore}` : ''}</p>
        </div>
      ) : null}
    </div>
  )
}

export default App
