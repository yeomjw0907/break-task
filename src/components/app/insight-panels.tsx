import { Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import { MetricSurface, ReportMetricSurface } from './metrics'

type Locale = 'ko' | 'en'

export interface HourFocusItem {
  hour: number
  seconds: number
}

export interface CompletionFeedItem {
  id: string
  title: string
  meta: string
  statusLabel: string
}

interface TodayReportPanelProps {
  shellCardClass: string
  title: string
  sentence: string
  focusMinutesLabel: string
  onTimeLabel: string
  overtimeLabel: string
  switchLabel: string
  interruptLabel: string
  focusValue: string
  onTimeValue: string
  overtimeValue: string
  switchValue: string
  interruptValue: string
  reportItems: string[]
}

export function TodayReportPanel({
  shellCardClass,
  title,
  sentence,
  focusMinutesLabel,
  onTimeLabel,
  overtimeLabel,
  switchLabel,
  interruptLabel,
  focusValue,
  onTimeValue,
  overtimeValue,
  switchValue,
  interruptValue,
  reportItems,
}: TodayReportPanelProps) {
  return (
    <Card className={shellCardClass}>
      <CardHeader className="border-b border-[var(--line)] pb-4">
        <CardTitle className="text-lg font-semibold tracking-[-0.04em]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--text-soft)]">
          {sentence}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <ReportMetricSurface label={focusMinutesLabel} value={focusValue} />
          <ReportMetricSurface label={onTimeLabel} value={onTimeValue} />
          <ReportMetricSurface label={overtimeLabel} value={overtimeValue} />
          <ReportMetricSurface label={switchLabel} value={switchValue} />
          <ReportMetricSurface className="sm:col-span-2" label={interruptLabel} value={interruptValue} />
        </div>

        <Separator />

        <ul className="space-y-2 text-sm text-[var(--text-soft)]">
          {reportItems.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface FocusByHourPanelProps {
  locale: Locale
  shellCardClass: string
  title: string
  description: string
  firstFocusLabel: string
  firstFocusValue: string
  lastFocusLabel: string
  lastFocusValue: string
  trackedLabel: string
  trackedValue: string
  activeHours: HourFocusItem[]
  emptyText: string
}

export function FocusByHourPanel({
  shellCardClass,
  title,
  description,
  firstFocusLabel,
  firstFocusValue,
  lastFocusLabel,
  lastFocusValue,
  trackedLabel,
  trackedValue,
  activeHours,
  emptyText,
}: FocusByHourPanelProps) {
  return (
    <Card className={shellCardClass}>
      <CardHeader className="border-b border-[var(--line)] pb-4">
        <CardTitle className="text-lg font-semibold tracking-[-0.04em]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricSurface label={firstFocusLabel} value={firstFocusValue} />
          <MetricSurface label={lastFocusLabel} value={lastFocusValue} />
          <MetricSurface label={trackedLabel} value={trackedValue} />
        </div>

        {activeHours.length > 0 ? (
          <div className="space-y-2">
            {activeHours.map(({ hour, seconds }) => {
              const width = Math.max(12, Math.round((seconds / 3600) * 100))

              return (
                <div key={hour} className="grid grid-cols-[44px_minmax(0,1fr)_56px] items-center gap-3">
                  <span className="font-mono text-xs text-[var(--text-muted)]">{hour.toString().padStart(2, '0')}:00</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div
                      className="h-full rounded-full bg-amber-300/80"
                      style={{ width: `${Math.min(width, 100)}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-xs text-foreground">
                    {Math.max(1, Math.ceil(seconds / 60))}m
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CompletionFeedPanelProps {
  shellCardClass: string
  title: string
  items: CompletionFeedItem[]
  emptyText: string
  outlineBadgeClass: string
}

export function CompletionFeedPanel({
  shellCardClass,
  title,
  items,
  emptyText,
  outlineBadgeClass,
}: CompletionFeedPanelProps) {
  return (
    <Card className={shellCardClass}>
      <CardHeader className="border-b border-[var(--line)] pb-4">
        <CardTitle className="text-lg font-semibold tracking-[-0.04em]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 pt-4">
        <ScrollArea className="h-[320px] pr-3">
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{item.meta}</p>
                    </div>
                    <Badge variant="outline" className={outlineBadgeClass}>
                      {item.statusLabel}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
                {emptyText}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
