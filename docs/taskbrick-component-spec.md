# TaskBrick Component Spec

## Goal
Translate the PRD and design system into implementation-sized UI blocks.

## AppShell
- Responsibility: own the 3-column desktop layout and stacked mobile layout.
- Slots:
  - `SidebarRail`
  - `WorkspaceColumn`
  - `InspectorRail`
- States:
  - default
  - landing route hidden
  - app route visible

## SidebarRail
- Responsibility: navigation, day snapshot, workday controls, language/theme controls.
- Blocks:
  - `BrandBlock`
  - `PrimaryNav`
  - `TodaySnapshot`
  - `WorkdayStatusCard`
  - `LocaleThemeControls`
- Rules:
  - nav actions are primary
  - stats are compact and monochrome
  - explanatory copy stays under 2 lines

## BrandBlock
- Shows product name, current mode, and short descriptor.
- Must not look like a hero card.

## PrimaryNav
- Items:
  - today
  - inbox
  - done
  - history
  - integrations
- Active item gets fill + stronger text, not oversized chrome.

## TodaySnapshot
- Compact stat strip for:
  - score
  - combo
  - focus time
  - remaining tasks
- Use `SidebarMetric` rows, not large cards.

## WorkdayStatusCard
- Primary actions:
  - clock in
  - clock out
- Secondary data:
  - work duration
  - focus ratio
  - focus vs work summary
- States:
  - off
  - active
  - just clocked out

## WorkspaceHeader
- Responsibility: date context, current view title, top controls.
- Left:
  - workspace title
  - date navigator
  - utility chips
- Right:
  - notion preview
  - clear all
  - reset

## TopMetricStrip
- Metrics:
  - score
  - high score
  - focus time
  - level
- Layout:
  - 4 equal tiles desktop
  - 2x2 mobile
- Style:
  - low chrome
  - mono values
  - first tile can take soft accent

## TaskList
- Responsibility: search, filter, scroll container, empty state.
- Blocks:
  - `TaskFilters`
  - `TaskRows`
  - `EmptyState`

## TaskRow
- Desktop layout:
  - col 1: title, tags, note, meta
  - col 2: score and estimate summary
  - col 3: start controls
  - col 4: complete / delete
- Mobile layout:
  - stack in order: title, meta, start block, support actions
- States:
  - todo
  - active
  - done
  - interrupt
- Rules:
  - start is primary
  - complete is secondary when not active
  - delete is icon-only or tertiary ghost
  - custom time must read as an alternate start mode

## ComposerBar
- Responsibility: rapid task creation.
- Blocks:
  - title input
  - estimate control
  - priority select
  - horizon control
  - submit button
  - current config summary
- Interaction:
  - enter submits
  - presets quickly update estimate
  - labels are small and explanatory

## FocusInspector
- Responsibility: active task state.
- Blocks:
  - active task header
  - timer metrics
  - progress bar
  - pause / complete / stop / extend
- States:
  - idle
  - active
  - paused

## PausedTaskList
- Shows up to 3 paused tasks.
- Order:
  - interruptions first
  - most recently paused next
- Actions:
  - resume
  - optional dismiss later

## DailyReportPanel
- Responsibility: compact same-day insight in inspector.
- Metrics:
  - focus time
  - on-time completions
  - overtime count
  - switches
  - interrupts
- Secondary:
  - highlights list
  - completion summary

## FocusByHourPanel
- Responsibility: show actual tracked focus pattern by hour.
- Blocks:
  - first focus
  - last focus
  - tracked focus total
  - hour bars
- Empty state must explain that only timer-started work counts.

## NextTaskPromptModal
- Responsibility: after completion, help the user continue.
- Content:
  - completed task summary
  - up to 3 suggested next tasks
  - resume paused task when relevant
- Actions:
  - start suggestion
  - later

## TaskSwitchModal
- Responsibility: make switching explicit without punishing it.
- Actions:
  - pause and switch
  - start as interruption
  - cancel

## ClockOutReportModal
- Responsibility: close the day.
- Required blocks:
  - score + focus ratio
  - work time vs focus time
  - completed count
  - switches / interrupts
  - first / last / peak focus
  - plain-language interpretation

## Immediate Redesign Scope
### Must redesign now
- AppShell
- SidebarRail
- WorkspaceHeader
- TopMetricStrip
- TaskRow
- ComposerBar
- FocusInspector
- DailyReportPanel

### Can stay structurally similar for now
- NextTaskPromptModal
- TaskSwitchModal
- ClockOutReportModal
- FocusByHourPanel

## Acceptance Criteria
- The app reads like a calm scheduling SaaS, not a gamified prototype.
- The next action is visible in under 2 seconds.
- Task rows scan left-to-right without visual clutter.
- The right rail no longer feels text-cramped on desktop.
- Light and dark themes both preserve the same hierarchy.
