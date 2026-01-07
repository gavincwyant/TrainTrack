"use client"

import { useState } from "react"

type Props = {
  businessName: string | null
  trainerName: string | null
  trainerEmail: string | null
  trainerPhone: string | null
  isLoading: boolean
  onUpdateBusiness: (data: { businessName: string }) => Promise<boolean>
  onUpdateProfile: (data: { fullName: string; phone?: string }) => Promise<boolean>
}

export function BusinessSettings({
  businessName,
  trainerName,
  trainerEmail,
  trainerPhone,
  isLoading,
  onUpdateBusiness,
  onUpdateProfile,
}: Props) {
  const [editingBusiness, setEditingBusiness] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState(businessName || "")
  const [newFullName, setNewFullName] = useState(trainerName || "")
  const [newPhone, setNewPhone] = useState(trainerPhone || "")
  const [isSavingBusiness, setIsSavingBusiness] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const handleSaveBusiness = async () => {
    if (!newBusinessName.trim()) return
    setIsSavingBusiness(true)
    const success = await onUpdateBusiness({ businessName: newBusinessName.trim() })
    setIsSavingBusiness(false)
    if (success) {
      setEditingBusiness(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!newFullName.trim()) return
    setIsSavingProfile(true)
    const success = await onUpdateProfile({
      fullName: newFullName.trim(),
      phone: newPhone.trim() || undefined
    })
    setIsSavingProfile(false)
    if (success) {
      setEditingProfile(false)
    }
  }

  const handleCancelBusiness = () => {
    setNewBusinessName(businessName || "")
    setEditingBusiness(false)
  }

  const handleCancelProfile = () => {
    setNewFullName(trainerName || "")
    setNewPhone(trainerPhone || "")
    setEditingProfile(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Business Settings
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your business name and profile information
        </p>
      </div>

      {/* Business Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Name
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              This is how your business appears to clients on invoices and communications
            </p>

            {editingBusiness ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
                  placeholder="Your Business Name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBusiness}
                    disabled={isSavingBusiness || !newBusinessName.trim()}
                    className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingBusiness ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelBusiness}
                    disabled={isSavingBusiness}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {businessName || "Not set"}
                </span>
                <button
                  onClick={() => setEditingBusiness(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Profile Information
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your personal details
            </p>
          </div>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={trainerEmail || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !newFullName.trim()}
                className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingProfile ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{trainerName || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{trainerEmail || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Phone</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">{trainerPhone || "Not set"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
