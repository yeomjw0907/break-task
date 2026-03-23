import type { Task, TaskPriority, TaskStatus } from './types'

export type Locale = 'ko' | 'en'

export const uiCopy = {
  ko: {
    localOnly: '로컬 데모',
    heroTitle: '업무 루프를 먼저 검증하고, 연동은 그 다음에 붙인다.',
    heroDescription:
      '이 버전은 아직 노션과 연결되지 않는다. 대신 데모 태스크 불러오기, 수동 추가, 타이머 실행, 완료 보상, 일일 회고까지는 실제로 동작한다.',
    loadDemo: '데모 태스크 불러오기',
    resetBoard: '보드 초기화',
    openLeft: '남은 태스크',
    todayScore: '오늘 점수',
    highScore: '최고 기록',
    focusMinutes: '집중 시간',
    finished: '완료',
    remaining: '남음',
    board: '보드',
    boardTitle: '오늘 끝낼 태스크',
    searchPlaceholder: '태스크 또는 태그 검색',
    addTask: '수동 태스크 추가',
    addTaskPlaceholder: '직접 테스트할 태스크를 입력해봐',
    all: '전체',
    allStatus: '전체 상태',
    allPriority: '전체 우선순위',
    todo: '할 일',
    inProgress: '진행 중',
    timer: '타이머',
    timerTitle: '현재 실행 중인 시간박스',
    timerIdle: '실행 중인 타이머 없음',
    timerIdleCopy: '태스크 카드에서 25m, 45m 또는 예상 시간을 눌러 시작한다.',
    estimate: '예상',
    elapsed: '경과',
    left: '남은 시간',
    pause: '일시정지',
    resume: '재개',
    finish: '완료 처리',
    stop: '중단',
    report: '리포트',
    reportTitle: '오늘 남는 기록',
    summary: '요약',
    feed: '완료 피드',
    history: '최근 흐름',
    noDue: '마감 없음',
    noVisibleTasks: '지금 보이는 태스크가 없다',
    noVisibleTasksCopy: '필터를 해제하거나 데모 태스크를 불러오거나 직접 추가하면 된다.',
    noCompletionYet: '아직 오늘 완료 기록이 없다. 한 개만 끝내도 바로 피드가 채워진다.',
    language: '언어',
    onTime: '시간 내 완료',
    overtime: '초과',
    early: '예정보다 빠름',
    rewardCombo: '콤보',
    rewardFocus: '집중 보너스',
    rewardHighScore: '최고 기록 갱신',
  },
  en: {
    localOnly: 'Local demo',
    heroTitle: 'Validate the work loop first, then plug in integrations.',
    heroDescription:
      'This version does not connect to Notion yet. You can still load demo tasks, add tasks manually, run a timer, complete work, and check the recap loop.',
    loadDemo: 'Load Demo Tasks',
    resetBoard: 'Reset Board',
    openLeft: 'open tasks left',
    todayScore: 'Today score',
    highScore: 'High score',
    focusMinutes: 'Focus minutes',
    finished: 'Finished',
    remaining: 'Remaining',
    board: 'Board',
    boardTitle: 'Tasks to finish today',
    searchPlaceholder: 'Search tasks or tags',
    addTask: 'Add Manual Task',
    addTaskPlaceholder: 'Type a task you want to test',
    all: 'All',
    allStatus: 'All statuses',
    allPriority: 'All priorities',
    todo: 'Todo',
    inProgress: 'In progress',
    timer: 'Timer',
    timerTitle: 'Current running timebox',
    timerIdle: 'No timer running',
    timerIdleCopy: 'Start from any task card with 25m, 45m, or the default estimate.',
    estimate: 'Estimate',
    elapsed: 'Elapsed',
    left: 'Remaining',
    pause: 'Pause',
    resume: 'Resume',
    finish: 'Finish',
    stop: 'Stop',
    report: 'Report',
    reportTitle: 'What the day records',
    summary: 'Summary',
    feed: 'Completion feed',
    history: 'Recent curve',
    noDue: 'No due time',
    noVisibleTasks: 'No visible tasks right now',
    noVisibleTasksCopy: 'Clear the filters, load demo tasks, or add one manually.',
    noCompletionYet: 'No completion yet. Finish one task and this feed starts explaining the day.',
    language: 'Language',
    onTime: 'On time',
    overtime: 'Overtime',
    early: 'Early',
    rewardCombo: 'Combo',
    rewardFocus: 'Focus bonus',
    rewardHighScore: 'New high score',
  },
} as const

export const localizedTaskCopy: Record<string, { ko: string; en: string }> = {
  'task-01': { ko: '2분기 예산 메모 최종 정리', en: 'Finalize Q2 budget memo' },
  'task-02': { ko: '파트너 후속 메일 답변 정리', en: 'Reply to partner follow-ups' },
  'task-03': { ko: 'CRM 파이프라인 업데이트', en: 'Update CRM pipeline' },
  'task-04': { ko: '스탠드업 노트 준비', en: 'Prepare standup notes' },
  'task-05': { ko: '핸드오프 체크리스트 검토', en: 'Review handoff checklist' },
  'notion-preview-01': { ko: '투자자용 파운더 업데이트 초안 작성', en: 'Draft founder update for investors' },
  'notion-preview-02': { ko: '금요일 리뷰 전 로드맵 블로커 정리', en: 'Clean up roadmap blockers before Friday review' },
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
    ko: { todo: '할 일', in_progress: '진행 중', done: '완료', archived: '보관' },
    en: { todo: 'Todo', in_progress: 'In Progress', done: 'Done', archived: 'Archived' },
  }
  return labels[locale][status]
}

export function getCategoryLabel(category: Task['category'], locale: Locale): string {
  const labels = {
    ko: {
      deep_work: '집중 업무',
      admin: '운영',
      meeting: '회의',
      communication: '커뮤니케이션',
      planning: '계획',
      maintenance: '유지보수',
    },
    en: {
      deep_work: 'Deep Work',
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
    ko: { notion: '노션', calendar: '캘린더', manual: '수동', import: '가져옴' },
    en: { notion: 'Notion', calendar: 'Calendar', manual: 'Manual', import: 'Imported' },
  }
  return labels[locale][source]
}
