import { Badge } from '@/components/ui/badge'
import type { Locale } from '@/copy'

import { TopMetric } from '@/components/app/metrics'

export type WeeklyReviewDayItem = {
  key: string
  label: string
  completedLabel: string
  focusLabel: string
  ratioLabel: string
  scoreLabel: string
  switchLabel: string
  reflection: string
  widthPercent: number
}

export function WeeklyReviewPanel({
  locale,
  outlineBadgeClass,
  weeklyScoreTotal,
  weeklyFocusTotal,
  weeklyWorkTotal,
  weeklyCompletedTotal,
  days,
  bestFocusTitle,
  bestFocusBody,
  bestCompletionTitle,
  bestCompletionBody,
  interruptTitle,
  interruptBody,
  interpretation,
  reflections,
}: {
  locale: Locale
  outlineBadgeClass: string
  weeklyScoreTotal: string
  weeklyFocusTotal: string
  weeklyWorkTotal: string
  weeklyCompletedTotal: string
  days: WeeklyReviewDayItem[]
  bestFocusTitle: string
  bestFocusBody: string
  bestCompletionTitle: string
  bestCompletionBody: string
  interruptTitle: string
  interruptBody: string
  interpretation: string
  reflections: Array<{ key: string; label: string; text: string }>
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 xl:grid-cols-4">
        <TopMetric label={locale === 'ko' ? '주간 점수' : 'Weekly score'} value={weeklyScoreTotal} accent />
        <TopMetric label={locale === 'ko' ? '주간 실집중' : 'Tracked focus'} value={weeklyFocusTotal} />
        <TopMetric label={locale === 'ko' ? '주간 근무' : 'Workday'} value={weeklyWorkTotal} />
        <TopMetric label={locale === 'ko' ? '주간 완료' : 'Completed'} value={weeklyCompletedTotal} />
      </section>

      <section className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {locale === 'ko' ? '주간 흐름' : 'Weekly flow'}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                {locale === 'ko' ? '최근 7일의 밀도' : 'Density across the last 7 days'}
              </h3>
            </div>
            <Badge variant="outline" className={outlineBadgeClass}>
              7d
            </Badge>
          </div>

          <div className="mt-4 space-y-2">
            {days.map((day) => (
              <div
                key={day.key}
                className="grid grid-cols-[88px_minmax(0,1fr)_70px] items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{day.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{day.completedLabel}</p>
                </div>

                <div>
                  <div className="h-2 rounded-full bg-[var(--surface-soft)]">
                    <div className="h-full rounded-full bg-amber-300/85" style={{ width: `${day.widthPercent}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{day.focusLabel}</span>
                    <span>{day.ratioLabel}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--text-muted)]">
                    <span>{day.switchLabel}</span>
                    <span className="truncate pl-2">{day.reflection || (locale === 'ko' ? '메모 없음' : 'No note')}</span>
                  </div>
                </div>

                <p className="text-right font-mono text-sm text-foreground">{day.scoreLabel}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '가장 집중된 날' : 'Best focus day'}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{bestFocusTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{bestFocusBody}</p>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '가장 많이 끝낸 날' : 'Best completion day'}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{bestCompletionTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{bestCompletionBody}</p>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '흐름이 가장 흔들린 날' : 'Most interrupted day'}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{interruptTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{interruptBody}</p>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {locale === 'ko' ? '이번 주 해석' : 'Interpretation'}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{interpretation}</p>
          </div>

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {locale === 'ko' ? '최근 메모' : 'Recent reflections'}
              </p>
              <Badge variant="outline" className={outlineBadgeClass}>
                {reflections.length}
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              {reflections.length > 0 ? (
                reflections.map((reflection) => (
                  <div key={reflection.key} className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
                    <p className="text-xs text-[var(--text-muted)]">{reflection.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{reflection.text}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-3 py-4">
                  <p className="text-sm leading-6 text-[var(--text-soft)]">
                    {locale === 'ko' ? '아직 저장된 일일 메모가 없습니다.' : 'No saved daily reflections yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
