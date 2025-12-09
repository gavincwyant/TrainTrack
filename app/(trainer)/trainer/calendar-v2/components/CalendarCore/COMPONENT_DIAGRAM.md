# CalendarCore Components - Architecture Diagram

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Calendar Container                       │
│                    (Your Main Component)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴──────────────┐
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  EmptyState      │        │ CalendarTimeline │
│                  │        │                  │
│  - Illustration  │        │  View Selector   │
│  - Message       │        │  ┌────────┐      │
│  - CTA Button    │        │  │  Day   │      │
│                  │        │  └────────┘      │
└──────────────────┘        │  ┌────────┐      │
                            │  │ Agenda │      │
                            │  └────────┘      │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
          ┌──────────────────┐            ┌──────────────────┐
          │   Day View       │            │  Agenda View     │
          │                  │            │                  │
          │ - Timeline Grid  │            │ - Date Groups    │
          │ - Time Labels    │            │ - Event List     │
          │ - Current Time   │            │ - Virtualized    │
          │                  │            │                  │
          └────────┬─────────┘            └────────┬─────────┘
                   │                               │
                   └───────────┬───────────────────┘
                               │
                               ▼
                     ┌──────────────────┐
                     │    EventCard     │
                     │                  │
                     │ Layout Adapts:   │
                     │ - Month (24px)   │
                     │ - Day (80px+)    │
                     │ - Agenda         │
                     │                  │
                     │ Features:        │
                     │ - Avatar         │
                     │ - Status         │
                     │ - Quick Actions  │
                     │ - Animations     │
                     └──────────────────┘
```

## Data Flow

```
User Event → Handler → State Update → Component Re-render

┌─────────────────┐
│  User Actions   │
├─────────────────┤
│ • Click Event   ├──→ onEventClick(event)
│ • Click Slot    ├──→ onSlotClick(date)
│ • Quick Action  ├──→ onQuickAction(action, event)
│ • Empty CTA     ├──→ onAction()
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Your Logic    │
├─────────────────┤
│ • Open Modal    │
│ • Update Event  │
│ • Create New    │
│ • Refresh Data  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  State Update   │
├─────────────────┤
│ • events[]      │
│ • selectedDate  │
│ • view          │
│ • filters       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Re-render      │
├─────────────────┤
│ • Smooth        │
│ • Animated      │
│ • Optimized     │
└─────────────────┘
```

## Event Card View Selection

```
                    ┌─────────────────┐
                    │   EventCard     │
                    │  (viewType)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌────────────────┐   ┌───────────────┐
│  'month'      │   │  'week'/'day'  │   │  'agenda'     │
├───────────────┤   ├────────────────┤   ├───────────────┤
│ Height: 24px  │   │ Height: 80px+  │   │ Horizontal    │
│ Avatar + Name │   │ Full Details   │   │ Compact       │
│ Compact       │   │ Quick Actions  │   │ Time Right    │
│               │   │ Duration Bar   │   │               │
└───────────────┘   └────────────────┘   └───────────────┘
```

## Timeline View Selection

```
                  ┌──────────────────┐
                  │ CalendarTimeline │
                  │     (view)       │
                  └────────┬─────────┘
                           │
              ┌────────────┴──────────────┐
              │                           │
              ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   view='day'     │        │  view='agenda'   │
    ├──────────────────┤        ├──────────────────┤
    │ • 24-hour grid   │        │ • Date groups    │
    │ • Time slots     │        │ • List layout    │
    │ • Overlapping    │        │ • 30 days        │
    │ • Current time   │        │ • Virtualized    │
    │ • Click slots    │        │ • Sticky headers │
    └──────────────────┘        └──────────────────┘
```

## Status Color Mapping

```
event.status → STATUS_COLORS[status] → Gradient + Glow + Effects

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  SCHEDULED   │ ──→ │     Blue     │ ──→ │ • Gradient       │
└──────────────┘     │  Gradient    │     │ • Glow Shadow    │
                     └──────────────┘     │ • Solid BG       │
┌──────────────┐     ┌──────────────┐     └──────────────────┘
│  COMPLETED   │ ──→ │    Green     │ ──→ │ • Gradient       │
└──────────────┘     │  Gradient    │     │ • Glow Shadow    │
                     └──────────────┘     │ • Checkmark      │
┌──────────────┐     ┌──────────────┐     └──────────────────┘
│  CANCELLED   │ ──→ │     Gray     │ ──→ │ • Gradient       │
└──────────────┘     │  Gradient    │     │ • Dashed Border  │
                     └──────────────┘     │ • 60% Opacity    │
┌──────────────┐     ┌──────────────┐     └──────────────────┘
│ RESCHEDULED  │ ──→ │    Orange    │ ──→ │ • Gradient       │
└──────────────┘     │  Gradient    │     │ • Glow Shadow    │
                     └──────────────┘     │ • Solid BG       │
┌──────────────┐     ┌──────────────┐     └──────────────────┘
│   BLOCKED    │ ──→ │   Stripes    │ ──→ │ • Diagonal       │
└──────────────┘     │   Pattern    │     │ • 10% Opacity    │
                     └──────────────┘     │ • Over Gradient  │
                                          └──────────────────┘
```

## Animation Timeline (EventCard Hover)

```
Time:   0ms          100ms         180ms
        │            │             │
State:  [Rest]       [Animating]   [Hover]

┌───────┴─────────────┴──────────────┴──────────┐
│                                                 │
│  Scale:      1.0  ─────────────→  1.02         │
│  TranslateY: 0px  ─────────────→  -2px         │
│  Shadow:     sm   ─────────────→  lg + glow    │
│  Easing:     spring (0.175, 0.885, 0.32, 1.275)│
│                                                 │
└─────────────────────────────────────────────────┘

On Mouse Leave: Reverse animation (same timing)
```

## Empty State Animation Cascade

```
Timeline:
0ms    ────●  Background circle (scale 0 → 1.2)
200ms  ─────────●  Icon box (scale + rotate)
300ms  ──────────────●  Small circle
400ms  ───────────────────●  Message text
500ms  ────────────────────────●  Subtext
600ms  ─────────────────────────────●  Plus badge + CTA button
700ms  ──────────────────────────────────●  Decorative dots

Each step: Smooth ease-out transition
Total duration: ~800ms
```

## Overlapping Events Algorithm

```
Input: Multiple events with time overlap

Step 1: Sort by start time
┌────────┐
│ Event1 │ 9:00-10:30
└────────┘
  ┌────────┐
  │ Event2 │ 9:30-11:00
  └────────┘

Step 2: Find columns
Column 0: Event1 (ends 10:30)
Column 1: Event2 (starts 9:30, overlaps)

Step 3: Calculate positions
Event1: left: 0%,   width: 49%
Event2: left: 50%, width: 49%

Result:
┌─────────────────────────────┐
│  [Event1]     [Event2]      │
│  9:00-10:30   9:30-11:00    │
└─────────────────────────────┘
```

## Responsive Breakpoints

```
0px           768px          1024px         ∞
├──────────────┼──────────────┼──────────────┤
│              │              │              │
│   Mobile     │   Tablet     │   Desktop    │
│              │              │              │
│ • Agenda     │ • Day/Agenda │ • All views  │
│ • Touch      │ • Touch opt  │ • Hover      │
│ • Compact    │ • Medium     │ • Full       │
│ • 48px min   │ • 40px min   │ • 32px min   │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

## Type Dependencies

```
CalendarCore Components
        │
        ├─→ CalendarEvent (types/calendar.ts)
        ├─→ CalendarSettings (types/calendar.ts)
        ├─→ CalendarView (types/calendar.ts)
        ├─→ AppointmentStatus (types/calendar.ts)
        ├─→ STATUS_COLORS (types/calendar.ts)
        ├─→ TIMING (types/calendar.ts)
        └─→ EventLayoutInfo (types/calendar.ts)
```

## Integration Flow

```
Step 1: Import
┌────────────────────────────────────────┐
│ import { EventCard, CalendarTimeline,  │
│   EmptyState } from './CalendarCore'   │
└────────────────────────────────────────┘

Step 2: Prepare Data
┌────────────────────────────────────────┐
│ const events: CalendarEvent[] = [...]  │
│ const settings: CalendarSettings = {..}│
└────────────────────────────────────────┘

Step 3: Render
┌────────────────────────────────────────┐
│ {events.length === 0 ? (               │
│   <EmptyState onAction={...} />        │
│ ) : (                                  │
│   <CalendarTimeline                    │
│     view={view}                        │
│     events={events}                    │
│     settings={settings}                │
│     onEventClick={...}                 │
│   />                                   │
│ )}                                     │
└────────────────────────────────────────┘

Step 4: Handle Events
┌────────────────────────────────────────┐
│ const handleEventClick = (event) => {  │
│   setSelectedEvent(event)              │
│   setModalOpen(true)                   │
│ }                                      │
└────────────────────────────────────────┘
```
