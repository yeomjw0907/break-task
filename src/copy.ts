import type { Task, TaskPriority, TaskStatus } from './types'

export type Locale = 'ko' | 'en'

export const uiCopy = {
  ko: {
    appTitle: 'TaskBrick',
    appSubtitle: '오늘 업무',
    demoBadge: 'Demo',
    navToday: '오늘',
    navInbox: '인박스',
    navDone: '완료',
    navHistory: '기록',
    navIntegrations: '연동',
    workspaceTitle: '오늘 끝낼 일',
    loadDemo: '데모 불러오기',
    resetBoard: '초기화',
    clearAll: '전체 삭제',
    totalOpen: '열린 태스크',
    todayScore: '오늘 점수',
    highScore: '최고 기록',
    focusMinutes: '집중 시간',
    currentCombo: '현재 콤보',
    boardTitle: '작업',
    boardSubtext: '바로 시작할 수 있습니다.',
    searchPlaceholder: '검색',
    allStatuses: '상태 전체',
    allPriorities: '우선순위 전체',
    todo: '할 일',
    inProgress: '진행 중',
    addTaskPlaceholder: '작업 추가',
    addTask: '추가',
    startTimer: '시작',
    timerTitle: '집중',
    timerIdleTitle: '실행 중인 작업이 없습니다.',
    timerIdleBody: '작업에서 시간을 정하고 시작하면 됩니다.',
    estimate: '예상',
    elapsed: '경과',
    remaining: '남은 시간',
    pause: '일시정지',
    resume: '재개',
    extend: '+10분',
    finish: '완료 처리',
    stop: '중단',
    reportTitle: '오늘 리포트',
    feedTitle: '완료 기록',
    historyTitle: '기록',
    historyBody: '최근 점수와 완료 기록입니다.',
    integrationsBody: '아직 연결된 서비스가 없습니다. 데모만 불러올 수 있습니다.',
    integrationSecondary: '캘린더 연동은 아직 없습니다.',
    noDue: '마감 없음',
    onTime: '시간 내 완료',
    overtime: '초과',
    early: '빠른 완료',
    noVisibleTasks: '표시할 작업이 없습니다.',
    noVisibleTasksBody: '새 작업을 추가하거나 데모를 불러오면 됩니다.',
    noCompletionYet: '오늘 완료 기록이 없습니다.',
    completeTask: '완료',
    deleteTask: '삭제',
    runningNow: '실행 중',
    workingNow: '현재 진행 중',
    level: '레벨',
    language: '언어',
    stateIdle: '대기',
    statePaused: '일시정지',
    stateRunning: '정상 진행',
    stateClosing: '마감 임박',
    stateOvertime: '초과',
    rightPanelHint: '현재 작업과 시간을 고정합니다.',
    reportSentence: (count: number, score: number) => `오늘 ${count}개 완료 / ${score}점`,
    rewardCombo: '콤보',
    rewardFocus: '집중',
    rewardHigh: '최고 기록 갱신',
    profileLabel: '오늘',
    demoSyncLabel: '노션 프리뷰',
    activeTimerLabel: '현재 작업',
    scoreDeltaLabel: '기본 점수',
    taskCountLabel: '남은 작업',
    completionMeta: (score: number, minutes: number) => `+${score}점 / ${minutes}분`,
    dueTodayAt: (timeLabel: string) => `오늘 ${timeLabel}`,
  },
  en: {
    appTitle: 'TaskBrick',
    appSubtitle: 'Today',
    demoBadge: 'Demo',
    navToday: 'Today',
    navInbox: 'Inbox',
    navDone: 'Done',
    navHistory: 'History',
    navIntegrations: 'Integrations',
    workspaceTitle: 'What to finish today',
    loadDemo: 'Load demo',
    resetBoard: 'Reset',
    clearAll: 'Clear all',
    totalOpen: 'Open tasks',
    todayScore: 'Today score',
    highScore: 'High score',
    focusMinutes: 'Focus minutes',
    currentCombo: 'Live combo',
    boardTitle: 'Tasks',
    boardSubtext: 'Start right away.',
    searchPlaceholder: 'Search',
    allStatuses: 'All statuses',
    allPriorities: 'All priorities',
    todo: 'Todo',
    inProgress: 'In progress',
    addTaskPlaceholder: 'Add task',
    addTask: 'Add',
    startTimer: 'Start',
    timerTitle: 'Focus',
    timerIdleTitle: 'No active task.',
    timerIdleBody: 'Pick a task, set time, and start.',
    estimate: 'Estimate',
    elapsed: 'Elapsed',
    remaining: 'Remaining',
    pause: 'Pause',
    resume: 'Resume',
    extend: '+10 min',
    finish: 'Mark complete',
    stop: 'Stop',
    reportTitle: 'Today report',
    feedTitle: 'Completion feed',
    historyTitle: 'History',
    historyBody: 'Recent score and completion history.',
    integrationsBody: 'No live integrations yet. Demo data only.',
    integrationSecondary: 'Calendar sync is not available yet.',
    noDue: 'No due time',
    onTime: 'On time',
    overtime: 'Overtime',
    early: 'Early',
    noVisibleTasks: 'No tasks to show.',
    noVisibleTasksBody: 'Add a task or load the demo set.',
    noCompletionYet: 'No completion yet.',
    completeTask: 'Complete',
    deleteTask: 'Delete',
    runningNow: 'Running',
    workingNow: 'In progress',
    level: 'Level',
    language: 'Language',
    stateIdle: 'Idle',
    statePaused: 'Paused',
    stateRunning: 'On track',
    stateClosing: 'Closing',
    stateOvertime: 'Overtime',
    rightPanelHint: 'Current task and time stay pinned.',
    reportSentence: (count: number, score: number) => `${count} done / ${score} score`,
    rewardCombo: 'Combo',
    rewardFocus: 'Focus',
    rewardHigh: 'New high score',
    profileLabel: 'Today',
    demoSyncLabel: 'Notion preview',
    activeTimerLabel: 'Current task',
    scoreDeltaLabel: 'Base score',
    taskCountLabel: 'Open tasks',
    completionMeta: (score: number, minutes: number) => `+${score} / ${minutes}m`,
    dueTodayAt: (timeLabel: string) => `Today ${timeLabel}`,
  },
} as const

export const localizedTaskCopy: Record<string, { ko: string; en: string }> = {
  'task-01': { ko: '2분기 예산 메모 정리', en: 'Finalize Q2 budget memo' },
  'task-02': { ko: '파트너 후속 답변 정리', en: 'Reply to partner follow-ups' },
  'task-03': { ko: 'CRM 파이프라인 업데이트', en: 'Update CRM pipeline' },
  'task-04': { ko: '스탠드업 노트 준비', en: 'Prepare standup notes' },
  'task-05': { ko: '핸드오프 체크리스트 검토', en: 'Review handoff checklist' },
  'notion-preview-01': {
    ko: '투자자 업데이트 초안 작성',
    en: 'Draft founder update for investors',
  },
  'notion-preview-02': {
    ko: '로드맵 블로커 정리',
    en: 'Clean up roadmap blockers before Friday review',
  },
}

export function getTaskTitle(task: Task, locale: Locale): string {
  return localizedTaskCopy[task.id]?.[locale] ?? task.title
}

export function getPriorityLabel(priority: TaskPriority, locale: Locale): string {
  const labels = {
    ko: { low: '낮음', medium: '보통', high: '높음', critical: '중요' },
    en: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
  }

  return labels[locale][priority]
}

export function getStatusLabel(status: TaskStatus, locale: Locale): string {
  const labels = {
    ko: {
      todo: '할 일',
      in_progress: '진행 중',
      done: '완료',
      archived: '보관됨',
    },
    en: {
      todo: 'Todo',
      in_progress: 'In progress',
      done: 'Done',
      archived: 'Archived',
    },
  }

  return labels[locale][status]
}

export function getCategoryLabel(category: Task['category'], locale: Locale): string {
  const labels = {
    ko: {
      deep_work: '집중',
      admin: '운영',
      meeting: '회의',
      communication: '커뮤니케이션',
      planning: '계획',
      maintenance: '유지보수',
    },
    en: {
      deep_work: 'Deep work',
      admin: 'Admin',
      meeting: 'Meeting',
      communication: 'Communication',
      planning: 'Planning',
      maintenance: 'Maintenance',
    },
  }

  return labels[locale][category]
}

export function getSourceLabel(source: Task['source'], locale: Locale): string {
  const labels = {
    ko: {
      notion: '노션',
      calendar: '캘린더',
      manual: '직접 추가',
      import: '가져오기',
    },
    en: {
      notion: 'Notion',
      calendar: 'Calendar',
      manual: 'Manual',
      import: 'Imported',
    },
  }

  return labels[locale][source]
}
