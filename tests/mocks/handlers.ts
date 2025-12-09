import { googleCalendarHandlers } from './google-calendar'
import { sendgridHandlers } from './sendgrid'

/**
 * All MSW handlers for external APIs
 */
export const handlers = [...googleCalendarHandlers, ...sendgridHandlers]
