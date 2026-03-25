import { useState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getCategoryLabel,
  getPriorityLabel,
  getSourceLabel,
  getStatusLabel,
  getTaskTitle,
  type Locale,
  uiCopy,
} from '@/copy'
import type { Task } from '@/types'
import { cn } from '@/lib/utils'

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
  const [customMinutes, setCustomMinutes] = useState(task.estimatedMinutes)

  return (
    <div
      className={cn(
        'group grid gap-3 rounded-[22px] border px-4 py-4 transition-colors xl:grid-cols-[minmax(0,1fr)_146px_250px]',
        isActive
          ? 'border-amber-300/22 bg-amber-300/6'
          : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]',
      )}
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline" className={outlineBadgeClass}>
            {getSourceLabel(task.source, locale)}
          </Badge>
          <Badge variant="outline" className={outlineBadgeClass}>
            {getCategoryLabel(task.category, locale)}
          </Badge>
          <Badge variant="outline" className={outlineBadgeClass}>
            {getPriorityLabel(task.priority, locale)}
          </Badge>
          {task.tags.includes('interrupt') ? (
            <Badge variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-200">
              {locale === 'ko' ? '끼어들기' : 'Interrupt'}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isActive ? <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" /> : null}
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground xl:text-base">
            {getTaskTitle(task, locale)}
          </p>
          {isActive ? (
            <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] font-medium text-amber-200">
              {copy.workingNow}
            </span>
          ) : null}
        </div>

        {task.notes ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">{task.notes}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">
            {copy.estimate} {task.estimatedMinutes}m
          </span>
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">{dueLabel}</span>
          <span className="rounded-full border border-[var(--line)] px-2.5 py-1">
            {getStatusLabel(task.status, locale)}
          </span>
        </div>
      </div>

      <div className="grid content-start gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {locale === 'ko' ? '예상 보상' : 'Reward'}
        </p>
        <p className="font-mono text-[20px] leading-none text-foreground">+{task.points}</p>
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          {getPriorityLabel(task.priority, locale)} · {task.estimatedMinutes}m
        </p>
      </div>

      <div className="grid gap-2.5 rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] p-3">
        {task.status !== 'done' ? (
          <>
            <Button
              variant={isActive ? 'secondary' : 'default'}
              className="h-11 justify-between rounded-[16px] px-4 text-sm font-semibold"
              onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
            >
              <span>{locale === 'ko' ? '시작' : 'Start'}</span>
              <span className="font-mono text-sm">{task.estimatedMinutes}m</span>
            </Button>

            <div className="grid grid-cols-[76px_1fr] gap-2">
              <Input
                type="number"
                min={5}
                max={240}
                step={5}
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Number(event.target.value))}
                className="h-10 rounded-[14px] border-[var(--line)] bg-[var(--surface)] text-center font-mono"
              />
              <Button
                variant="outline"
                className="h-10 rounded-[14px]"
                onClick={() => onStartTimer(task.id, Math.max(5, customMinutes))}
              >
                {locale === 'ko' ? `${customMinutes}분` : `${customMinutes}m`}
              </Button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
              <Button variant="outline" className="h-10 rounded-[14px]" onClick={() => onComplete(task.id)}>
                {copy.completeTask}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-[14px] opacity-30 transition-opacity hover:opacity-100 group-hover:opacity-60"
                onClick={() => onDelete(task.id)}
                aria-label={copy.deleteTask}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 py-4 text-center text-xs text-[var(--text-muted)]">
            {copy.completeTask}
          </div>
        )}
      </div>
    </div>
  )
}
