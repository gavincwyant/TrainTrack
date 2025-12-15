"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type User = {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: string
  workspaceId: string | null
  isSystemAdmin: boolean
  profileImage: string | null
}

type Workspace = {
  id: string
  name: string
}

type UserFormProps = {
  user?: User
  workspaces: Workspace[]
}

export default function UserForm({ user, workspaces }: UserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    email: user?.email || "",
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    role: user?.role || "TRAINER",
    workspaceId: user?.workspaceId || "",
    isSystemAdmin: user?.isSystemAdmin || false,
    profileImage: user?.profileImage || "",
    password: "", // Only for new users or when changing password
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = user
        ? `/api/admin/users/${user.id}`
        : "/api/admin/users"

      const method = user ? "PUT" : "POST"

      const body = {
        ...formData,
        // Only include password if it's set (for new users or password changes)
        ...(formData.password ? { password: formData.password } : {}),
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save user")
      }

      router.push("/admin/users")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Profile Image URL
          </label>
          <input
            type="url"
            value={formData.profileImage}
            onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password {user ? "(leave blank to keep current)" : "*"}
          </label>
          <input
            type="password"
            required={!user}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder={user ? "Leave blank to keep current password" : "Enter password"}
          />
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Role & Permissions</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role *
          </label>
          <select
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TRAINER">Trainer</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Workspace
          </label>
          <select
            value={formData.workspaceId}
            onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Trainers typically own a workspace, clients belong to a trainer&apos;s workspace
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSystemAdmin"
            checked={formData.isSystemAdmin}
            onChange={(e) => setFormData({ ...formData, isSystemAdmin: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          />
          <label htmlFor="isSystemAdmin" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
            System Administrator
          </label>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          System administrators have full access to all users and workspaces
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-6">
        <Link
          href="/admin/users"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : user ? "Update User" : "Create User"}
        </button>
      </div>
    </form>
  )
}
