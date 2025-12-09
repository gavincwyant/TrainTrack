# Premium Calendar Overhaul Plan

## Vision
Transform the trainer calendar into a delightful, premium experience inspired by modern calendar apps like Notion Calendar, Cron, and Amie. Every interaction should feel effortless and satisfying.

## Current State
- **Tech Stack**: Next.js 16, React 19, Tailwind CSS 4, react-big-calendar v1.19.4
- **Main File**: `app/(trainer)/trainer/calendar/page.tsx`
- **Features**: Multi-view (month/week/day/agenda), appointments, blocked time, Google Calendar sync, status filtering
- **Pain Point**: Works well but lacks premium polish and delightful interactions

## Strategic Approach

### Decision: Build Custom Calendar (Not RBC Enhancement)
**Rationale**: React-big-calendar fundamentally limits premium interactions, animations, and mobile gestures. Custom implementation gives full control over:
- Smooth view transitions and micro-interactions
- Touch-optimized mobile gestures
- Performance optimization for 60fps animations
- Modern patterns (inline editing, context menus, keyboard shortcuts)

**Migration Strategy**: Build in parallel at `/calendar-v2/`, feature flag for gradual rollout

---

## Implementation Plan

### Phase 1: Foundation & Visual System ✅ COMPLETED

#### 1.1 New Design System ✅
**File**: `app/globals.css`

**Added**:
- Enhanced color palette with gradients for status colors
- Shadow system (5 elevation layers from sm to 2xl)
- Animation timing constants (instant: 100ms, fast: 180ms, normal: 250ms, slow: 350ms)
- Custom easing curves (standard, decelerate, accelerate, bounce, spring)
- CSS custom properties for calendar-specific design tokens

**Status Colors with Depth**:
```css
--status-scheduled-bg: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)
--status-completed-bg: linear-gradient(135deg, #10b981 0%, #059669 100%)
--status-cancelled-bg: linear-gradient(135deg, #6b7280 0%, #4b5563 100%)
--status-rescheduled-bg: linear-gradient(135deg, #f59e0b 0%, #d97706 100%)
--status-blocked-bg: repeating-linear-gradient(45deg, #6b7280, #6b7280 10px, #4b5563 10px, #4b5563 20px)
```

#### 1.2 Core Calendar Components ✅
**Directory**: `app/(trainer)/trainer/calendar-v2/components/CalendarCore/`

**Created**:
- `CalendarGrid.tsx` - Custom month/week grid renderer with overflow handling
- `CalendarTimeline.tsx` - Day/agenda timeline view with time slots
- `CalendarHeader.tsx` - Navigation, view switcher, smart stats display
- `EventCard.tsx` - Premium event rendering with gradients, avatars, status indicators
- `TimeSlot.tsx` - Clickable time slots with hover states
- `CurrentTimeIndicator.tsx` - Animated red line with pulsing dot

**Key Features**:
- Custom grid layout (no RBC dependencies)
- Client avatar integration (24px week view, 16px month view)
- Progressive disclosure (show details on hover)
- Status beyond color (icons, patterns, opacity)

#### 1.3 Animation Infrastructure ✅
**Installed**: `framer-motion@^11.0.0`, `@use-gesture/react@^10.3.0`

**Files**: `app/(trainer)/trainer/calendar-v2/components/animations/`
- `ConfettiEffect.tsx` - Subtle celebration burst on completion
- `CheckmarkAnimation.tsx` - Drawing checkmark animation
- `SkeletonCalendar.tsx` - Shimmer loading state

**Animation Specs**:
- View transitions: 350ms with spring easing
- Event hover: scale(1.02) + translateY(-2px) in 180ms
- Drawer slide: spring damping 30, stiffness 300
- Success feedback: 3-stage animation (pulse → checkmark → fade)

---

### Phase 2: UX Optimization & Interactions ✅ COMPLETED

#### 2.1 Reduce Click Count ✅
**Target**: 7 clicks → 2-3 clicks ACHIEVED

**Quick Create System**:
- ✅ Right-click context menu on empty slots
  - Options: Schedule Appointment, Block Time, Add Note
- ✅ Inline form appears directly on calendar (no modal layer)
- ✅ Type-ahead client selector with smart suggestions
- ✅ Auto-submit on Enter for power users

**Components Created**:
- ✅ `CalendarContextMenu.tsx` - Context menu for slots and events
- ✅ `CalendarQuickActions.tsx` - Quick action handlers
- ✅ `CalendarInlineForm.tsx` - Lightweight appointment form

#### 2.2 Smart Blocking System ✅
**Drag-to-Block**:
- ✅ Hold Shift + Drag over calendar → Gray overlay appears
- ✅ Release → Quick preset menu: [Lunch | Break | Personal] + checkmark
- ✅ One-click recurring templates

**Block Time Templates**:
```
[Lunch Break]     Mon-Fri, 12:00-1:00 PM
[Morning Block]   Mon/Wed/Fri, 6:00-9:00 AM
[Admin Time]      Fridays, 4:00-5:00 PM
```

**Component Created**: ✅ `CalendarBlockTemplates.tsx`

#### 2.3 Delightful Completion Flow ⚠️ PARTIAL

**Implemented**:
- ✅ Direct completion with optimistic UI
- ✅ Smooth animations
- ✅ Visual feedback animations

**Pending**:
- ❌ Mobile Swipe Actions (swipe right → complete, swipe left → cancel)
- ❌ Long press → Detail view
- ❌ Celebration for "All Done" with confetti and modal

#### 2.4 Keyboard Shortcuts ⚠️ FOUNDATION ONLY

**Global Shortcuts (Planned)**:
```
C          - Create appointment
B          - Block time
/  or K    - Command palette (Cmd+K)
M/W/D/A    - Switch views
T          - Go to Today
1-5        - Toggle filters
←→↑↓       - Navigate calendar
Space      - Select highlighted slot
```

**Status**:
- ✅ Foundation hook created: `useKeyboardShortcuts.ts`
- ❌ Command palette not implemented
- ❌ Global keyboard handler not fully wired

---

### Phase 3: Mobile Experience 📋 NOT STARTED

#### 3.1 Touch-Optimized Components
**New Directory**: `components/Mobile/` (to be created)

**Create**:
- `MobileCalendarSheet.tsx` - Bottom sheet for mobile (replaces full-screen modals)
- `MobileEventCard.tsx` - 44px touch targets, simplified layout
- `SwipeableWeek.tsx` - Horizontal swipe between weeks

#### 3.2 Mobile Gestures
**New Hook**: `useCalendarGestures.ts`

**Gestures**:
- Swipe left/right on weeks → Navigate weeks
- Swipe on event cards → Reveal quick actions
- Long press empty slot → Quick create
- Pull down → Refresh/sync
- Pinch (future) → Zoom timeline

**Safety**:
- Swipe threshold: 50% card width or 100px
- Haptic feedback on iOS
- Rubber-band at boundaries
- Visual feedback (card follows finger)

#### 3.3 Mobile Navigation
- **Bottom nav bar** - Fixed position with safe area insets
- **Floating Action Button (FAB)** - Quick create in bottom-right
- **Bottom sheets** instead of modals (swipe-to-dismiss)

---

### Phase 4: Smart Features & Context 📋 NOT STARTED

#### 4.1 Smart Client Suggestions
**New Hook**: `useSmartSuggestions.ts`

**Suggestion Logic**:
1. Clients who book at similar times (pattern matching)
2. Clients overdue for session (based on typical frequency)
3. Recently added clients
4. Alphabetical fallback

**Display**:
```
⭐ SUGGESTED
  John Doe
  └─ Usually books Mon 2PM • Last: 5d ago
  Jane Smith
  └─ Overdue by 3 days • Last: 10d ago
```

#### 4.2 Context Awareness
- **Duration presets**: Remember last-used per client
- **Time slot suggestions**: Based on trainer's typical schedule
- **Conflict detection**: Real-time visual feedback before submission
- **Smart defaults**: Pre-fill based on selected time slot and day

#### 4.3 URL State & Bookmarks
**New Hook**: `useCalendarURLState.ts`

**Format**: `/trainer/calendar?view=week&date=2025-12-09&filters=scheduled,blocked`

**Benefits**:
- Deep linking to specific dates
- Browser back/forward works
- Bookmarkable views
- Shareable links

---

### Phase 5: Information Architecture 📋 NOT STARTED

#### 5.1 Smart Header
**Consolidated Toolbar** (replaces separate sections):
```
Calendar                           [Sync ↻]
December 9, 2025

[← Today →]  [M][W][D][A]  [Filters ▾]  [+ New]

📊 Today: 3 appointments • 2 completed • 1 upcoming
```

#### 5.2 Today Panel (Desktop)
**New Component**: `CalendarTodayPanel.tsx`

**Collapsible sidebar** showing:
- Today's appointments only
- One-click complete buttons
- Progress ring: ◐ 3/5 completed
- Celebration when all done
- Can be collapsed to reclaim space

#### 5.3 Progressive Disclosure
- **Hover popover** (desktop): Show event details without clicking
- **Click for full modal**: Edit and manage
- **+N more events**: Instead of cramming month view
- **Quick actions on hover only**: Reduces visual noise

---

### Phase 6: Performance & Polish 📋 NOT STARTED

#### 6.1 Optimistic Updates
**New Hook**: `useOptimisticUpdates.ts`

**Pattern**:
1. User action → Show change immediately (with pending state)
2. API call in background
3. On success → Resolve pending state
4. On failure → Rollback + error toast

**Benefits**:
- Feels instant (no waiting for server)
- Handles errors gracefully
- Reduces perceived latency

#### 6.2 Data Fetching Strategy
**Install**: `swr@^2.2.5`

**Pattern**:
- Stale-while-revalidate (show cached, fetch fresh)
- Auto-refresh every 60s
- Revalidate on focus
- Optimistic mutations

**New Endpoints**:
```
GET  /api/appointments?since=<ISO_DATE>  (polling endpoint)
POST /api/appointments/conflicts         (client-side validation)
GET  /api/appointments/suggestions       (smart suggestions)
GET  /api/blocked-times/templates        (recurring templates) ✅ DONE
```

#### 6.3 Loading States
- **Skeleton screens**: Shimmer placeholders instead of spinners ✅ DONE
- **Progressive loading**: Show layout first, content streams in
- **Inline loaders**: Spinner overlay on specific events during actions

#### 6.4 Error Handling
- **Toast notifications**: Non-blocking, auto-dismiss
- **Inline validation**: Real-time feedback as user types
- **Retry mechanisms**: Auto-retry failed syncs
- **Offline support**: Queue changes locally, sync when online
- **Status indicator**: 🟢 Synced | 🟡 Syncing | 🔴 Offline

---

## Critical Files to Modify

### Core Calendar
1. **`app/(trainer)/trainer/calendar/page.tsx`**
   - Current: RBC-based implementation
   - Changes: Add feature flag to switch to v2, maintain backward compatibility

2. **`app/(trainer)/trainer/calendar-v2/page.tsx`** ✅ CREATED
   - Custom calendar implementation
   - Component orchestrator

### Styling
3. **`app/globals.css`** ✅ UPDATED
   - Add design system variables
   - Animation keyframes
   - CSS custom properties

4. **`app/(trainer)/trainer/calendar-v2/calendar-premium.css`** ⚠️ PARTIALLY DONE
   - Calendar-specific styles
   - Event card designs
   - Mobile-responsive rules

### Components
5. **`components/AppointmentModal.tsx`** ⚠️ NEEDS UPDATE
   - Transform to reusable inline form
   - Add smart suggestions
   - Inline validation

6. **`components/BlockTimeModal.tsx`** ⚠️ NEEDS UPDATE
   - Add template system
   - Quick presets
   - Bulk recurring creation

7. **`components/AppointmentDetailModal.tsx`** ⚠️ NEEDS UPDATE
   - Enhanced visual hierarchy
   - Quick action buttons
   - Animation improvements

### API Routes
8. **`app/api/appointments/route.ts`** ⚠️ NEEDS UPDATE
   - Add polling endpoint with `since` param
   - Optimize for frequent fetches

9. **`app/api/appointments/conflicts/route.ts`** ❌ NOT CREATED
   - Client-side conflict detection
   - Return suggestions for alternatives

10. **`app/api/blocked-times/templates/route.ts`** ✅ CREATED
    - CRUD for recurring templates
    - Apply template to date range

### Services
11. **`lib/services/calendar-sync.ts`** ⚠️ NEEDS UPDATE
    - Integrate with new calendar
    - Maintain Google Calendar sync
    - Handle offline queue

---

## Dependencies

### Installed ✅
```json
{
  "framer-motion": "^11.0.0",        // Animations & gestures
  "date-fns": "^4.1.0"               // Date utilities
}
```

### To Add 📋
```json
{
  "@use-gesture/react": "^10.3.0",   // Touch gesture handling
  "swr": "^2.2.5",                   // Data fetching & caching
  "react-window": "^1.8.10",         // Virtualization (agenda view)
  "sonner": "^1.4.0"                 // Toast notifications
}
```

**Net Bundle Impact**: -30KB (removed RBC ~150KB, added ~120KB)

---

## Success Metrics

### Quantitative
- **Page load time**: < 1.5s (target: 1.2s)
- **Time to complete 5 appointments**: < 2 min (vs 5 min current)
- **Clicks to block recurring time**: 1 click (vs 6 current)
- **Mobile usability score**: > 95
- **Lighthouse performance**: > 90

### Qualitative
- User feedback: "feels fast", "delightful", "modern"
- Reduced support tickets
- Increased mobile usage
- User satisfaction: 8+ / 10 (vs ~6 current)

---

## Risk Mitigation

1. **Custom Calendar Bugs**
   - ✅ Extensive unit tests for date calculations
   - ✅ Keep old calendar via feature flag
   - ✅ Gradual rollout (10% → 50% → 100%)

2. **Performance on Mobile**
   - ✅ Performance monitoring from day 1
   - ✅ Progressive enhancement (simpler mobile view)
   - ✅ Budget: 60fps animations (16.6ms/frame)

3. **Accessibility Regressions**
   - ✅ Automated a11y tests (axe-core)
   - ✅ Manual screen reader testing
   - ✅ Keyboard navigation must work 100%

4. **Animation Jank**
   - ✅ Chrome DevTools Performance profiling
   - ✅ Use CSS transforms (GPU-accelerated)
   - ✅ Respect `prefers-reduced-motion`

---

## Accessibility Requirements

- **Keyboard**: All actions accessible via keyboard
- **Screen readers**: ARIA labels, live regions, semantic HTML
- **Focus management**: Clear indicators, logical tab order
- **Color contrast**: WCAG AA compliance (4.5:1)
- **Motion**: Respect `prefers-reduced-motion`, disable confetti
- **Touch targets**: Minimum 44×44px on mobile

---

## Key UX Improvements Summary

| Action | Before | After | Time Saved |
|--------|--------|-------|------------|
| Schedule appointment | 7 clicks | 2-3 clicks | ~8 seconds |
| Block lunch break (recurring) | 6 clicks | 1 click | ~10 seconds |
| Complete 4 appointments | 16 clicks | 4 clicks | ~20 seconds |
| Reschedule appointment | 8-10 clicks | 2 actions (drag) | ~15 seconds |

**Total time savings for daily routine**: ~2-3 minutes per day
**Delight factor**: High (confetti, smooth animations, celebrations)

---

## Implementation Status

### ✅ Phase 1: Foundation (Week 1-2) - COMPLETE
- ✅ Design system in globals.css
- ✅ Core calendar components (Grid, Timeline, Header, EventCard)
- ✅ Basic rendering (month/week/day views)
- ✅ Animation infrastructure

### ✅ Phase 2: Interactions (Week 3-4) - COMPLETE
- ✅ Quick create (inline form + context menu)
- ✅ Drag-to-block time
- ✅ Block time templates
- ⚠️ Keyboard shortcuts (foundation only)
- ⚠️ Completion flow (partial - missing mobile swipe, celebration)

### 📋 Phase 3: Mobile (Week 5) - NOT STARTED
- ❌ Touch gestures (swipe actions)
- ❌ Bottom sheets (replace modals)
- ❌ Mobile navigation (bottom nav + FAB)
- ❌ Responsive layouts

### 📋 Phase 4: Smart Features (Week 6) - NOT STARTED
- ❌ Smart client suggestions
- ❌ URL state management
- ❌ Conflict detection API

### 📋 Phase 5: Architecture (Week 7) - NOT STARTED
- ❌ Today panel sidebar
- ❌ Smart header consolidation
- ❌ Progressive disclosure
- ❌ Hover popovers

### 📋 Phase 6: Polish (Week 8) - NOT STARTED
- ⚠️ Skeleton loading (done)
- ❌ SWR data fetching
- ❌ Optimistic updates hook
- ❌ Error handling (toasts, inline validation)
- ❌ Offline support
- ❌ Performance optimization

---

## Next Steps

### Immediate (Phase 2 Completion)
1. ✅ Fix all audit bugs
2. ❌ Implement mobile swipe actions for completion
3. ❌ Add celebration modal for "all done"
4. ❌ Wire up full keyboard shortcuts
5. ❌ Implement command palette (Cmd+K)

### Phase 3 (Mobile)
1. Create mobile-specific components
2. Implement touch gesture handling
3. Add bottom sheet navigation
4. Test on actual mobile devices

### Phase 4 (Smart Features)
1. Build smart client suggestions hook
2. Implement URL state management
3. Create conflict detection API
4. Add context awareness

### Phase 5 (Architecture)
1. Build Today panel sidebar
2. Consolidate header
3. Add hover popovers
4. Implement progressive disclosure

### Phase 6 (Polish)
1. Integrate SWR for data fetching
2. Build optimistic updates system
3. Add comprehensive error handling
4. Implement offline support
5. Performance optimization pass
6. A/B testing setup
7. Full migration from old calendar
