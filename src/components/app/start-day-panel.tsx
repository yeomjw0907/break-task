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
  onClockIn,
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
  onClockIn: () => void
  onStartTimer: (taskId: string, estimatedMinutes: number) => void
  onToggleFocusTask: (taskId: string) => void
  onChangeBudget: (minutes: number) => void
}) {
  const isOverBudget = budgetDeltaMinutes < 0
  const recommendedTask = tasks[0] ?? null

  return (
    <section className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Start Day</p>
          <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-foreground xl:text-[22px]">
            {locale === 'ko' ? '오늘 시작 루틴' : 'Start the day with intent'}
          </h3>
          <p className="mt-2 max-w-[32rem] text-sm leading-6 text-[var(--text-soft)]">
            {locale === 'ko'
              ? '중요 작업 3개와 근무 예산을 먼저 잡아두면, 하루가 흩어져도 다시 돌아오기 쉽습니다.'
              : 'Set the top work and the time budget before the day fragments.'}
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {locale === 'ko' ? '근무 예산' : 'Work budget'}
                </p>
                <p className="mt-2 font-mono text-[24px] leading-none text-foreground">{plannedWorkMinutes}m</p>
              </div>
              <div className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-right text-sm text-[var(--text-soft)]">
                <p>{locale === 'ko' ? `예정 ${selectedOpenMinutes}m` : `Planned ${selectedOpenMinutes}m`}</p>
                <p className={isOverBudget ? 'mt-1 font-medium text-red-300' : 'mt-1 font-medium text-emerald-300'}>
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
            <Progress value={budgetProgress} className="mt-4" />
            <div className="mt-4 flex flex-wrap gap-2">
              {[240, 360, 480, 600].map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={plannedWorkMinutes === minutes ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => onChangeBudget(minutes)}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {locale === 'ko' ? '오늘 체크리스트' : 'Ritual checklist'}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
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
                <div className="flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                  <span>{locale === 'ko' ? '고정 작업' : 'Pinned anchors'}</span>
                  <span className="font-mono text-foreground">{pinnedCount}/3</span>
                </div>
                <div className="flex items-center justify-between rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                  <span>{locale === 'ko' ? '첫 작업 후보' : 'First move'}</span>
                  <span className="text-[var(--text-soft)]">{recommendedTask ? recommendedTask.estimateLabel : '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onClockIn} disabled={activeWorkSession} className="rounded-[18px]">
            {locale === 'ko' ? '출근하고 시작' : 'Clock in'}
          </Button>
          {tasks[0] ? (
            <Button
              variant="outline"
              className="rounded-[18px]"
              onClick={() => onStartTimer(tasks[0].id, tasks[0].estimatedMinutes)}
            >
              {locale === 'ko' ? '첫 작업 바로 시작' : 'Start first task'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '오늘의 핵심 3개' : 'Top 3 today'}
            </p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              {locale === 'ko' ? '오늘을 붙잡아둘 작업만 남기고 바로 시작합니다.' : 'Keep only the tasks that should anchor the day.'}
            </p>
          </div>
          <Badge variant="outline" className={outlineBadgeClass}>
            {tasks.length}
          </Badge>
        </div>

        {recommendedTask ? (
          <div className="rounded-[18px] border border-amber-300/20 bg-amber-300/8 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200">
              {locale === 'ko' ? '바로 시작할 작업' : 'Recommended first move'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{recommendedTask.title}</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {recommendedTask.priorityLabel} · {recommendedTask.estimateLabel}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => onStartTimer(recommendedTask.id, recommendedTask.estimatedMinutes)}
              >
                {locale === 'ko' ? '바로 시작' : 'Start now'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <div
                key={task.id}
                className="grid gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--text-muted)]">0{index + 1}</span>
                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{task.priorityLabel}</span>
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{task.estimateLabel}</span>
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{task.dueLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={task.pinned ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => onToggleFocusTask(task.id)}
                  >
                    {task.pinned ? (locale === 'ko' ? '고정됨' : 'Pinned') : locale === 'ko' ? '고정' : 'Pin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
                  >
                    {locale === 'ko' ? '시작' : 'Start'}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--text-muted)]">
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
