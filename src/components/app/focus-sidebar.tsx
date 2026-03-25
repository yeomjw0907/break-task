import { CheckCircle2, LoaderCircle, Pause, Play, Square, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

import { MetricSurface } from './metrics'

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
  rightPanelHint: string
  runningNow: string
  stateIdle: string
  activeTimerLabel: string
  workingNow: string
  timerIdleTitle: string
  timerIdleBody: string
  estimateLabel: string
  elapsedLabel: string
  remainingLabel: string
  pauseLabel: string
  resumeLabel: string
  extendLabel: string
  finishLabel: string
  stopLabel: string
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
  rightPanelHint,
  runningNow,
  stateIdle,
  activeTimerLabel,
  workingNow,
  timerIdleTitle,
  timerIdleBody,
  estimateLabel,
  elapsedLabel,
  remainingLabel,
  pauseLabel,
  resumeLabel,
  extendLabel,
  finishLabel,
  stopLabel,
  activeTaskTitle,
  activeTimerPaused,
  timerTone,
  progress,
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
      <CardHeader className="border-b border-[var(--line)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold tracking-[-0.04em]">{timerTitle}</CardTitle>
            <CardDescription className="max-w-[22rem] text-[12px] leading-6">{rightPanelHint}</CardDescription>
          </div>
          <Badge variant="outline" className={outlineBadgeClass}>
            {activeTaskTitle ? runningNow : stateIdle}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {activeTaskTitle ? (
          <>
            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-soft)]">{activeTimerLabel}</p>
                  <div className="flex items-center gap-2">
                    <LoaderCircle className="size-4 animate-spin text-amber-300" />
                    <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{activeTaskTitle}</p>
                  </div>
                  <p className="text-xs text-amber-200">{workingNow}</p>
                </div>
                <Badge className="bg-[var(--surface-soft)] text-foreground">{timerTone}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{runningNow}</span>
                <span>{Math.min(Math.round(progress), 100)}%</span>
              </div>
              <Progress value={progress} className="mt-2" />

              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <MetricSurface label={estimateLabel} value={estimateClock} />
                <MetricSurface label={elapsedLabel} value={elapsedClock} />
                <MetricSurface label={remainingLabel} value={remainingClock} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onTogglePause}>
                {activeTimerPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                {activeTimerPaused ? resumeLabel : pauseLabel}
              </Button>
              <Button variant="outline" onClick={onExtend}>
                {extendLabel}
              </Button>
              <Button onClick={onComplete}>
                <CheckCircle2 className="size-3.5" />
                {finishLabel}
              </Button>
              <Button variant="secondary" onClick={onStop}>
                <Square className="size-3.5" />
                {stopLabel}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="font-medium text-foreground">{timerIdleTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{timerIdleBody}</p>
          </div>
        )}

        {pausedTasks.length > 0 ? (
          <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{locale === 'ko' ? '멈춘 작업' : 'Paused tasks'}</p>
              <Badge variant="outline" className={outlineBadgeClass}>
                {pausedTasks.length}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              {pausedTasks.slice(0, 3).map((task) => (
                <div
                  key={task.taskId}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {task.elapsedLabel} / {task.modeLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => onResumePaused(task.taskId)}>
                      {locale === 'ko' ? '복귀' : 'Resume'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onRemovePaused(task.taskId)}>
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
  )
}
