# TaskBrick Screen PRD

## Product Frame

TaskBrick is a `workday truth layer`.

The product is designed around a single daily arc:

- start the workday
- execute real tasks
- manage fragmentation
- close the workday with clarity

The core screens below should support that arc directly.

## Shared Product Rules

### Must be true across all screens

- the next action should always be obvious
- active work should always be visible
- the difference between `workday time` and `focus time` should remain clear
- interruption and switching should be treated as normal work patterns, not failure
- reward UI should support action, not dominate the interface

### Global Objects

- `Work Session`
  - clock in time
  - clock out time
  - workday duration

- `Task`
  - title
  - priority
  - estimate
  - status
  - due date
  - tags

- `Focus Session`
  - task id
  - started at
  - ended at
  - duration

- `Flow Event`
  - switch
  - interrupt
  - resume

## Screen 1: Start Day

### Goal

Give the user a clear beginning to the day.

### User Problem

Users often open their laptop and drift into reactive work.
This screen should create intention before the day fragments.

### Primary Actions

- clock in
- choose top 3 priorities
- set work budget for the day
- choose first task to start

### Required Data

- current date
- current time
- clock-in state
- available tasks for today
- selected top 3 tasks
- planned work budget

### Core UI Blocks

- `Clock in` action
- `Today top 3` selector
- `Planned work budget`
- `Most important task`
- quick start button

### Success State

- the user has clocked in
- top 3 are set
- work budget is visible
- one clear first action exists

### Empty / Failure State

- no tasks available for today
- work budget not set
- user clocks in but does not choose any task

### Notes

- keep this screen short and ritual-like
- do not turn it into a planning suite

## Screen 2: Today Board

### Goal

Help users scan, choose, and execute today's work without friction.

### User Problem

Users know they have many things to do, but cannot quickly see what matters now.

### Primary Actions

- add task
- edit estimate
- adjust priority
- start task
- complete task
- delete task
- filter tasks
- choose next task

### Required Data

- task title
- estimate
- priority
- due date
- score value
- task state
- interruption tag
- active task id

### Core UI Blocks

- task list
- row-level start action
- quick add composer
- filter/search controls
- estimate and priority indicators

### Success State

- users can see remaining work at a glance
- active and inactive tasks are clearly separated
- adding a task is faster than opening another tool

### Empty / Failure State

- zero tasks
- filters hide all tasks
- malformed task input
- no visible next action

### Notes

- this screen should optimize for scan speed
- status labels must be instantly understandable

## Screen 3: Focus Console

### Goal

Keep the user attached to one active task while allowing realistic switching.

### User Problem

Users lose momentum because they interrupt themselves or get interrupted, then fail to return.

### Primary Actions

- start timer
- pause
- resume
- stop
- complete
- extend by +10m
- switch to another task
- treat a task as interruption
- resume paused task

### Required Data

- current task
- estimate
- elapsed time
- remaining time
- active focus segment
- paused task list
- interruption count
- switch count

### Core UI Blocks

- active task card
- estimate / elapsed / remaining metrics
- pause / complete / stop actions
- paused stack
- resume suggestions
- floating mini control

### Success State

- active work is visible from anywhere
- time updates reliably at second-level precision
- switching preserves state and supports recovery

### Empty / Failure State

- no active task
- broken timer display
- no available task to resume
- active state and task state diverge

### Notes

- this is the execution center of the product
- interruptions must feel supported, not punished

## Screen 4: Clock-out Report

### Goal

Close the day with a truthful summary and prepare tomorrow.

### User Problem

Users end the day without closure and carry vague guilt into the next day.

### Primary Actions

- clock out
- review today summary
- see workday time versus focus time
- review completed work
- review switches and interruptions
- write one-line reflection
- carry unfinished tasks to tomorrow

### Required Data

- clock in time
- clock out time
- total workday duration
- tracked focus duration
- focus ratio
- completed count
- score
- switch count
- interruption count
- first focus
- last focus
- peak focus hour
- unfinished tasks

### Core UI Blocks

- summary header
- key metrics grid
- interpretation block
- unfinished tasks carry-forward
- optional text reflection

### Success State

- the user can explain what happened today
- tomorrow's carry-over is decided before leaving
- the day feels closed instead of trailing off

### Empty / Failure State

- no work session
- no focus sessions
- no completed work
- no unfinished tasks

### Notes

- this screen is one of the strongest retention hooks
- avoid making it feel like a performance review

## Screen 5: Weekly Review

### Goal

Show users patterns they cannot see from a single day.

### User Problem

Users repeat the same weak work patterns because they never zoom out.

### Primary Actions

- change week range
- inspect total work and total focus
- review focus ratio trend
- review peak focus hours
- compare interruption-heavy days
- identify strongest task categories
- set next-week intent

### Required Data

- weekly workday total
- weekly focus total
- daily focus ratios
- top focus hours
- switch and interruption trends
- completion trends
- score trends
- category distribution

### Core UI Blocks

- week summary cards
- daily trend chart
- focus hour heatmap
- category analysis
- insight summary

### Success State

- users can identify at least one improvement point
- users can identify when they work best
- users return because the weekly report compounds value

### Empty / Failure State

- not enough data
- selected week has no records
- metrics disagree across views

### Notes

- weekly review is a likely paid feature boundary
- it should feel analytical, not noisy

## Prioritization

### v1 Must Ship

- Start Day basic flow
- Today Board
- Focus Console
- Clock-out Report
- daily score and combo

### v1.1

- carry unfinished tasks to tomorrow
- one-line reflection
- better resume recommendation

### v2

- Weekly Review
- integrations
- desktop mini widget
- advanced analytics

## Success Metrics Per Screen

### Start Day

- clock-in rate
- top 3 selection rate
- first task start rate

### Today Board

- tasks added per day
- task start rate
- task completion rate

### Focus Console

- focus session count
- average focus duration
- paused-task resume rate

### Clock-out Report

- clock-out completion rate
- report view completion rate
- carry-forward usage rate

### Weekly Review

- weekly review open rate
- repeat weekly usage
- insight interaction rate
