import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function SidebarMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5">
      <div className="flex size-9 items-center justify-center rounded-[13px] bg-[var(--surface-soft)] text-[var(--text-soft)]">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
        <p className="mt-1.5 font-mono text-[15px] leading-none text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function TopMetric({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border px-5 py-4.5',
        accent
          ? 'border-amber-300/24 bg-amber-300/8 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.04)]'
          : 'border-[var(--line)] bg-[var(--surface)]',
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2.5 font-mono text-[21px] leading-none text-foreground xl:text-[22px]">{value}</p>
    </div>
  )
}

export function MetricSurface({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4.5 py-3.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2.5 font-mono text-lg leading-none text-foreground">{value}</p>
    </div>
  )
}

export function ReportMetricSurface({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4.5 py-4.5',
        className,
      )}
    >
      <p className="text-[12px] leading-snug font-medium tracking-[-0.02em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-[22px] leading-none text-foreground xl:text-[24px]">{value}</p>
    </div>
  )
}

export function ComposerField({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-[11px] leading-5 text-[var(--text-muted)]">{hint}</p>
      </div>
      {children}
    </div>
  )
}
