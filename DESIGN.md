# Design System — TaskBrick

## Product Context
- What this is: `TaskBrick` is a workday truth layer for desk workers. It helps users start the day, execute real work, and close the day with proof.
- Who it's for: freelancers, solo founders, operators, marketers, planners, and desk workers with fragmented schedules.
- Space: productivity SaaS, daily planning, focus tracking, workday reflection.
- Project type: web app first, dashboard-like workspace with a lightweight landing surface.

## Visual Thesis
TaskBrick should feel like a quiet operations console with a warm reward edge: more Linear and Sunsama than game UI, but with sharper completion feedback.

## Product Principles
1. Orientation first: the user should always know what day they are on, what is active, and what is next.
2. Truth over theater: work time and focus time are shown honestly, without decorative hype.
3. Reward at the edge: excitement appears on completion, not as constant noise.
4. Calm density: the UI can be information-dense, but it must scan quickly and feel controlled.
5. No decorative cards: a surface earns a card only when it groups a real interaction.

## Reference Direction
- Linear: restrained spacing, low-chrome shell, high scan speed.
- Sunsama: day-based workflow and calm planning tone.
- Superlist: refined composer and soft hierarchy around input.
- Motion: time context and scheduling relevance, but less aggressive visually.

## Aesthetic Direction
- Direction: industrial editorial productivity
- Decoration level: intentional, not expressive
- Mood: focused, composed, analytical, quietly premium
- What it should never feel like: playful RPG, neon gamer UI, startup gradient demo, dashboard card mosaic

## Typography
- Display / headings: `Pretendard Variable`
- Body / UI: `Pretendard Variable`
- Metrics / timers / numeric surfaces: `IBM Plex Mono`
- Font strategy:
  - headings use tighter tracking and stronger weight
  - utility labels use small uppercase or compact sentence case
  - timers, score, durations, and counts always use mono

## Type Scale
- display-1: 56 / 0.96 / 700 / -0.06em
- display-2: 40 / 0.98 / 650 / -0.05em
- title-1: 28 / 1.05 / 650 / -0.04em
- title-2: 20 / 1.15 / 600 / -0.03em
- body-1: 15 / 1.6 / 500 / -0.01em
- body-2: 13 / 1.55 / 500 / -0.005em
- label-1: 11 / 1.2 / 600 / 0.12em
- metric-1: 28 / 1.0 / 600 / -0.05em
- metric-2: 18 / 1.0 / 600 / -0.04em

## Color
- Approach: restrained dark / light system with one warm accent
- Accent: amber only
- Dark mode:
  - background: deep graphite / navy-black
  - panels: layered slate
  - borders: soft graphite lines
  - text: warm near-white
- Light mode:
  - background: warm paper
  - panels: translucent ivory / stone
  - borders: cool-warm gray
  - text: ink / graphite

## Core Tokens
- background: app canvas
- panel: major grouped region
- surface: sub-surface inside a panel
- surface-soft: softer nested input or utility strip
- line: default boundary
- line-strong: emphasized boundary or active separation
- text-soft: readable supporting copy
- text-muted: labels and secondary metadata
- primary: amber action and reward accent

## Semantic Usage
- Amber: start, active focus, reward, strongest CTA
- Green: only for health or confirmed positive states when needed
- Red: destructive actions only
- Blue: rare informational emphasis, never as second brand accent

## Spacing
- Base unit: 4px
- Density: compact-comfortable
- Scale:
  - 1: 4
  - 2: 8
  - 3: 12
  - 4: 16
  - 5: 20
  - 6: 24
  - 8: 32
  - 10: 40
  - 12: 48

## Radius
- panel-xl: 28px
- panel-lg: 24px
- surface-lg: 20px
- control-md: 16px
- pill: 999px

## Borders And Elevation
- Use borders first, shadows second
- Panels: 1 soft border + restrained blur/shadow
- Internal surfaces: border only or border + subtle fill
- Remove stacked shadows unless the layer needs depth for interaction

## Layout
- Approach: hybrid app shell
- Desktop shell:
  - left rail: 232–248px
  - primary workspace: flexible central column
  - right inspector: 400–440px
- Main content max width: 1680px
- App structure:
  - left rail for navigation and day summary
  - center for work surface
  - right for focus state and analytic side context
- Mobile:
  - stack in this order: top status, work surface, focus/analytics, navigation last or collapsed

## Motion
- Approach: intentional and restrained
- Motion rules:
  - one ambient float or pulse max on marketing surfaces
  - no idle product animations inside the app except live timers/spinners
  - completion moments may pop, but under 700ms total
- Durations:
  - micro: 80–120ms
  - short: 160–220ms
  - medium: 260–360ms
- Easing:
  - enter: ease-out
  - exit: ease-in
  - layout: ease-in-out

## Component Rules
### Sidebar
- Navigation should read as a rail, not a stack of feature cards.
- Summary metrics should stay compact and utility-first.

### Top Status Bar
- The day title is primary.
- Day chips, work time, focus time, and streak are secondary.
- Use flat metric tiles, not decorative cards.

### Task Row
- Rows should scan left to right:
  - title and tags
  - operational metadata
  - start action
  - support actions
- Delete is always tertiary.
- Start is visually stronger than complete when no timer is active.

### Composer
- Composer should feel like a command bar with supporting controls.
- Input is primary. Estimate, priority, and schedule are subordinate but visible.
- Explain fields with tiny labels, not paragraphs.

### Focus Panel
- Current work is the strongest object in the right rail.
- Time values should dominate, explanatory text should compress.
- Paused work and report metrics should feel quieter than the active timer.

## Accessibility
- Minimum tap target: 44px
- All text must maintain readable contrast in both themes
- Timer and score should not rely on color alone
- Keyboard focus must remain visible against both dark and light surfaces

## Copy Tone
- Short, operational, direct
- Prefer: `출근`, `퇴근`, `복귀`, `진행 중`, `내일로 넘기기`
- Avoid explanatory sentences where a label or status can do the job

## Anti-Patterns
- Purple gradients
- 3-column SaaS feature icon cards inside the app shell
- Thick borders everywhere
- Equal visual weight for every action
- Oversized cards for simple numbers
- Marketing copy inside the product workspace

## Component Inventory
- AppShell
- SidebarRail
- WorkdayStatusCard
- WorkspaceHeader
- TopMetricStrip
- TaskList
- TaskRow
- ComposerBar
- FocusInspector
- PausedTaskList
- DailyReportPanel
- FocusByHourPanel
- Modal: Task Switch
- Modal: Next Task Prompt
- Modal: Clock-out Report

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Position the product as a workday truth layer | Distinguishes TaskBrick from gamified todo apps |
| 2026-03-25 | Use restrained SaaS shell with amber accent only | Keeps the app quiet while preserving reward moments |
| 2026-03-25 | Use Pretendard + IBM Plex Mono | Supports Korean readability and strong metric surfaces |
