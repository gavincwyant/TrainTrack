/**
 * Phone number validation and formatting utilities
 */

/**
 * Validate phone number format
 * Accepts various formats and validates they have enough digits
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/\D/g, "")
  // Valid US numbers have 10 digits, or 11 with country code
  // International numbers can be up to 15 digits
  return cleaned.length >= 10 && cleaned.length <= 15
}

/**
 * Format phone number to E.164 format for Twilio
 * E.164 format: +[country code][subscriber number]
 * Example: +14155551234
 */
export function formatPhoneToE164(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")

  // 10 digit US number - add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }

  // 11 digit number starting with 1 - assume US, add +
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`
  }

  // Already has country code or international number
  if (phone.startsWith("+")) {
    return phone
  }

  // Default: add + prefix
  return `+${cleaned}`
}

/**
 * Format phone number for display
 * Converts to (XXX) XXX-XXXX format for US numbers
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return ""

  const cleaned = phone.replace(/\D/g, "")

  // 10 digit US number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // 11 digit number starting with 1 (US with country code)
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }

  // Return original for international numbers
  return phone
}

/**
 * Check if phone number is a US number
 */
export function isUSPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  return (
    cleaned.length === 10 ||
    (cleaned.length === 11 && cleaned.startsWith("1"))
  )
}

/**
 * Mask phone number for privacy (show last 4 digits)
 * Example: (***) ***-1234
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ""

  const cleaned = phone.replace(/\D/g, "")

  if (cleaned.length < 4) {
    return "****"
  }

  const lastFour = cleaned.slice(-4)
  return `(***) ***-${lastFour}`
}
