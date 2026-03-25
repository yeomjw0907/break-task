import { CheckCircle2, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Locale = 'ko' | 'en'

export interface PausedTaskItem {
  taskId: string
  title: string
  elapsedLabel: string
  modeLabel: string
}

interface FocusSidebarProps {
  locale: Locale
  shellCardClass: string
  outlineBadgeClass: string
  timerTitle: string
  runningNow: string
  stateIdle: string
  activeTimerLabel: string
  workingNow: string
  timerIdleBody: string
  estimateLabel: string
  elapsedLabel: string
  pauseLabel: string
  resumeLabel: string
  extendLabel: string
  finishLabel: string
  activeTaskTitle: string | null
  activeTimerPaused: boolean
  timerTone: string
  progress: number
  estimateClock: string
  elapsedClock: string
  remainingClock: string
  pausedTasks: PausedTaskItem[]
  onTogglePause: () => void
  onExtend: () => void
  onComplete: () => void
  onStop: () => void
  onResumePaused: (taskId: string) => void
  onRemovePaused: (taskId: string) => void
}

export function FocusSidebar({
  locale,
  shellCardClass,
  outlineBadgeClass,
  timerTitle,
  runningNow,
  stateIdle,
  activeTimerLabel,
  workingNow,
  timerIdleBody,
  estimateLabel,
  elapsedLabel,
  pauseLabel,
  resumeLabel,
  extendLabel,
  finishLabel,
  activeTaskTitle,
  activeTimerPaused,
  timerTone,
  estimateClock,
  elapsedClock,
  remainingClock,
  pausedTasks,
  onTogglePause,
  onExtend,
  onComplete,
  onStop,
  onResumePaused,
  onRemovePaused,
}: FocusSidebarProps) {
  return (
    <Card className={shellCardClass}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-[12px] font-semibold tracking-[0.22em] text-[var(--text-soft)] uppercase">
            {locale === 'ko' ? '포커스 엔진' : 'Focus Engine'}
          </CardTitle>
          <Badge variant="outline" className={outlineBadgeClass}>
            {activeTaskTitle ? runningNow : stateIdle}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] px-5 py-5">
          {activeTaskTitle ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">{activeTimerLabel}</p>
                  <p className="line-clamp-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {activeTaskTitle}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">{workingNow}</p>
                </div>
                <Badge className="bg-sky-400/12 text-sky-300 shadow-none">{timerTone}</Badge>
              </div>

              <div className="mt-5">
                <p className="font-mono text-[52px] leading-none tracking-[-0.06em] text-foreground">{remainingClock}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{elapsedLabel}</p>
                    <p className="mt-2 font-mono text-[20px] leading-none text-foreground">{elapsedClock}</p>
                  </div>
                  <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{estimateLabel}</p>
                    <p className="mt-2 font-mono text-[20px] leading-none text-foreground">{estimateClock}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_60px] gap-3">
                <Button
                  type="button"
                  className="h-14 rounded-[20px] bg-sky-500 text-base font-semibold hover:bg-sky-500/90"
                  onClick={onTogglePause}
                >
                  {activeTimerPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  {activeTimerPaused ? resumeLabel : pauseLabel}
                </Button>
                <Button type="button" variant="secondary" className="h-14 rounded-[20px]" onClick={onStop}>
                  <Square className="size-4" />
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="rounded-[18px]" onClick={onExtend}>
                  {extendLabel}
                </Button>
                <Button type="button" variant="outline" className="rounded-[18px]" onClick={onComplete}>
                  <CheckCircle2 className="size-4" />
                  {finishLabel}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">{timerTitle}</p>
              <p className="font-mono text-[48px] leading-none tracking-[-0.06em] text-foreground">00:00</p>
              <p className="text-sm leading-6 text-[var(--text-muted)]">{timerIdleBody}</p>
            </div>
          )}
        </div>

        {pausedTasks.length > 0 ? (
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                {locale === 'ko' ? '멈춘 작업' : 'Paused tasks'}
              </p>
              <Badge variant="outline" className={outlineBadgeClass}>
                {pausedTasks.length}
              </Badge>
            </div>

            <div className="mt-3 space-y-2.5">
              {pausedTasks.slice(0, 3).map((task) => (
                <div
                  key={task.taskId}
                  className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {task.elapsedLabel} · {task.modeLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => onResumePaused(task.taskId)}>
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => onRemovePaused(task.taskId)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
