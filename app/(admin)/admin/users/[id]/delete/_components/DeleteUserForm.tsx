"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type DeleteUserFormProps = {
  userId: string
  userName: string
}

export default function DeleteUserForm({ userId, userName }: DeleteUserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmText, setConfirmText] = useState("")

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError('Please type "DELETE" to confirm')
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }

      router.push("/admin/users")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type <span className="font-bold">DELETE</span> to confirm deletion of {userName}
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || confirmText !== "DELETE"}
          className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Deleting..." : "Delete User"}
        </button>
      </div>
    </div>
  )
}
