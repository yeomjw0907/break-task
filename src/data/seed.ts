import {
  calculateDailyScore,
  calculateTaskScore,
  createDailyReport,
  updateHighScore,
} from '../lib/scoring'
import type {
  DailyReport,
  DailyScore,
  SeededWorkspace,
  Task,
  TaskCompletion,
  UserProfile,
} from '../types'

export const seedProfile: UserProfile = {
  id: 'user-01',
  name: 'Desk Runner',
  timezone: 'Asia/Seoul',
  currentStreak: 4,
  bestStreak: 11,
  lifetimeScore: 4820,
  level: 7,
}

export const seedTasks: Task[] = [
  {
    id: 'task-01',
    title: 'Finalize Q2 budget memo',
    category: 'deep_work',
    priority: 'critical',
    status: 'todo',
    estimatedMinutes: 90,
    dueAt: '2026-03-20T14:00:00+09:00',
    points: 45,
    source: 'notion',
    tags: ['finance', 'leadership'],
    notes: 'Close the finance narrative before the afternoon leadership review.',
  },
  {
    id: 'task-02',
    title: 'Reply to partner follow-ups',
    category: 'communication',
    priority: 'high',
    status: 'todo',
    estimatedMinutes: 25,
    dueAt: '2026-03-20T17:30:00+09:00',
    points: 24,
    source: 'calendar',
    tags: ['external', 'email'],
    notes: 'Bundle the replies into one session instead of scattering them.',
  },
  {
    id: 'task-03',
    title: 'Update CRM pipeline',
    category: 'admin',
    priority: 'medium',
    status: 'in_progress',
    estimatedMinutes: 20,
    dueAt: null,
    points: 16,
    source: 'manual',
    tags: ['ops', 'sales'],
    notes: 'Check next-step owners and stale opportunities.',
  },
  {
    id: 'task-04',
    title: 'Prepare standup notes',
    category: 'planning',
    priority: 'low',
    status: 'todo',
    estimatedMinutes: 10,
    dueAt: '2026-03-21T09:20:00+09:00',
    points: 10,
    source: 'manual',
    tags: ['daily', 'sync'],
    notes: 'Keep it short and only pull blockers worth escalating.',
  },
  {
    id: 'task-05',
    title: 'Review handoff checklist',
    category: 'maintenance',
    priority: 'medium',
    status: 'done',
    estimatedMinutes: 15,
    dueAt: null,
    points: 14,
    source: 'import',
    tags: ['delivery', 'qa'],
    notes: 'Done earlier today, used as a seeded proof point for the report.',
  },
]

const completedAt = [
  '2026-03-18T10:15:00+09:00',
  '2026-03-18T13:20:00+09:00',
  '2026-03-19T09:40:00+09:00',
  '2026-03-19T15:05:00+09:00',
  '2026-03-20T11:30:00+09:00',
]

const completionBlueprints = [
  { taskId: 'task-01', focusMinutes: 48, wasOverdue: true, comboIndex: 1, completedAt: completedAt[0] },
  { taskId: 'task-02', focusMinutes: 26, wasOverdue: false, comboIndex: 2, completedAt: completedAt[1] },
  { taskId: 'task-03', focusMinutes: 34, wasOverdue: false, comboIndex: 1, completedAt: completedAt[2] },
  { taskId: 'task-05', focusMinutes: 22, wasOverdue: false, comboIndex: 2, completedAt: completedAt[3] },
  { taskId: 'task-04', focusMinutes: 14, wasOverdue: false, comboIndex: 3, completedAt: completedAt[4] },
] as const

export const seedCompletions: TaskCompletion[] = completionBlueprints.map((blueprint, index) => {
  const task = seedTasks.find((candidate) => candidate.id === blueprint.taskId)

  if (!task) {
    throw new Error(`Missing seeded task: ${blueprint.taskId}`)
  }

  const breakdown = calculateTaskScore(task, {
    focusMinutes: blueprint.focusMinutes,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: blueprint.focusMinutes,
    wasOverdue: blueprint.wasOverdue,
    comboIndex: blueprint.comboIndex,
  })
  const scoreEarned = breakdown.totalScore

  return {
    id: `completion-${index + 1}`,
    taskId: blueprint.taskId,
    completedAt: blueprint.completedAt,
    focusMinutes: blueprint.focusMinutes,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: blueprint.focusMinutes,
    wasOverdue: blueprint.wasOverdue,
    comboIndex: blueprint.comboIndex,
    scoreEarned,
    bonusPoints: scoreEarned - task.points,
    timeBonus: breakdown.timeBonus,
    completionState: breakdown.completionState,
  }
})

const dayOne: TaskCompletion[] = seedCompletions.slice(0, 2)
const dayTwo: TaskCompletion[] = seedCompletions.slice(2, 4)
const dayThree: TaskCompletion[] = seedCompletions.slice(4)

const scoreOne = calculateDailyScore(dayOne, 0)
const scoreTwo = calculateDailyScore(dayTwo, scoreOne.totalScore)
const scoreThree = calculateDailyScore(dayThree, scoreTwo.totalScore)

export const seedDailyScores: DailyScore[] = [scoreOne, scoreTwo, scoreThree]

export const seedReports: DailyReport[] = [
  createDailyReport(seedDailyScores[0], dayOne, seedTasks),
  createDailyReport(seedDailyScores[1], dayTwo, seedTasks),
  createDailyReport(seedDailyScores[2], dayThree, seedTasks),
]

export const seedWorkspace: SeededWorkspace = {
  profile: {
    ...seedProfile,
    lifetimeScore: seedCompletions.reduce(
      (sum, completion) => sum + completion.scoreEarned,
      seedProfile.lifetimeScore,
    ),
    level: seedProfile.level + Math.floor(seedCompletions.length / 3),
  },
  tasks: seedTasks,
  completions: seedCompletions,
  dailyScores: seedDailyScores,
}

export const seedHighScore = updateHighScore(
  0,
  Math.max(...seedDailyScores.map((score) => score.totalScore)),
)
