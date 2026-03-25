import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { ReportMetricSurface } from './metrics'

type Locale = 'ko' | 'en'

export interface SuggestedTaskItem {
  id: string
  title: string
  priorityLabel: string
  categoryLabel: string
  detail: string
}

interface NextTaskModalProps {
  locale: Locale
  outlineBadgeClass: string
  kind: 'resume' | 'next'
  completedTaskTitle: string
  primaryTask: SuggestedTaskItem
  otherTasks: SuggestedTaskItem[]
  onClose: () => void
  onStartTask: (taskId: string) => void
}

export function NextTaskModal({
  locale,
  outlineBadgeClass,
  kind,
  completedTaskTitle,
  primaryTask,
  otherTasks,
  onClose,
  onStartTask,
}: NextTaskModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {locale === 'ko' ? '다음 작업' : 'Next up'}
        </p>
        <p className="mt-3 text-lg font-semibold text-foreground">
          {kind === 'resume'
            ? locale === 'ko'
              ? `'${completedTaskTitle}' 완료. 멈춘 작업으로 돌아갈까요?`
              : `Finished '${completedTaskTitle}'. Resume the paused task?`
            : locale === 'ko'
              ? `'${completedTaskTitle}' 완료. 다음 작업을 바로 시작할까요?`
              : `Finished '${completedTaskTitle}'. Start this next?`}
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={outlineBadgeClass}>
              {primaryTask.priorityLabel}
            </Badge>
            <Badge variant="outline" className={outlineBadgeClass}>
              {primaryTask.categoryLabel}
            </Badge>
          </div>
          <p className="mt-3 text-base font-medium text-foreground">{primaryTask.title}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{primaryTask.detail}</p>
        </div>

        {otherTasks.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{locale === 'ko' ? '다른 후보' : 'Other options'}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {otherTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onStartTask(task.id)}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-left transition-colors hover:bg-[var(--surface-soft)]"
                >
                  <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{task.detail}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {locale === 'ko' ? '나중에' : 'Later'}
          </Button>
          <Button onClick={() => onStartTask(primaryTask.id)}>
            {locale === 'ko' ? '바로 시작' : 'Start now'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface SwitchTaskModalProps {
  locale: Locale
  onSwitch: () => void
  onInterrupt: () => void
  onClose: () => void
}

export function SwitchTaskModal({ locale, onSwitch, onInterrupt, onClose }: SwitchTaskModalProps) {
  return (
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
            ? '전환은 멈춘 작업 목록에 보관되고, 끼어들기는 짧은 처리로 기록됩니다.'
            : 'Switch keeps it in the paused list. Interrupt marks it as a quick interruption.'}
        </p>

        <div className="mt-5 grid gap-2">
          <Button variant="outline" onClick={onSwitch}>
            {locale === 'ko' ? '일시정지 후 전환' : 'Pause and switch'}
          </Button>
          <Button variant="secondary" onClick={onInterrupt}>
            {locale === 'ko' ? '끼어들기 작업으로 시작' : 'Start as interruption'}
          </Button>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {locale === 'ko' ? '취소' : 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ClockOutSummaryModalProps {
  locale: Locale
  workRangeLabel: string
  focusRatioLabel: string
  workdayValue: string
  focusValue: string
  completedValue: string
  scoreValue: string
  switchValue: string
  interruptValue: string
  firstFocusValue: string
  lastFocusValue: string
  peakHourValue: string
  interpretation: string
  onClose: () => void
}

export function ClockOutSummaryModal({
  locale,
  workRangeLabel,
  focusRatioLabel,
  workdayValue,
  focusValue,
  completedValue,
  scoreValue,
  switchValue,
  interruptValue,
  firstFocusValue,
  lastFocusValue,
  peakHourValue,
  interpretation,
  onClose,
}: ClockOutSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--line)] bg-[var(--panel-strong)] p-5 shadow-2xl">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {locale === 'ko' ? '퇴근 리포트' : 'Clock-out report'}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
              {locale === 'ko' ? '오늘 근무를 마감했습니다.' : 'Workday closed.'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{workRangeLabel}</p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-300/20 bg-amber-300/10 text-amber-200">
            {focusRatioLabel}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReportMetricSurface label={locale === 'ko' ? '근무 시간' : 'Workday'} value={workdayValue} />
          <ReportMetricSurface label={locale === 'ko' ? '실집중' : 'Tracked focus'} value={focusValue} />
          <ReportMetricSurface label={locale === 'ko' ? '완료' : 'Completed'} value={completedValue} />
          <ReportMetricSurface label={locale === 'ko' ? '점수' : 'Score'} value={scoreValue} />
          <ReportMetricSurface label={locale === 'ko' ? '전환' : 'Switches'} value={switchValue} />
          <ReportMetricSurface label={locale === 'ko' ? '끼어들기' : 'Interrupts'} value={interruptValue} />
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {locale === 'ko' ? '첫 집중' : 'First focus'}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{firstFocusValue}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {locale === 'ko' ? '마지막 집중' : 'Last focus'}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{lastFocusValue}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {locale === 'ko' ? '집중 피크' : 'Peak hour'}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">{peakHourValue}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[var(--text-soft)]">{interpretation}</p>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={onClose}>{locale === 'ko' ? '닫기' : 'Close'}</Button>
        </div>
      </div>
    </div>
  )
}
