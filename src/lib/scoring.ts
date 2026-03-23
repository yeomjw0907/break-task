import type {
  DailyReport,
  DailyScore,
  ScoreBreakdown,
  Task,
  TaskCompletion,
  TaskPriority,
} from '../types'

const PRIORITY_POINTS: Record<TaskPriority, number> = {
  low: 0,
  medium: 8,
  high: 18,
  critical: 30,
}

export function getPriorityBonus(priority: TaskPriority): number {
  return PRIORITY_POINTS[priority]
}

export function getComboMultiplier(comboIndex: number): number {
  if (comboIndex <= 0) return 1
  if (comboIndex === 1) return 1.05
  if (comboIndex === 2) return 1.1
  if (comboIndex === 3) return 1.2
  if (comboIndex === 4) return 1.35
  return Math.min(1.35 + (comboIndex - 4) * 0.08, 2)
}

export function getFocusBonus(focusMinutes: number): number {
  if (focusMinutes < 10) return 0
  if (focusMinutes < 25) return 6
  if (focusMinutes < 45) return 14
  if (focusMinutes < 90) return 24
  return 30
}

export function getOverdueBonus(wasOverdue: boolean): number {
  return wasOverdue ? 12 : 0
}

export function getTimeBonus(actualMinutes: number, estimatedMinutes: number): {
  bonus: number
  state: ScoreBreakdown['completionState']
} {
  if (estimatedMinutes <= 0) {
    return { bonus: 0, state: 'on_time' }
  }

  const ratio = actualMinutes / estimatedMinutes

  if (ratio <= 0.9) {
    return { bonus: 12, state: 'early' }
  }

  if (ratio <= 1) {
    return { bonus: 8, state: 'on_time' }
  }

  if (ratio <= 1.2) {
    return { bonus: 0, state: 'on_time' }
  }

  if (ratio <= 1.5) {
    return { bonus: -4, state: 'overtime' }
  }

  return { bonus: -8, state: 'overtime' }
}

export function calculateTaskScore(
  task: Task,
  completion: Partial<TaskCompletion>,
): ScoreBreakdown {
  const baseScore = task.points
  const priorityBonus = getPriorityBonus(task.priority)
  const focusBonus = getFocusBonus(completion.focusMinutes ?? 0)
  const overdueBonus = getOverdueBonus(Boolean(completion.wasOverdue))
  const estimatedMinutes = completion.estimatedMinutes ?? task.estimatedMinutes
  const actualMinutes =
    completion.actualMinutes ?? completion.focusMinutes ?? completion.estimatedMinutes ?? task.estimatedMinutes
  const timeResult = getTimeBonus(actualMinutes, estimatedMinutes)
  const comboIndex = completion.comboIndex ?? 0
  const comboMultiplier = getComboMultiplier(comboIndex)

  const subtotal =
    baseScore + priorityBonus + focusBonus + overdueBonus + timeResult.bonus
  const comboBonus = Math.round(subtotal * (comboMultiplier - 1))
  const totalScore = subtotal + comboBonus

  return {
    baseScore,
    priorityBonus,
    focusBonus,
    overdueBonus,
    timeBonus: timeResult.bonus,
    comboBonus,
    totalScore,
    comboMultiplier,
    completionState: timeResult.state,
  }
}

export function calculateCompletionScore(
  task: Task,
  completion: Partial<TaskCompletion>,
): number {
  return calculateTaskScore(task, completion).totalScore
}

export function calculateDailyScore(
  completions: TaskCompletion[],
  existingHighScore = 0,
): DailyScore {
  const totalScore = completions.reduce((sum, completion) => sum + completion.scoreEarned, 0)
  const completedCount = completions.length
  const comboPeak = completions.reduce(
    (max, completion) => Math.max(max, completion.comboIndex),
    0,
  )
  const focusMinutes = completions.reduce(
    (sum, completion) => sum + completion.focusMinutes,
    0,
  )

  return {
    date:
      completions[0]?.completedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    totalScore,
    completedCount,
    comboPeak,
    focusMinutes,
    highScore: totalScore > existingHighScore,
  }
}

export function updateHighScore(previousHighScore: number, dailyScore: number): number {
  return Math.max(previousHighScore, dailyScore)
}

export function createDailyReport(
  dailyScore: DailyScore,
  completions: TaskCompletion[],
  tasks: Task[],
): DailyReport {
  const completedTasks = completions
    .map((completion) => tasks.find((task) => task.id === completion.taskId))
    .filter((task): task is Task => Boolean(task))

  const topTask = completedTasks.sort((left, right) => right.points - left.points).at(0)

  const wins = [
    `${dailyScore.completedCount} tasks finished`,
    `${dailyScore.totalScore} score earned`,
    `Combo peak x${dailyScore.comboPeak || 1}`,
  ]

  const onTimeCount = completions.filter(
    (completion) => completion.completionState !== 'overtime',
  ).length
  const overtimeCount = completions.filter(
    (completion) => completion.completionState === 'overtime',
  ).length

  const nextActions = [
    'Pick one critical task before noon',
    'Keep the next combo alive with a 25-minute focus block',
  ]

  if (overtimeCount > 0) {
    nextActions.unshift('Shrink one task scope before starting the timer')
  }

  if (dailyScore.highScore) {
    wins.unshift('New personal high score')
  }

  return {
    date: dailyScore.date,
    completedCount: dailyScore.completedCount,
    totalScore: dailyScore.totalScore,
    comboPeak: dailyScore.comboPeak,
    focusMinutes: dailyScore.focusMinutes,
    onTimeCount,
    overtimeCount,
    highScore: dailyScore.highScore,
    topTaskTitle: topTask?.title ?? null,
    wins,
    nextActions,
  }
}
