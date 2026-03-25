import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Locale } from '@/copy'

export type StartDayTaskItem = {
  id: string
  title: string
  priorityLabel: string
  estimateLabel: string
  dueLabel: string
  pinned: boolean
  estimatedMinutes: number
}

export function StartDayPanel({
  locale,
  activeWorkSession,
  activeWorkStartLabel,
  plannedWorkMinutes,
  selectedOpenMinutes,
  budgetProgress,
  budgetDeltaMinutes,
  tasks,
  pinnedCount,
  outlineBadgeClass,
  onStartTimer,
  onToggleFocusTask,
  onChangeBudget,
}: {
  locale: Locale
  activeWorkSession: boolean
  activeWorkStartLabel: string
  plannedWorkMinutes: number
  selectedOpenMinutes: number
  budgetProgress: number
  budgetDeltaMinutes: number
  tasks: StartDayTaskItem[]
  pinnedCount: number
  outlineBadgeClass: string
  onStartTimer: (taskId: string, estimatedMinutes: number) => void
  onToggleFocusTask: (taskId: string) => void
  onChangeBudget: (minutes: number) => void
}) {
  const isOverBudget = budgetDeltaMinutes < 0
  const recommendedTask = tasks[0] ?? null

  const stateLabel = activeWorkSession
    ? locale === 'ko'
      ? `${activeWorkStartLabel}부터 근무 중`
      : `Clocked in at ${activeWorkStartLabel}`
    : locale === 'ko'
      ? '출근 전 준비 상태'
      : 'Before clock-in'

  const stateBody = activeWorkSession
    ? locale === 'ko'
      ? '이제는 계획보다 실행과 복귀가 더 중요합니다. 고정 작업과 첫 작업만 빠르게 보고 바로 밀어가세요.'
      : 'The day is already open. Focus on the next move and resume what matters.'
    : locale === 'ko'
      ? '핵심 작업과 근무 예산만 먼저 잡아두면, 오늘의 첫 90분이 훨씬 덜 흔들립니다.'
      : 'Set the anchors and the work budget first so the first 90 minutes stay stable.'

  return (
    <section className="grid gap-5 rounded-[26px] border border-[var(--line)] bg-[var(--surface)] p-5 lg:grid-cols-[0.96fr_1.04fr] xl:gap-6 xl:p-6">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(251,191,36,0.02))] p-5 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.04)] xl:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Start Day</p>
              <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-foreground xl:text-[24px]">
                {locale === 'ko' ? '오늘 시작 루틴' : 'Start the day with intent'}
              </h3>
            </div>
            <Badge
              variant="outline"
              className={
                activeWorkSession
                  ? 'border-amber-300/22 bg-amber-300/10 text-amber-200 shadow-none'
                  : outlineBadgeClass
              }
            >
              {stateLabel}
            </Badge>
          </div>
          <p className="mt-4 max-w-[36rem] text-[15px] leading-7 text-[var(--text-soft)]">{stateBody}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 xl:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {locale === 'ko' ? '근무 예산' : 'Work budget'}
                </p>
                <p className="mt-3 font-mono text-[30px] leading-none text-foreground">{plannedWorkMinutes}m</p>
              </div>
              <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3 text-right text-sm text-[var(--text-soft)]">
                <p>{locale === 'ko' ? `예정 ${selectedOpenMinutes}m` : `Planned ${selectedOpenMinutes}m`}</p>
                <p className={isOverBudget ? 'mt-1.5 font-medium text-red-300' : 'mt-1.5 font-medium text-emerald-300'}>
                  {isOverBudget
                    ? locale === 'ko'
                      ? `${Math.abs(budgetDeltaMinutes)}m 초과`
                      : `${Math.abs(budgetDeltaMinutes)}m over`
                    : locale === 'ko'
                      ? `${budgetDeltaMinutes}m 여유`
                      : `${budgetDeltaMinutes}m open`}
                </p>
              </div>
            </div>
            <Progress value={budgetProgress} className="mt-5" />
            <div className="mt-5 flex flex-wrap gap-2.5">
              {[240, 360, 480, 600].map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={plannedWorkMinutes === minutes ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full px-4"
                  onClick={() => onChangeBudget(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 xl:p-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '오늘 체크리스트' : 'Ritual checklist'}
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
                <span>{locale === 'ko' ? '출근 상태' : 'Clock state'}</span>
                <Badge variant="outline" className={outlineBadgeClass}>
                  {activeWorkSession
                    ? locale === 'ko'
                      ? `${activeWorkStartLabel} 시작`
                      : `Started ${activeWorkStartLabel}`
                    : locale === 'ko'
                      ? '대기'
                      : 'Ready'}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
                <span>{locale === 'ko' ? '고정 작업' : 'Pinned anchors'}</span>
                <span className="font-mono text-foreground">{pinnedCount}/3</span>
              </div>
              <div className="flex items-center justify-between rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
                <span>{locale === 'ko' ? '첫 작업 후보' : 'First move'}</span>
                <span className="text-[var(--text-soft)]">{recommendedTask ? recommendedTask.estimateLabel : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {activeWorkSession && recommendedTask ? (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              className="rounded-[18px] px-5"
              onClick={() => onStartTimer(recommendedTask.id, recommendedTask.estimatedMinutes)}
            >
              {locale === 'ko' ? '첫 작업 바로 시작' : 'Start first task'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '오늘의 핵심 3개' : 'Top 3 today'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              {locale === 'ko'
                ? '가장 먼저 밀어야 할 작업만 남겨두고 시작 순서를 정합니다.'
                : 'Keep only the tasks that should anchor the day and set the first move.'}
            </p>
          </div>
          <Badge variant="outline" className={outlineBadgeClass}>
            {tasks.length}
          </Badge>
        </div>

        {recommendedTask ? (
          <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/8 p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200">
              {locale === 'ko' ? '바로 시작할 작업' : 'Recommended first move'}
            </p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{recommendedTask.title}</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  {recommendedTask.priorityLabel} · {recommendedTask.estimateLabel}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full px-4"
                onClick={() => onStartTimer(recommendedTask.id, recommendedTask.estimatedMinutes)}
              >
                {locale === 'ko' ? '바로 시작' : 'Start now'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <div
                key={task.id}
                className="grid gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-[var(--text-muted)]">0{index + 1}</span>
                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    <span className="rounded-full border border-[var(--line)] px-3 py-1.5">{task.priorityLabel}</span>
                    <span className="rounded-full border border-[var(--line)] px-3 py-1.5">{task.estimateLabel}</span>
                    <span className="rounded-full border border-[var(--line)] px-3 py-1.5">{task.dueLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    size="sm"
                    variant={task.pinned ? 'default' : 'outline'}
                    className="rounded-full px-4"
                    onClick={() => onToggleFocusTask(task.id)}
                  >
                    {task.pinned ? (locale === 'ko' ? '고정됨' : 'Pinned') : locale === 'ko' ? '고정' : 'Pin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-4"
                    onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
                  >
                    {locale === 'ko' ? '시작' : 'Start'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-5 py-6 text-sm leading-6 text-[var(--text-muted)]">
              {locale === 'ko'
                ? '아직 오늘의 핵심 작업이 없습니다. 작업을 추가하면 여기서 바로 시작할 수 있습니다.'
                : 'No top tasks yet. Add work and start it from here.'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
