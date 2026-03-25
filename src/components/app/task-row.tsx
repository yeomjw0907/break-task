import { LoaderCircle, Play, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getCategoryLabel,
  getPriorityLabel,
  getSourceLabel,
  getStatusLabel,
  getTaskTitle,
  type Locale,
  uiCopy,
} from '@/copy'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

function getStatusProgress(task: Task, isActive: boolean) {
  if (task.status === 'done') return 100
  if (isActive || task.status === 'in_progress') return 64
  if (task.priority === 'critical') return 28
  if (task.priority === 'high') return 18
  return 8
}

export function TaskRow({
  task,
  locale,
  isActive,
  onStartTimer,
  onComplete,
  onDelete,
  dueLabel,
  outlineBadgeClass,
}: {
  task: Task
  locale: Locale
  isActive: boolean
  onStartTimer: (taskId: string, estimatedMinutes: number) => void
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  dueLabel: string
  outlineBadgeClass: string
}) {
  const copy = uiCopy[locale]
  const progress = getStatusProgress(task, isActive)

  return (
    <div
      className={cn(
        'group grid gap-4 rounded-[28px] border px-5 py-5 transition-colors xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_88px] xl:items-center xl:px-6 xl:py-5',
        isActive
          ? 'border-sky-400/24 bg-sky-400/6 shadow-[0_12px_30px_rgba(56,189,248,0.08)]'
          : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]',
      )}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-[16px] border text-sm font-semibold',
              isActive
                ? 'border-sky-400/25 bg-sky-400/12 text-sky-300'
                : 'border-[var(--line)] bg-[var(--panel-strong)] text-[var(--text-soft)]',
            )}
          >
            {task.category.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="truncate text-[20px] font-semibold tracking-[-0.035em] text-foreground">
                {getTaskTitle(task, locale)}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  outlineBadgeClass,
                  task.priority === 'critical' && 'border-rose-400/30 bg-rose-400/10 text-rose-300',
                  task.priority === 'high' && 'border-sky-400/25 bg-sky-400/10 text-sky-300',
                )}
              >
                {getPriorityLabel(task.priority, locale)}
              </Badge>
              {isActive ? (
                <Badge className="bg-sky-400/12 text-sky-300 shadow-none">
                  <LoaderCircle className="mr-1.5 size-3 animate-spin" />
                  {copy.workingNow}
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
              <span>{getCategoryLabel(task.category, locale)}</span>
              <span>{locale === 'ko' ? `예상 ${task.estimatedMinutes}분` : `${task.estimatedMinutes}m estimate`}</span>
              <span>{dueLabel}</span>
              <span>{getStatusLabel(task.status, locale)}</span>
              <span>{locale === 'ko' ? `${task.points}점` : `${task.points} pts`}</span>
              {task.tags.includes('interrupt') ? (
                <span className="text-amber-300">{locale === 'ko' ? '끼어들기' : 'Interrupt'}</span>
              ) : null}
              {task.source !== 'manual' ? <span>{getSourceLabel(task.source, locale)}</span> : null}
            </div>

            {task.notes ? (
              <p className="mt-3 line-clamp-1 text-sm leading-6 text-[var(--text-muted)]">{task.notes}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:gap-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <span>{locale === 'ko' ? '진행률' : 'Progress'}</span>
          <span className="font-mono text-[12px] text-foreground">{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--panel-strong)]">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              task.priority === 'critical'
                ? 'bg-rose-400'
                : task.priority === 'high'
                  ? 'bg-sky-400'
                  : task.priority === 'medium'
                    ? 'bg-violet-400'
                    : 'bg-zinc-500',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-[var(--text-soft)]">
          <span>{locale === 'ko' ? '집중 시작' : 'Focus session'}</span>
          <span className="font-mono text-[15px] text-foreground">{task.estimatedMinutes.toString().padStart(2, '0')}m</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {task.status !== 'done' ? (
          <>
            <Button
              type="button"
              size="icon"
              className={cn(
                'size-12 rounded-full shadow-[0_12px_24px_rgba(56,189,248,0.2)]',
                isActive && 'bg-sky-500 hover:bg-sky-500',
              )}
              onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
              aria-label={locale === 'ko' ? '집중 시작' : 'Start focus'}
            >
              {isActive ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="ml-0.5 size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              onClick={() => onDelete(task.id)}
              aria-label={copy.deleteTask}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" className="rounded-full px-4" onClick={() => onComplete(task.id)}>
            {copy.completeTask}
          </Button>
        )}
      </div>
    </div>
  )
}
