# Keyboard Shortcuts Reference

Quick reference for all keyboard shortcuts in the command palette system.

## Global Shortcuts

These work anywhere in the calendar:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Toggle command palette |
| `C` | Create appointment (when palette closed) |
| `B` | Block time (when palette closed) |
| `T` | Jump to today (when palette closed) |
| `Esc` | Close topmost modal/drawer/palette |

## Command Palette

When the command palette is open:

| Shortcut | Action |
|----------|--------|
| `↑` | Navigate up in results |
| `↓` | Navigate down in results |
| `Enter` | Execute selected result |
| `Esc` | Close palette |
| `Tab` | Autocomplete (if available) |

## Inline Edit Fields

When editing a field:

| Shortcut | Action |
|----------|--------|
| `Enter` | Save changes |
| `Esc` | Cancel editing |
| `Blur` | Auto-save on focus loss |
| `Shift + Enter` | New line (textarea only) |

## Drawer/Panel Navigation

When a drawer or panel is open:

| Shortcut | Action |
|----------|--------|
| `Esc` | Close drawer |
| `Tab` | Navigate to next field |
| `Shift + Tab` | Navigate to previous field |
| `Drag` | Dismiss drawer (mobile/touch) |

## Natural Language Examples

Type these in the command palette for quick scheduling:

```
john 2pm friday
jane next monday 60min
block lunch tomorrow
sarah 3:30pm today
schedule meeting 2pm
cancel today 3pm
```

## Pro Tips

1. **Quick Access**: Use `C`, `B`, `T` shortcuts without opening command palette
2. **Natural Language**: Start with client name, then time, then date
3. **Recent Searches**: Command palette remembers your recent searches
4. **Autocomplete**: Start typing a client name for instant suggestions
5. **Status Updates**: Use quick actions in drawer for one-click status changes

## Accessibility

All shortcuts work with screen readers and keyboard-only navigation:

- Focus trap in modals prevents losing focus
- Arrow keys navigate through all interactive elements
- Enter/Space activate buttons
- Esc always closes topmost panel
- Tab follows logical order through forms

## Customization

Shortcuts are registered in `useCommandPalette.ts`. To customize:

```tsx
// In useCommandPalette.ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Add your custom shortcuts here
    if (e.key === 'x' && !isOpen) {
      // Custom action
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen])
```

## Conflicts

If shortcuts don't work:

1. Check for browser extension conflicts (Cmd+K is common)
2. Verify no other React components are preventing default
3. Ensure command palette is mounted in the DOM
4. Check that you're not inside a form that captures Enter key

## Mobile

On mobile devices:

- Command palette opens with search icon tap
- No single-key shortcuts (C, B, T) - use command palette
- Swipe gestures replace Esc for closing drawers
- Virtual keyboard automatically appears for text input
