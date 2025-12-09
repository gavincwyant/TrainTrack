# Migration Checklist - Smart Time Blocking System

## Before Using the System

### 1. Run Prisma Migration ⚠️ REQUIRED

```bash
cd /Users/gavinwyant/SIDE_PROJECTS/train

# Generate and apply the migration
npx prisma migrate dev --name add_block_time_templates

# Generate Prisma client
npx prisma generate
```

This will:
- Create the `block_time_templates` table
- Add necessary indexes
- Update Prisma client types

### 2. Verify Migration

Check that the table was created:

```bash
# Connect to your database
npx prisma studio

# Or use psql
psql your_database_url -c "SELECT * FROM block_time_templates LIMIT 1;"
```

### 3. (Optional) Seed Default Templates

Create a seed script or add default templates through the UI:

**Suggested Defaults:**
- 💼 Lunch Break - Mon-Fri, 12:00-1:00 PM, Weekly
- 🏃 Morning Workout - Mon/Wed/Fri, 6:00-7:00 AM, Weekly
- 📋 Admin Time - Friday, 4:00-5:00 PM, Weekly
- 🏖️ Weekend Block - Sat-Sun, 9:00 AM-5:00 PM, Weekly

### 4. Update Environment (if needed)

Ensure your `.env` file has the correct database connection:

```
DATABASE_URL="postgresql://..."
```

## Integration Steps

### 1. Import Components

```tsx
// In your calendar page
import {
  BlockTimeTemplates,
  TemplateManager,
  DragToBlockOverlay,
  BlockTimeQuickMenu,
  RecurringBlockTime
} from '@/app/(trainer)/trainer/calendar-v2/components/EventCreation'
```

### 2. Import Hooks

```tsx
import {
  useBlockTimeTemplates,
  useDragToBlock
} from '@/app/(trainer)/trainer/calendar-v2/hooks'
```

### 3. Add to Calendar

```tsx
function CalendarPage() {
  // Template management
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate
  } = useBlockTimeTemplates()

  // Drag to block
  const {
    isDragging,
    dragSelection,
    showQuickMenu,
    handlers,
    confirmSelection,
    cancelSelection
  } = useDragToBlock(true, () => {
    // Refresh calendar after blocking
    mutate('/api/appointments') // or your refresh method
  })

  return (
    <div>
      {/* Add templates section */}
      <BlockTimeTemplates
        templates={templates}
        onApply={(id, weeks) => applyTemplate(id, new Date(), weeks)}
        onEdit={handleEdit}
        onDelete={deleteTemplate}
        onCreate={handleCreate}
      />

      {/* Add drag handlers to your time slots */}
      <TimeSlot
        data-time-slot={slot.toISOString()}
        onMouseDown={(e) => handlers.onMouseDown(e, slot)}
        onMouseMove={(e) => handlers.onMouseMove(e, slot)}
        onMouseUp={handlers.onMouseUp}
        onTouchStart={(e) => handlers.onTouchStart(e, slot)}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
      />

      {/* Add overlays */}
      {isDragging && dragSelection && (
        <DragToBlockOverlay dragSelection={dragSelection} />
      )}

      {showQuickMenu && dragSelection && (
        <BlockTimeQuickMenu
          timeRange={{ start: dragSelection.startSlot, end: dragSelection.endSlot }}
          onConfirm={confirmSelection}
          onCancel={cancelSelection}
        />
      )}
    </div>
  )
}
```

### 4. Add data-time-slot Attribute

Make sure your time slot elements have the `data-time-slot` attribute:

```tsx
<div
  className="time-slot"
  data-time-slot={slotDate.toISOString()}
  onMouseDown={(e) => handlers.onMouseDown(e, slotDate)}
>
  {/* slot content */}
</div>
```

## Testing Checklist

### Desktop

- [ ] Shift + Drag creates selection
- [ ] Selection shows overlay with time range
- [ ] Release shows quick menu
- [ ] Number keys (1-4) select presets
- [ ] Enter confirms selection
- [ ] Esc cancels selection
- [ ] Blocked time appears on calendar

### Mobile

- [ ] Long-press (500ms) starts drag
- [ ] Haptic feedback on drag start
- [ ] Drag updates selection
- [ ] Release shows quick menu
- [ ] Touch targets are at least 44px
- [ ] Bottom sheet works on mobile

### Templates

- [ ] Can create new template
- [ ] Can edit existing template
- [ ] Can delete template
- [ ] Can apply template to multiple weeks
- [ ] Applied blocks appear on calendar
- [ ] No duplicate blocks created

### Edge Cases

- [ ] Dragging upward (end before start) works
- [ ] Invalid selections show error state
- [ ] Past dates are skipped when applying templates
- [ ] Conflicting times are handled
- [ ] Loading states work correctly
- [ ] Error messages are clear

## Rollback Plan

If you need to rollback the migration:

```bash
# Rollback the migration
npx prisma migrate reset

# Or manually
psql your_database_url -c "DROP TABLE IF EXISTS block_time_templates;"

# Revert schema.prisma changes
git checkout prisma/schema.prisma

# Regenerate client
npx prisma generate
```

## Support

For issues or questions:

1. Check the comprehensive README:
   `/app/(trainer)/trainer/calendar-v2/components/EventCreation/BLOCK_TIME_README.md`

2. Review the summary document:
   `/SMART_TIME_BLOCKING_SUMMARY.md`

3. Check component implementations in:
   `/app/(trainer)/trainer/calendar-v2/components/EventCreation/`

## Success Criteria

✅ Migration runs successfully
✅ Templates can be created and managed
✅ Drag-to-block works on desktop (Shift+Drag)
✅ Long-press works on mobile
✅ Quick menu appears and works
✅ Templates can be applied to multiple weeks
✅ No duplicate blocks created
✅ Animations are smooth
✅ No console errors

## Performance Monitoring

After deployment, monitor:
- Template load time (<100ms)
- Drag responsiveness (60fps)
- Database query performance
- API endpoint response times

## Notes

- The system uses Framer Motion for animations
- All times are snapped to 15-minute intervals
- Templates are workspace and trainer-scoped
- Touch gestures require 500ms long-press
- Quick menu auto-dismisses after 5 seconds

---

**Ready to launch?** Run the migration and start testing!
