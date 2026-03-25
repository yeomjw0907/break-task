import type { FormEvent } from 'react'

import { CalendarDays, CirclePlus, Flag, TimerReset } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

type Locale = 'ko' | 'en'
type DraftHorizon = 'today' | 'tomorrow' | 'later'

interface TaskComposerProps {
  locale: Locale
  draftTitle: string
  draftMinutes: number
  effectiveDraftMinutes: number
  draftPriority: TaskPriority
  effectiveDraftPriority: TaskPriority
  draftHorizon: DraftHorizon
  effectiveDraftHorizon: DraftHorizon
  priorityOptions: TaskPriority[]
  addTaskLabel: string
  getPriorityOptionLabel: (priority: TaskPriority, locale: Locale) => string
  getPriorityLabel: (priority: TaskPriority, locale: Locale) => string
  getPriorityHint: (priority: TaskPriority, locale: Locale) => string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTitleChange: (value: string) => void
  onMinutesChange: (value: number) => void
  onPriorityChange: (value: TaskPriority) => void
  onHorizonChange: (value: DraftHorizon) => void
}

export function TaskComposer({
  locale,
  draftTitle,
  draftMinutes,
  effectiveDraftMinutes,
  effectiveDraftPriority,
  effectiveDraftHorizon,
  priorityOptions,
  addTaskLabel,
  getPriorityOptionLabel,
  getPriorityLabel,
  getPriorityHint,
  onSubmit,
  onTitleChange,
  onMinutesChange,
  onPriorityChange,
  onHorizonChange,
}: TaskComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[0_-8px_24px_rgba(7,10,18,0.12)] xl:grid-cols-[minmax(0,1fr)_120px_160px_220px_132px] xl:items-center"
    >
      <div className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
          <CirclePlus className="size-4" />
        </div>
        <Input
          value={draftTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={locale === 'ko' ? '새 브릭 추가...' : 'Add a new brick to the stack...'}
          className="h-auto border-0 bg-transparent px-0 text-base shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-0"
        />
      </div>

      <div className="flex items-center gap-2 rounded-[22px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
        <TimerReset className="size-4 text-[var(--text-muted)]" />
        <Input
          type="number"
          min={5}
          max={240}
          step={5}
          value={draftMinutes}
          onChange={(event) => onMinutesChange(Number(event.target.value))}
          className="h-auto border-0 bg-transparent px-0 text-sm font-mono shadow-none focus-visible:ring-0"
        />
        <span className="text-sm text-[var(--text-muted)]">{locale === 'ko' ? '분' : 'min'}</span>
      </div>

      <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] px-2">
        <Select value={effectiveDraftPriority} onValueChange={(value) => onPriorityChange(value as TaskPriority)}>
          <SelectTrigger className="h-12 border-0 bg-transparent px-2 shadow-none focus:ring-0">
            <div className="flex items-center gap-2">
              <Flag className="size-4 text-[var(--text-muted)]" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {getPriorityOptionLabel(priority, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-1.5">
        {([
          ['today', locale === 'ko' ? '오늘' : 'Today'],
          ['tomorrow', locale === 'ko' ? '내일' : 'Tomorrow'],
          ['later', locale === 'ko' ? '나중' : 'Later'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onHorizonChange(value)}
            className={cn(
              'rounded-[16px] px-3 py-2.5 text-sm font-medium transition-colors',
              effectiveDraftHorizon === value
                ? 'bg-sky-500 text-white shadow-[0_10px_20px_rgba(56,189,248,0.18)]'
                : 'text-[var(--text-soft)] hover:bg-[var(--surface-soft)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Button type="submit" className="h-12 rounded-[22px] bg-sky-500 px-6 text-sm font-semibold hover:bg-sky-500/90">
        {addTaskLabel}
      </Button>

      <div className="col-span-full flex flex-wrap items-center gap-2 px-1 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5">
          <TimerReset className="size-3.5" />
          {locale === 'ko' ? `집중 ${effectiveDraftMinutes}분` : `${effectiveDraftMinutes}m focus`}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5">
          <Flag className="size-3.5" />
          {getPriorityLabel(effectiveDraftPriority, locale)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5">
          <CalendarDays className="size-3.5" />
          {locale === 'ko'
            ? effectiveDraftHorizon === 'today'
              ? '오늘 처리'
              : effectiveDraftHorizon === 'tomorrow'
                ? '내일 처리'
                : '나중 처리'
            : effectiveDraftHorizon === 'today'
              ? 'For today'
              : effectiveDraftHorizon === 'tomorrow'
                ? 'For tomorrow'
                : 'For later'}
        </span>
        <span>{getPriorityHint(effectiveDraftPriority, locale)}</span>
      </div>
    </form>
  )
}
