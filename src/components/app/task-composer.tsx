import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

import { ComposerField } from './metrics'

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
  draftPriority,
  effectiveDraftPriority,
  draftHorizon,
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
      className="grid w-full gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      <div className="flex flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-3 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--text-muted)] uppercase">
            {locale === 'ko' ? '작업 제목' : 'Task'}
          </p>
          <Input
            value={draftTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={locale === 'ko' ? '다음 할 일을 한 줄로 입력' : 'Write the next task in one line'}
            className="h-12 rounded-[16px] border-[var(--line)] bg-[var(--surface-soft)] px-4 text-base"
          />
        </div>

        <Button type="submit" className="h-12 rounded-[16px] px-6 md:min-w-30">
          {addTaskLabel}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[160px_180px_minmax(0,1fr)]">
        <ComposerField
          label={locale === 'ko' ? '예상 시간' : 'Estimate'}
          hint={locale === 'ko' ? '집중할 시간' : 'Focus window'}
        >
          <div className="space-y-2 rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base text-foreground">
                +{effectiveDraftMinutes.toString().padStart(3, '0')}
              </span>
              <span className="text-sm text-[var(--text-muted)]">{locale === 'ko' ? '분' : 'min'}</span>
              <Input
                type="number"
                min={5}
                max={240}
                step={5}
                value={draftMinutes}
                onChange={(event) => onMinutesChange(Number(event.target.value))}
                className="ml-auto h-8 w-20 border-0 bg-transparent px-0 text-right font-mono shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[15, 25, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onMinutesChange(minutes)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    draftMinutes === minutes
                      ? 'border-amber-300/30 bg-amber-300/12 text-amber-200'
                      : 'border-[var(--line)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]',
                  )}
                >
                  +{minutes}
                  {locale === 'ko' ? '분' : 'm'}
                </button>
              ))}
            </div>
          </div>
        </ComposerField>

        <ComposerField
          label={locale === 'ko' ? '우선순위' : 'Priority'}
          hint={locale === 'ko' ? '점수 가중치' : 'Scoring weight'}
        >
          <Select value={draftPriority} onValueChange={(value) => onPriorityChange(value as TaskPriority)}>
            <SelectTrigger className="h-[54px] rounded-[16px] border-[var(--line)] bg-[var(--surface-soft)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {getPriorityOptionLabel(priority, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ComposerField>

        <ComposerField
          label={locale === 'ko' ? '처리 시점' : 'When'}
          hint={locale === 'ko' ? '오늘 처리할지 선택' : 'Today or later'}
        >
          <div className="grid grid-cols-3 gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] p-1.5">
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
                  'rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                  draftHorizon === value
                    ? 'bg-amber-300 text-zinc-950'
                    : 'text-[var(--text-soft)] hover:bg-[var(--surface-soft)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </ComposerField>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
          {locale === 'ko' ? '예상 시간' : 'Estimate'} · {effectiveDraftMinutes}
          {locale === 'ko' ? '분' : 'm'}
        </span>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
          {locale === 'ko' ? '우선순위' : 'Priority'} · {getPriorityLabel(effectiveDraftPriority, locale)}
        </span>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
          {locale === 'ko' ? '처리 시점' : 'When'} ·{' '}
          {locale === 'ko'
            ? effectiveDraftHorizon === 'today'
              ? '오늘'
              : effectiveDraftHorizon === 'tomorrow'
                ? '내일'
                : '나중'
            : effectiveDraftHorizon === 'today'
              ? 'Today'
              : effectiveDraftHorizon === 'tomorrow'
                ? 'Tomorrow'
                : 'Later'}
        </span>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1">
          {locale === 'ko' ? 'Enter로 바로 추가' : 'Press Enter to add'}
        </span>
      </div>

      <div className="space-y-1 text-xs text-[var(--text-muted)]">
        <p>{getPriorityHint(effectiveDraftPriority, locale)}</p>
        <p>{locale === 'ko' ? '예: 내일 45분 중요 제안서 정리' : 'Example: tomorrow 45m high proposal cleanup'}</p>
      </div>
    </form>
  )
}
