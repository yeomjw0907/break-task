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
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

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
        'group grid gap-4 rounded-[24px] border px-5 py-5 transition-colors xl:grid-cols-[minmax(0,1fr)_148px_278px] xl:px-6 xl:py-6',
        isActive
          ? 'border-amber-300/22 bg-amber-300/6'
          : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]',
      )}
    >
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2">
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

        <div className="flex items-center gap-2.5">
          {isActive ? <LoaderCircle className="size-4 shrink-0 animate-spin text-amber-300" /> : null}
          <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground xl:text-[17px]">
            {getTaskTitle(task, locale)}
          </p>
          {isActive ? (
            <span className="rounded-full bg-amber-300/12 px-2.5 py-1 text-[10px] font-medium text-amber-200">
              {copy.workingNow}
            </span>
          ) : null}
        </div>

        {task.notes ? (
          <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--text-muted)]">{task.notes}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2.5 text-xs text-[var(--text-muted)]">
          <span className="rounded-full border border-[var(--line)] px-3 py-1.5">
            {copy.estimate} {task.estimatedMinutes}m
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1.5">{dueLabel}</span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1.5">
            {getStatusLabel(task.status, locale)}
          </span>
        </div>
      </div>

      <div className="grid content-start gap-2.5 rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {locale === 'ko' ? '예상 보상' : 'Reward'}
        </p>
        <p className="font-mono text-[20px] leading-none text-foreground xl:text-[22px]">+{task.points}</p>
        <p className="text-xs leading-6 text-[var(--text-muted)]">
          {getPriorityLabel(task.priority, locale)} · {task.estimatedMinutes}m
        </p>
      </div>

      <div className="grid gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
        {task.status !== 'done' ? (
          <>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <span>{locale === 'ko' ? '실행' : 'Run'}</span>
              <span>{locale === 'ko' ? '기본 시간' : 'Default'}</span>
            </div>
            <Button
              variant={isActive ? 'secondary' : 'default'}
              className="h-11 justify-between rounded-[16px] px-4 text-sm font-semibold"
              onClick={() => onStartTimer(task.id, task.estimatedMinutes)}
            >
              <span>{locale === 'ko' ? '시작' : 'Start'}</span>
              <span className="font-mono text-sm">{task.estimatedMinutes}m</span>
            </Button>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {locale === 'ko' ? '직접 시간' : 'Custom time'}
              </p>
              <div className="grid grid-cols-[84px_1fr] gap-2.5">
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
                  {locale === 'ko' ? `${customMinutes}분 시작` : `${customMinutes}m start`}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2.5 pt-1">
              <Button variant="outline" className="h-10 rounded-[14px]" onClick={() => onComplete(task.id)}>
                {copy.completeTask}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-[14px] opacity-25 transition-opacity hover:opacity-100 group-hover:opacity-55"
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
