"use client"

import { useState, useEffect } from "react"
import { Toaster, toast } from "sonner"
import AppointmentModal from "@/components/AppointmentModal"
import BlockTimeModal from "@/components/BlockTimeModal"
import AppointmentDetailModal from "@/components/AppointmentDetailModal"
import BlockedTimeDetailModal from "@/components/BlockedTimeDetailModal"

// Import new premium components
import CalendarHeader from "./components/CalendarCore/CalendarHeader"
import CalendarGrid from "./components/CalendarCore/CalendarGrid"
import { CalendarTimeline } from "./components/CalendarCore/CalendarTimeline"
import { SkeletonCalendar } from "./components/animations/SkeletonCalendar"

// Phase 2: Quick Create System
import {
  QuickCreatePopover,
  CalendarContextMenu,
  BlockTimeTemplates,
  DragToBlockOverlay,
  BlockTimeQuickMenu,
} from "./components/EventCreation"

// Phase 2: Completion Flow
import {
  ProgressIndicator,
  UpcomingAppointmentCard,
  AllDoneCelebration,
} from "./components/animations"

// Phase 2: Command Palette
import {
  CommandPalette,
  AppointmentDrawer,
} from "./components/Shared"

// Import hooks
import { useCalendarView } from "./hooks/useCalendarView"
import { useCalendarData } from "./hooks/useCalendarData"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useCalendarKeyboard } from "./hooks/useCalendarKeyboard"
import { useCompletionFlow } from "./hooks/useCompletionFlow"
import { useDragToBlock } from "./hooks/useDragToBlock"
import { useCommandPalette } from "./hooks/useCommandPalette"

// Import types
import type { CalendarEvent, FilterState, CalendarSettings, BlockTimeTemplate } from "./types/calendar"

type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: {
    id: string
    fullName: string
    email: string
    image?: string
  }
  trainer: {
    id: string
    fullName: string
  }
}

type BlockedTime = {
  id: string
  startTime: string
  endTime: string
  reason?: string
  isRecurring: boolean
}

type TrainerSettings = {
  dayStartTime: string
  dayEndTime: string
  timezone: string
}

export default function PremiumCalendarPage() {
  // View and navigation
  const { view, setView, currentDate, goToToday, goToPrevious, goToNext, goToDate } = useCalendarView("week")

  // Data fetching
  const { events: rawEvents, isLoading, isError, refetch } = useCalendarData()

  // Responsive
  const { isMobile } = useMediaQuery()

  // Settings and data
  const [settings, setSettings] = useState<TrainerSettings | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    scheduled: true,
    completed: true,
    cancelled: false,
    rescheduled: true,
    blocked: true,
  })

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [showActionChoice, setShowActionChoice] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false)
  const [showBlockedTimeDetail, setShowBlockedTimeDetail] = useState(false)

  // Phase 2: Quick Create
  const [quickCreatePopover, setQuickCreatePopover] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    slot: { start: Date; end: Date } | null
  }>({ isOpen: false, position: { x: 0, y: 0 }, slot: null })

  // Phase 2: Context Menu
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    target: { type: 'slot' | 'event'; data: any } | null
  }>({ isOpen: false, position: { x: 0, y: 0 }, target: null })

  // Phase 2: Drag to Block
  const { isDragging, dragSelection, showQuickMenu, handlers, confirmSelection, cancelSelection } = useDragToBlock(true)

  // Phase 2: Completion Flow
  const { completeAppointment, completingId, showCelebration, setShowCelebration, celebrationCount } =
    useCompletionFlow()

  // Phase 2: Command Palette
  const { isOpen: commandPaletteOpen, setIsOpen: setCommandPaletteOpen, query, setQuery, results, execute } =
    useCommandPalette()

  // Phase 2: Show templates sidebar
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<BlockTimeTemplate[]>([])

  // Fetch templates when sidebar opens
  useEffect(() => {
    if (showTemplates) {
      const fetchTemplates = async () => {
        try {
          const response = await fetch('/api/blocked-times/templates')
          const data = await response.json()
          setTemplates(data.templates || [])
        } catch (err) {
          console.error('Failed to fetch templates:', err)
        }
      }
      fetchTemplates()
    }
  }, [showTemplates])

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [appointmentsRes, blockedTimesRes, settingsRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/blocked-times"),
        fetch("/api/trainer-settings"),
      ])

      const [appointmentsData, blockedTimesData, settingsData] = await Promise.all([
        appointmentsRes.json(),
        blockedTimesRes.json(),
        settingsRes.json(),
      ])

      if (!appointmentsRes.ok || !blockedTimesRes.ok || !settingsRes.ok) {
        throw new Error("Failed to fetch data")
      }

      setAppointments(appointmentsData.appointments)
      setSettings(settingsData.settings)

      // Transform appointments to CalendarEvent format
      const appointmentEvents: CalendarEvent[] = appointmentsData.appointments.map((apt: Appointment) => ({
        id: apt.id,
        title: apt.client.fullName,
        startTime: new Date(apt.startTime),
        endTime: new Date(apt.endTime),
        status: apt.status as any,
        clientId: apt.client.id,
        clientName: apt.client.fullName,
        clientEmail: apt.client.email,
        clientAvatar: apt.client.image,
        type: "appointment" as const,
      }))

      // Transform blocked times to CalendarEvent format
      const blockedEvents: CalendarEvent[] = []

      blockedTimesData.blockedTimes.forEach((blocked: BlockedTime) => {
        if (blocked.isRecurring) {
          // Generate recurring instances for 12 weeks before and after
          const today = new Date()
          const startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 84)
          const endDate = new Date(today)
          endDate.setDate(endDate.getDate() + 84)

          const originalStart = new Date(blocked.startTime)
          const originalEnd = new Date(blocked.endTime)
          const duration = originalEnd.getTime() - originalStart.getTime()
          const startHours = originalStart.getHours()
          const startMinutes = originalStart.getMinutes()
          const startSeconds = originalStart.getSeconds()

          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === originalStart.getDay()) {
              const instanceStart = new Date(d)
              instanceStart.setHours(startHours, startMinutes, startSeconds, 0)
              const instanceEnd = new Date(instanceStart.getTime() + duration)

              blockedEvents.push({
                id: `${blocked.id}-${instanceStart.toISOString()}`,
                title: blocked.reason || "Blocked",
                startTime: instanceStart,
                endTime: instanceEnd,
                status: "SCHEDULED" as any,
                clientId: "",
                clientName: "Blocked Time",
                type: "blocked" as const,
                reason: blocked.reason,
                isRecurring: true,
              })
            }
          }
        } else {
          blockedEvents.push({
            id: blocked.id,
            title: blocked.reason || "Blocked",
            startTime: new Date(blocked.startTime),
            endTime: new Date(blocked.endTime),
            status: "SCHEDULED" as any,
            clientId: "",
            clientName: "Blocked Time",
            type: "blocked" as const,
            reason: blocked.reason,
            isRecurring: false,
          })
        }
      })

      setEvents([...appointmentEvents, ...blockedEvents])
    } catch (err) {
      console.error("Failed to fetch calendar data:", err)
      toast.error("Failed to load calendar data")
    }
  }

  // Filter events based on active filters
  const filteredEvents = events.filter(event => {
    if (event.type === "blocked") {
      return filters.blocked
    }
    // Map status to filter key
    const statusMap: Record<string, keyof FilterState> = {
      SCHEDULED: "scheduled",
      COMPLETED: "completed",
      CANCELLED: "cancelled",
      RESCHEDULED: "rescheduled",
    }
    const filterKey = statusMap[event.status]
    return filterKey ? filters[filterKey] : false
  })

  // Calculate stats for header
  const todayEvents = filteredEvents.filter(event => {
    const today = new Date()
    return (
      event.startTime.getDate() === today.getDate() &&
      event.startTime.getMonth() === today.getMonth() &&
      event.startTime.getFullYear() === today.getFullYear()
    )
  })

  const todayAppointments = todayEvents.filter(e => e.type === "appointment")
  const todayCompleted = todayAppointments.filter(e => e.status === "COMPLETED").length
  const todayUpcoming = todayAppointments.filter(e =>
    e.status === "SCHEDULED" && e.startTime > new Date()
  ).length

  const stats = {
    total: todayAppointments.length,
    completed: todayCompleted,
    upcoming: todayUpcoming,
  }

  // Handle sync
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" })
      if (!response.ok) throw new Error("Sync failed")
      await fetchData()
      toast.success("Calendar synced successfully")
    } catch (err) {
      toast.error("Failed to sync calendar")
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle slot click - Phase 2: Use Quick Create Popover
  const handleSlotClick = (date: Date, time?: string) => {
    const end = new Date(date)
    end.setHours(date.getHours() + 1)

    // Phase 2: Show quick create popover at center of screen
    // (Could be enhanced to calculate position based on clicked cell)
    setQuickCreatePopover({
      isOpen: true,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
      slot: { start: date, end }
    })
  }

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, target: { type: 'slot' | 'event'; data: any }) => {
    e.preventDefault()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      target
    })
  }

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    if (event.type === "appointment") {
      setShowAppointmentDetail(true)
    } else {
      setShowBlockedTimeDetail(true)
    }
  }

  // Handle quick action on event
  const handleQuickAction = async (action: "complete" | "cancel" | "edit", event: CalendarEvent) => {
    if (action === "complete" && event.type === "appointment") {
      try {
        const response = await fetch(`/api/appointments/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "COMPLETED" }),
        })
        if (!response.ok) throw new Error("Failed to complete appointment")
        await fetchData()
        toast.success("Appointment completed!")
      } catch (err) {
        toast.error("Failed to complete appointment")
      }
    } else if (action === "cancel") {
      handleEventClick(event)
    } else if (action === "edit") {
      handleEventClick(event)
    }
  }

  // Keyboard shortcuts
  useCalendarKeyboard({
    onCreateAppointment: () => {
      const now = new Date()
      now.setMinutes(0, 0, 0)
      handleSlotClick(now)
      setIsModalOpen(true)
      setShowActionChoice(false)
    },
    onBlockTime: () => {
      const now = new Date()
      now.setMinutes(0, 0, 0)
      handleSlotClick(now)
      setIsBlockModalOpen(true)
      setShowActionChoice(false)
    },
    onGoToToday: goToToday,
    onViewChange: setView,
    onNavigate: (direction: "prev" | "next") => {
      if (direction === "prev") goToPrevious()
      else goToNext()
    },
  })

  // Convert settings to CalendarSettings format
  const calendarSettings: CalendarSettings = settings ? {
    dayStartTime: settings.dayStartTime,
    dayEndTime: settings.dayEndTime,
    timezone: settings.timezone,
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri default
  } : {
    dayStartTime: "06:00",
    dayEndTime: "22:00",
    timezone: "UTC",
    workingDays: [1, 2, 3, 4, 5],
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--calendar-bg-primary)] p-6">
        <SkeletonCalendar view={view} rows={5} />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--calendar-bg-primary)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Failed to load calendar
          </h2>
          <button
            onClick={() => fetchData()}
            className="px-6 py-3 bg-[var(--calendar-primary)] text-white rounded-lg hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--calendar-bg-primary)]">
      <Toaster position="bottom-center" />

      {/* Header */}
      <CalendarHeader
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={goToDate}
        onSync={handleSync}
        onToggleTemplates={() => setShowTemplates(prev => !prev)}
        stats={stats}
      />

      {/* Calendar Grid/Timeline */}
      <div className="flex-1 overflow-auto p-6">
        {view === "day" || view === "agenda" ? (
          <CalendarTimeline
            view={view}
            currentDate={currentDate}
            events={filteredEvents}
            settings={calendarSettings}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        ) : (
          <CalendarGrid
            view={view}
            currentDate={currentDate}
            events={filteredEvents}
            settings={calendarSettings}
            filters={filters}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            onContextMenu={handleContextMenu}
            dragHandlers={handlers}
          />
        )}
      </div>

      {/* Action Choice Modal */}
      {showActionChoice && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[var(--calendar-bg-primary)] rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              What would you like to do?
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setIsModalOpen(true)
                }}
                className="w-full px-4 py-3 bg-[var(--calendar-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Schedule Appointment
              </button>
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setIsBlockModalOpen(true)
                }}
                className="w-full px-4 py-3 bg-[var(--calendar-neutral)] text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Block Time
              </button>
              <button
                onClick={() => {
                  setShowActionChoice(false)
                  setSelectedSlot(null)
                }}
                className="w-full px-4 py-3 border-2 border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--calendar-bg-hover)] transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {isModalOpen && selectedSlot && (
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedSlot(null)
          }}
          preselectedDate={selectedSlot.start}
          preselectedEndDate={selectedSlot.end}
          onSuccess={() => {
            fetchData()
            setIsModalOpen(false)
            setSelectedSlot(null)
            toast.success("Appointment created!")
          }}
        />
      )}

      {/* Block Time Modal */}
      {isBlockModalOpen && selectedSlot && (
        <BlockTimeModal
          isOpen={isBlockModalOpen}
          onClose={() => {
            setIsBlockModalOpen(false)
            setSelectedSlot(null)
          }}
          preselectedDate={selectedSlot.start}
          preselectedEndDate={selectedSlot.end}
          onSuccess={() => {
            fetchData()
            setIsBlockModalOpen(false)
            setSelectedSlot(null)
            toast.success("Time blocked!")
          }}
        />
      )}

      {/* Appointment Detail Modal */}
      {showAppointmentDetail && selectedEvent && selectedEvent.type === "appointment" && (() => {
        // Find the full appointment object from our appointments state
        const appointment = appointments.find(a => a.id === selectedEvent.id)
        if (!appointment) return null

        return (
          <AppointmentDetailModal
            isOpen={showAppointmentDetail}
            onClose={() => {
              setShowAppointmentDetail(false)
              setSelectedEvent(null)
            }}
            appointment={appointment}
            onUpdate={() => {
              fetchData()
              setShowAppointmentDetail(false)
              setSelectedEvent(null)
            }}
          />
        )
      })()}

      {/* Blocked Time Detail Modal - Skip for now as it needs the BlockedTime object */}
      {/* We'll need to store blocked times in state to support this properly */}

      {/* ========== PHASE 2 COMPONENTS ========== */}

      {/* Quick Create Popover */}
      {quickCreatePopover.isOpen && quickCreatePopover.slot && (
        <QuickCreatePopover
          isOpen={quickCreatePopover.isOpen}
          position={quickCreatePopover.position}
          slot={quickCreatePopover.slot}
          onClose={() => setQuickCreatePopover({ isOpen: false, position: { x: 0, y: 0 }, slot: null })}
          onSubmit={async (data) => {
            try {
              const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              })
              if (!response.ok) throw new Error()
              await fetchData()
              toast.success('Appointment created!')
              setQuickCreatePopover({ isOpen: false, position: { x: 0, y: 0 }, slot: null })
            } catch (err) {
              toast.error('Failed to create appointment')
            }
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.target && (
        <CalendarContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          target={contextMenu.target}
          onAction={async (action, target) => {
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, target: null })

            if (action === 'schedule' && target.type === 'slot') {
              const slot = target.data as any
              setSelectedSlot({ start: slot.start, end: slot.end })
              setIsModalOpen(true)
            } else if (action === 'block' && target.type === 'slot') {
              const slot = target.data as any
              setSelectedSlot({ start: slot.start, end: slot.end })
              setIsBlockModalOpen(true)
            } else if (action === 'edit' && target.type === 'event') {
              const event = target.data as CalendarEvent
              handleEventClick(event)
            } else if (action === 'complete' && target.type === 'event') {
              const event = target.data as CalendarEvent
              if (event.type === 'appointment') {
                completeAppointment(event.id)
              }
            } else if (action === 'delete' && target.type === 'event') {
              const event = target.data as CalendarEvent
              if (confirm(`Delete this ${event.type}?`)) {
                try {
                  const endpoint = event.type === 'appointment' ? '/api/appointments' : '/api/blocked-times'
                  const response = await fetch(`${endpoint}/${event.id}`, { method: 'DELETE' })
                  if (!response.ok) throw new Error()
                  await fetchData()
                  toast.success(`${event.type === 'appointment' ? 'Appointment' : 'Blocked time'} deleted`)
                } catch (err) {
                  toast.error('Failed to delete')
                }
              }
            } else if (action === 'cancel' && target.type === 'event') {
              const event = target.data as CalendarEvent
              if (confirm(`Cancel this appointment?`)) {
                handleQuickAction('cancel', event)
              }
            }
          }}
          onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, target: null })}
        />
      )}

      {/* Drag to Block Overlay */}
      {isDragging && dragSelection && (
        <DragToBlockOverlay
          dragSelection={dragSelection}
        />
      )}

      {/* Block Time Quick Menu */}
      {showQuickMenu && dragSelection && (
        <BlockTimeQuickMenu
          timeRange={{ start: dragSelection.startSlot, end: dragSelection.endSlot }}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          onConfirm={async (reason) => {
            try {
              await confirmSelection(reason)
              await fetchData()
              toast.success('Time blocked!')
            } catch (err) {
              toast.error('Failed to block time')
            }
          }}
          onCancel={cancelSelection}
        />
      )}

      {/* All Done Celebration */}
      {showCelebration && (
        <AllDoneCelebration
          isOpen={showCelebration}
          count={celebrationCount}
          onClose={() => setShowCelebration(false)}
          onViewTomorrow={() => {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            goToDate(tomorrow)
            setShowCelebration(false)
          }}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      {commandPaletteOpen && (
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          query={query}
          onQueryChange={setQuery}
          results={results}
          onExecute={async (result) => {
            await execute(result)
            setCommandPaletteOpen(false)
          }}
        />
      )}

      {/* Block Time Templates Sidebar */}
      {showTemplates && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-[var(--calendar-bg-primary)] border-l border-[var(--border)] shadow-2xl z-50">
          <BlockTimeTemplates
            templates={templates}
            onApply={async (templateId, weeks) => {
              try {
                const startDate = currentDate.toISOString()
                const response = await fetch('/api/blocked-times/apply-template', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ templateId, startDate, weeks })
                })
                if (!response.ok) throw new Error()
                await fetchData()
                toast.success('Template applied!')
              } catch (err) {
                toast.error('Failed to apply template')
              }
            }}
            onEdit={(template) => {
              // TODO: Implement edit functionality
              console.log('Edit template:', template)
            }}
            onDelete={async (templateId) => {
              // TODO: Implement delete functionality
              console.log('Delete template:', templateId)
            }}
            onCreate={() => {
              // TODO: Implement create functionality
              console.log('Create template clicked')
            }}
          />
        </div>
      )}
    </div>
  )
}
