"use client"

import { useState, useEffect } from "react"

type ClientProfile = {
  user: {
    fullName: string
    email: string
    phone: string
  }
  trainer: {
    fullName: string
    email: string
  }
  billingFrequency: string
  sessionRate: number
  notes: string
}

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/profile")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profile")
      }

      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">View your account information and training details</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-gray-900">{profile.user.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{profile.user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{profile.user.phone || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Trainer Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trainer Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Trainer Name</label>
                <p className="mt-1 text-gray-900">{profile.trainer.fullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trainer Email</label>
                <p className="mt-1 text-gray-900">{profile.trainer.email}</p>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Frequency</label>
                <p className="mt-1 text-gray-900 capitalize">{profile.billingFrequency.replace("_", " ")}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Session Rate</label>
                <p className="mt-1 text-gray-900">${profile.sessionRate.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Trainer Notes */}
          {profile.notes && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trainer Notes</h2>
              <p className="text-gray-700">{profile.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">No profile information available</p>
        </div>
      )}
    </div>
  )
}
