// EventCreation Component Types

export interface Client {
  id: string
  fullName: string
  email: string
  phone?: string
  clientProfile?: {
    sessionRate: number
    lastSessionDate?: Date
    typicalFrequency?: number // days between sessions
  }
}

export interface ClientSuggestion extends Client {
  suggestionReason: 'pattern' | 'overdue' | 'recent'
  suggestionDetails?: string
  lastSessionDate?: Date
  daysSinceLastSession?: number
  isOverdue?: boolean
}

export interface TimeSlotSelection {
  start: Date
  end: Date
}

export interface Position {
  x: number
  y: number
}

export interface SmartDefaults {
  suggestedClients: ClientSuggestion[]
  suggestedDuration: number // in minutes
  suggestedType: 'appointment' | 'blocked'
}

export interface AppointmentCreateData {
  clientId: string
  startTime: Date
  endTime: Date
}
