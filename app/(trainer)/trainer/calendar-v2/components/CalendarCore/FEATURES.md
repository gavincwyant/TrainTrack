# CalendarCore Components - Feature Overview

## EventCard.tsx

### Visual States by View Type

**Month View (Compact - 24px height)**
```
┌─────────────────────────────────┐
│ 👤 John Doe                     │ ← Avatar + Name
└─────────────────────────────────┘
  ↑ Gradient background (status color)
  ↑ Subtle shadow
```

**Week/Day View (Detailed - 80px+ height)**
```
┌─────────────────────────────────┐ ← 4px left border (status color)
│                      [✓] [✎] [✕] │ ← Quick actions (hover only)
│ 👤 John Doe                     │ ← 24px avatar + bold name
│ 🕐 2:00 - 3:00 PM               │ ← Time with icon
│ ● Scheduled                     │ ← Status dot + label
└─────────────────────────────────┘
  ↑ Gradient background + glow shadow
  ↑ Duration bar (right edge, vertical)
```

**Agenda View (Compact)**
```
┌─────────────────────────────────┐
│ 👤 John Doe          2:00 PM    │ ← Avatar + Name | Time
└─────────────────────────────────┘
  ↑ 3px left border (status color)
```

### Status-Specific Styling

**SCHEDULED** (Blue)
- Gradient: #3b82f6 → #2563eb
- Glow: rgba(59, 130, 246, 0.4)
- Solid background

**COMPLETED** (Green)
- Gradient: #10b981 → #059669
- Glow: rgba(16, 185, 129, 0.4)
- Checkmark badge (top-right)

**CANCELLED** (Gray)
- Gradient: #6b7280 → #4b5563
- 60% opacity
- Dashed border

**RESCHEDULED** (Orange)
- Gradient: #f59e0b → #d97706
- Glow: rgba(245, 158, 11, 0.4)

**BLOCKED TIME**
- Diagonal stripe pattern overlay
- Any status color

### Animations

**Hover Animation**
```
Scale: 1.0 → 1.02
TranslateY: 0 → -2px
Shadow: normal → enhanced glow
Duration: 180ms (spring easing)
```

**Click Animation**
```
Scale: 1.0 → 0.98 → 1.0
Duration: 100ms
```

**Quick Actions Reveal**
```
Initial: opacity: 0, scale: 0.8
Animate: opacity: 1, scale: 1
Delay: 150ms
Duration: 200ms
```

## CalendarTimeline.tsx

### Day View Layout

```
┌────────┬──────────────────────────────────────┐
│ 6 AM   │                                      │ ← Hour labels (left)
│        ├──────────────────────────────────────┤
│        │                                      │ ← 30-min slots
├────────┼──────────────────────────────────────┤
│ 7 AM   │  ┌──────────────────┐               │
│        │  │  Event Card      │               │ ← Absolute positioned
│        │  │  (80px min)      │               │   events
├────────┼──┴──────────────────┴───────────────┤
│ 8 AM   │                                      │
│        ├────🔴────────────────────────────────┤ ← Current time
│        │    ↑ Red line with pulsing dot      │   indicator
└────────┴──────────────────────────────────────┘
```

**Overlapping Events Handling**
```
Multiple columns automatically created:
┌─────────────────────────────────────┐
│  [Event 1]      [Event 2]           │
│  9:00-10:00     9:30-10:30          │
│  ↑ 50% width    ↑ 50% width         │
└─────────────────────────────────────┘
```

**Features:**
- 24-hour timeline (customizable via settings)
- 30-minute slot granularity
- Horizontal gridlines (subtle)
- Click empty slots to create
- Auto-scroll to current time on mount
- Overlapping events get proportional width

### Agenda View Layout

```
┌────────────────────────────────────────────┐
│ Monday, December 9, 2025                   │ ← Sticky date header
│ 3 appointments                             │
│                                            │
│  [Event Card - Compact]                    │
│  [Event Card - Compact]                    │
│  [Event Card - Compact]                    │
│                                            │
│ Tuesday, December 10, 2025                 │
│ No appointments scheduled                  │
│                                            │
│ Wednesday, December 11, 2025               │
│ 1 appointment                              │
│  [Event Card - Compact]                    │
└────────────────────────────────────────────┘
```

**Features:**
- Shows next 30 days
- Grouped by date with headers
- Empty state per day
- Virtualization-ready (react-window compatible)
- Smooth stagger animations (50ms per item)

### Current Time Indicator

**Visual:**
```
●─────────────────────────────────────
↑                                     ↑
Pulsing dot (8px)                    Red line (2px)
Shadow ring animation                Subtle glow
```

**Animation:**
```css
Dot Pulse:
  0%:   box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5)
  50%:  box-shadow: 0 2px 12px rgba(239, 68, 68, 0.7) + ring
  100%: box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5)
  Duration: 2s infinite
```

## EmptyState.tsx

### Visual Layout

```
        ┌───────────────────┐
        │  ○○○ Background   │ ← Animated gradient circles
        │    circles        │   (stagger reveal)
        │                   │
        │  ┌─────────────┐  │
        │  │  📅         │  │ ← Calendar icon
        │  │  gradient   │  │   (scale + rotate animation)
        │  │  box        │  │
        │  │         [+] │  │ ← Plus badge
        │  └─────────────┘  │   (scale + rotate delay)
        │                   │
        │  No appointments  │ ← Message (fade in)
        │  scheduled        │
        │                   │
        │  Get started by   │ ← Subtext (fade in)
        │  scheduling...    │
        │                   │
        │  ┌─────────────┐  │ ← CTA button
        │  │ + Schedule  │  │   (shimmer on hover)
        │  └─────────────┘  │
        │                   │
        │      ● ● ●        │ ← Decorative dots
        └───────────────────┘
```

### Animation Timeline

```
0ms    → Background circle scale (0 → 1.2)
200ms  → Icon container scale + rotate
300ms  → Smaller circle reveal
400ms  → Message fade in
500ms  → Subtext fade in
600ms  → Plus badge scale + rotate
600ms  → CTA button fade in + slide up
700ms+ → Decorative dots stagger
```

### Hover Effects

**CTA Button Hover:**
```
Scale: 1.0 → 1.05
Shadow: normal glow → enhanced glow
Shimmer: translateX(-100% → 100%)
Duration: Shimmer 600ms, others 300ms
```

## Shared Features Across All Components

### Design System Integration
- CSS variables for consistency
- Dark mode support (automatic)
- Responsive breakpoints
- Tailwind + custom CSS

### Performance Optimizations
- Framer Motion (GPU acceleration)
- Memoized event calculations
- Virtualization support (agenda)
- Optimistic updates ready

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Enter, Space)
- Focus visible states
- Screen reader announcements
- Semantic HTML

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox
- CSS custom properties
- Backdrop filter support

## Color Palette (STATUS_COLORS)

```
SCHEDULED    → Blue gradient   #3b82f6 → #2563eb
COMPLETED    → Green gradient  #10b981 → #059669
CANCELLED    → Gray gradient   #6b7280 → #4b5563
RESCHEDULED  → Orange gradient #f59e0b → #d97706
```

Each with matching glow shadows and proper text contrast.

## Responsive Behavior

**Desktop (≥1024px)**
- Full features enabled
- Quick actions on hover
- Multi-column event layout
- Detailed event cards

**Tablet (768-1023px)**
- Simplified quick actions
- Reduced padding/spacing
- Touch-optimized tap targets

**Mobile (<768px)**
- Agenda view recommended
- No hover states
- Larger touch targets (48px min)
- Simplified layouts
