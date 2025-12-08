"use client"

import { useState, useEffect } from "react"

type PendingClientProfile = {
  id: string
  extractedName: string
  extractedEmail: string | null
  extractedPhone: string | null
  defaultBillingFrequency: string
  defaultSessionRate: number
  reviewedName: string | null
  reviewedEmail: string | null
  reviewedPhone: string | null
  reviewedNotes: string | null
}

type Props = {
  profile: PendingClientProfile
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    fullName: string
    email: string | null
    phone: string | null
    billingFrequency: "PER_SESSION" | "MONTHLY"
    sessionRate: number
    notes: string | null
    autoInvoiceEnabled: boolean
  }) => Promise<void>
}

export function ApproveClientModal({ profile, isOpen, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [billingFrequency, setBillingFrequency] = useState<"PER_SESSION" | "MONTHLY">("PER_SESSION")
  const [sessionRate, setSessionRate] = useState("")
  const [notes, setNotes] = useState("")
  const [autoInvoiceEnabled, setAutoInvoiceEnabled] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with profile data
  useEffect(() => {
    if (isOpen) {
      setFullName(profile.reviewedName || profile.extractedName)
      setEmail(profile.reviewedEmail || profile.extractedEmail || "")
      setPhone(profile.reviewedPhone || profile.extractedPhone || "")
      setBillingFrequency(profile.defaultBillingFrequency as "PER_SESSION" | "MONTHLY")
      setSessionRate(profile.defaultSessionRate.toString())
      setNotes(profile.reviewedNotes || "")
      setAutoInvoiceEnabled(true)
      setError(null)
    }
  }, [isOpen, profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const rate = parseFloat(sessionRate)
      if (isNaN(rate) || rate <= 0) {
        setError("Session rate must be a positive number")
        setIsSubmitting(false)
        return
      }

      await onSubmit({
        fullName: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        billingFrequency,
        sessionRate: rate,
        notes: notes.trim() || null,
        autoInvoiceEnabled,
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve client")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Review & Approve Client</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="optional"
            />
            <p className="mt-1 text-xs text-gray-500">
              If no email provided, a placeholder will be used (client won&apos;t have login access)
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="billingFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                Billing Frequency <span className="text-red-500">*</span>
              </label>
              <select
                id="billingFrequency"
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as "PER_SESSION" | "MONTHLY")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="PER_SESSION">Per Session</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>

            <div>
              <label htmlFor="sessionRate" className="block text-sm font-medium text-gray-700 mb-1">
                Session Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  id="sessionRate"
                  value={sessionRate}
                  onChange={(e) => setSessionRate(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Optional notes about this client"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoInvoiceEnabled"
              checked={autoInvoiceEnabled}
              onChange={(e) => setAutoInvoiceEnabled(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="autoInvoiceEnabled" className="ml-2 block text-sm text-gray-700">
              Auto-invoice enabled (automatically add completed appointments to invoices)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating Client..." : "Save & Approve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
