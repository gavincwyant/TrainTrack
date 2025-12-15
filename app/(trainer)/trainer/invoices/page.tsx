"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Invoice = {
  id: string
  client: { fullName: string; email: string }
  amount: number
  dueDate: string
  status: string
  createdAt: string
  notes?: string
}

type MonthlyClientPreview = {
  client: { id: string; fullName: string; email: string }
  individualRate: number
  groupRate: number | null
  autoInvoiceEnabled: boolean
  completed: {
    sessions: Array<{ id: string; date: string; isGroupSession: boolean; rate: number }>
    groupCount: number
    individualCount: number
    total: number
  }
  scheduled: {
    count: number
    groupCount: number
    individualCount: number
  }
  projectedTotal: number
}

type MonthlyPreviewData = {
  billingPeriod: { start: string; end: string; month: string }
  monthlyInvoiceDay: number
  clients: MonthlyClientPreview[]
  totals: { completedTotal: number; projectedTotal: number; clientCount: number }
}

type PrepaidClientData = {
  client: { id: string; fullName: string; email: string }
  currentBalance: number
  targetBalance: number
  sessionsConsumedSinceLastCredit: number
  lastTransactionDate: string | null
  balanceStatus: "healthy" | "low" | "empty"
}

type PrepaidData = {
  clients: PrepaidClientData[]
  totals: {
    totalBalance: number
    totalTarget: number
    clientCount: number
    clientsNeedingAttention: number
  }
}

type SortField = "client" | "amount" | "createdAt" | "dueDate" | "status"
type SortOrder = "asc" | "desc"
type ViewTab = "invoices" | "monthly" | "prepaid"

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("invoices")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [isLoading, setIsLoading] = useState(true)
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null)
  const [celebratingInvoiceId, setCelebratingInvoiceId] = useState<string | null>(null)
  const [isMarkingAllPaid, setIsMarkingAllPaid] = useState(false)
  const [showMassiveCelebration, setShowMassiveCelebration] = useState(false)

  // Monthly billing state
  const [monthlyPreview, setMonthlyPreview] = useState<MonthlyPreviewData | null>(null)
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  // Prepaid billing state
  const [prepaidData, setPrepaidData] = useState<PrepaidData | null>(null)
  const [isLoadingPrepaid, setIsLoadingPrepaid] = useState(false)
  const [showAddCreditModal, setShowAddCreditModal] = useState(false)
  const [selectedPrepaidClient, setSelectedPrepaidClient] = useState<PrepaidClientData | null>(null)

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices()
    } else if (activeTab === "monthly") {
      fetchMonthlyPreview()
    } else if (activeTab === "prepaid") {
      fetchPrepaidData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeTab])

  const fetchMonthlyPreview = async () => {
    setIsLoadingMonthly(true)
    try {
      const response = await fetch("/api/invoices/monthly-preview")
      const data = await response.json()
      setMonthlyPreview(data)
    } catch (error) {
      console.error("Failed to fetch monthly preview:", error)
    } finally {
      setIsLoadingMonthly(false)
    }
  }

  const fetchPrepaidData = async () => {
    setIsLoadingPrepaid(true)
    try {
      const response = await fetch("/api/prepaid")
      const data = await response.json()
      if (data.clients && data.totals) {
        setPrepaidData(data)
      } else {
        console.error("Invalid prepaid data response:", data)
        setPrepaidData(null)
      }
    } catch (error) {
      console.error("Failed to fetch prepaid data:", error)
      setPrepaidData(null)
    } finally {
      setIsLoadingPrepaid(false)
    }
  }

  const handleAddCredit = async (amount: number, notes?: string) => {
    if (!selectedPrepaidClient) return

    try {
      const response = await fetch(`/api/prepaid/${selectedPrepaidClient.client.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes }),
      })

      if (!response.ok) {
        throw new Error("Failed to add credit")
      }

      // Refresh the prepaid data
      await fetchPrepaidData()
      setShowAddCreditModal(false)
      setSelectedPrepaidClient(null)
    } catch (error) {
      console.error("Failed to add credit:", error)
      alert("Failed to add credit. Please try again.")
    }
  }

  const getBalanceStatusColor = (status: "healthy" | "low" | "empty") => {
    switch (status) {
      case "healthy":
        return "text-green-600 dark:text-green-400"
      case "low":
        return "text-yellow-600 dark:text-yellow-400"
      case "empty":
        return "text-red-600 dark:text-red-400"
    }
  }

  const getBalanceStatusBg = (status: "healthy" | "low" | "empty") => {
    switch (status) {
      case "healthy":
        return "bg-green-100 dark:bg-green-900/30"
      case "low":
        return "bg-yellow-100 dark:bg-yellow-900/30"
      case "empty":
        return "bg-red-100 dark:bg-red-900/30"
    }
  }

  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  useEffect(() => {
    filterAndSortInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, searchQuery, dateFilter, customStartDate, customEndDate, sortField, sortOrder])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invoices?status=${filter}`)
      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error("Failed to fetch invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortInvoices = () => {
    let filtered = [...invoices]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (invoice) =>
          invoice.client.fullName.toLowerCase().includes(query) ||
          invoice.client.email.toLowerCase().includes(query) ||
          invoice.id.toLowerCase().includes(query) ||
          invoice.amount.toString().includes(query)
      )
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.createdAt)

        switch (dateFilter) {
          case "today":
            const invoiceDay = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth(), invoiceDate.getDate())
            return invoiceDay.getTime() === today.getTime()

          case "week":
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return invoiceDate >= weekAgo

          case "month":
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return invoiceDate >= monthAgo

          case "custom":
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate)
              const end = new Date(customEndDate)
              end.setHours(23, 59, 59, 999)
              return invoiceDate >= start && invoiceDate <= end
            }
            return true

          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case "client":
          aValue = a.client.fullName.toLowerCase()
          bValue = b.client.fullName.toLowerCase()
          break
        case "amount":
          aValue = Number(a.amount)
          bValue = Number(b.amount)
          break
        case "createdAt":
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case "dueDate":
          aValue = new Date(a.dueDate).getTime()
          bValue = new Date(b.dueDate).getTime()
          break
        case "status":
          aValue = a.status.toLowerCase()
          bValue = b.status.toLowerCase()
          break
        default:
          aValue = a.createdAt
          bValue = b.createdAt
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    setFilteredInvoices(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new field and default to ascending
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-400 dark:text-gray-500 ml-1">↕</span>
    }
    return sortOrder === "asc" ? (
      <span className="ml-1 text-gray-700 dark:text-gray-200">↑</span>
    ) : (
      <span className="ml-1 text-gray-700 dark:text-gray-200">↓</span>
    )
  }

  const handleMarkAsPaid = async (invoiceId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Capture the button element reference before async operations
    const buttonElement = event.currentTarget as HTMLElement

    setUpdatingInvoiceId(invoiceId)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      // Parse response to ensure it's valid
      await response.json()

      // Trigger celebration animation
      setCelebratingInvoiceId(invoiceId)

      // Create confetti effect
      createConfetti(buttonElement)

      // Update the invoice in state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: "PAID" } : inv
        )
      )

      // Clear celebration after animation
      setTimeout(() => {
        setCelebratingInvoiceId(null)
      }, 1000)
    } catch (error) {
      console.error("Failed to mark invoice as paid:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Failed to mark invoice as paid: ${errorMessage}`)
    } finally {
      setUpdatingInvoiceId(null)
    }
  }

  const handleMarkAllAsPaid = async () => {
    const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== "PAID")

    if (unpaidInvoices.length === 0) {
      alert("All visible invoices are already marked as paid!")
      return
    }

    const confirmMessage = `Are you sure you want to mark ${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? 's' : ''} as paid? This action cannot be undone.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsMarkingAllPaid(true)

    try {
      // Mark all unpaid invoices as paid
      const promises = unpaidInvoices.map(invoice =>
        fetch(`/api/invoices/${invoice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PAID" }),
        })
      )

      await Promise.all(promises)

      // Update all invoices in state
      setInvoices((prev) =>
        prev.map((inv) =>
          unpaidInvoices.some(u => u.id === inv.id)
            ? { ...inv, status: "PAID" }
            : inv
        )
      )

      // Trigger MASSIVE celebration
      setShowMassiveCelebration(true)
      createMassiveConfetti()

      // Clear celebration after animation
      setTimeout(() => {
        setShowMassiveCelebration(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to mark all invoices as paid:", error)
      alert("Some invoices failed to update. Please try again.")
    } finally {
      setIsMarkingAllPaid(false)
    }
  }

  const createConfetti = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

    for (let i = 0; i < 30; i++) {
      const confetti = document.createElement("div")
      confetti.style.position = "fixed"
      confetti.style.left = `${rect.left + rect.width / 2}px`
      confetti.style.top = `${rect.top + rect.height / 2}px`
      confetti.style.width = "8px"
      confetti.style.height = "8px"
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.borderRadius = "50%"
      confetti.style.pointerEvents = "none"
      confetti.style.zIndex = "9999"
      document.body.appendChild(confetti)

      const angle = (Math.PI * 2 * i) / 30
      const velocity = 3 + Math.random() * 3
      const vx = Math.cos(angle) * velocity
      const vy = Math.sin(angle) * velocity - 2

      let x = 0
      let y = 0
      let opacity = 1

      const animate = () => {
        x += vx
        y += vy + 0.3
        opacity -= 0.02

        confetti.style.transform = `translate(${x}px, ${y}px)`
        confetti.style.opacity = opacity.toString()

        if (opacity > 0) {
          requestAnimationFrame(animate)
        } else {
          confetti.remove()
        }
      }

      requestAnimationFrame(animate)
    }
  }

  const createMassiveConfetti = () => {
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

    // Find the "Mark All" button to use as the origin point
    const markAllButton = document.querySelector('th button') as HTMLElement
    if (!markAllButton) return

    const rect = markAllButton.getBoundingClientRect()

    // Create 150 confetti particles (5x the original 30)
    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement("div")
      confetti.style.position = "fixed"
      confetti.style.left = `${rect.left + rect.width / 2}px`
      confetti.style.top = `${rect.top + rect.height / 2}px`
      confetti.style.width = "12px"  // Slightly bigger than original 8px
      confetti.style.height = "12px"
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.borderRadius = "50%"
      confetti.style.pointerEvents = "none"
      confetti.style.zIndex = "9999"
      document.body.appendChild(confetti)

      const angle = (Math.PI * 2 * i) / 150
      const velocity = 5 + Math.random() * 5  // Increased velocity (original was 3-6)
      const vx = Math.cos(angle) * velocity
      const vy = Math.sin(angle) * velocity - 3  // Increased upward bias

      let x = 0
      let y = 0
      let opacity = 1

      const animate = () => {
        x += vx
        y += vy + 0.4  // Increased gravity
        opacity -= 0.015  // Slower fade (original was 0.02)

        confetti.style.transform = `translate(${x}px, ${y}px)`
        confetti.style.opacity = opacity.toString()

        if (opacity > 0) {
          requestAnimationFrame(animate)
        } else {
          confetti.remove()
        }
      }

      requestAnimationFrame(animate)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
      case "OVERDUE":
        return "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300"
      case "SENT":
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
      case "DRAFT":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
      case "CANCELLED":
        return "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300"
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
    }
  }

  // Check if an invoice is a prepaid top-up invoice
  const isPrepaidTopUp = (invoice: Invoice) =>
    invoice.notes?.includes("Prepaid balance replenishment")

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">View and manage your client invoices</p>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-1 inline-flex">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "invoices"
              ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          All Invoices
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "monthly"
              ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Monthly Billing
        </button>
        <button
          onClick={() => setActiveTab("prepaid")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === "prepaid"
              ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Prepaid Balances
        </button>
      </div>

      {activeTab === "invoices" && (
        <>
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, invoice ID, or amount..."
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Date Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
            {["all", "today", "week", "month", "custom"].map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period as typeof dateFilter)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                  dateFilter === period
                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {period === "all"
                  ? "All Time"
                  : period === "today"
                  ? "Today"
                  : period === "week"
                  ? "Last 7 Days"
                  : period === "month"
                  ? "Last 30 Days"
                  : "Custom Range"}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {dateFilter === "custom" && (
            <div className="flex gap-3 items-center pt-2 pb-1">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Results Summary */}
          {(searchQuery || dateFilter !== "all") && (
            <div className="flex items-center gap-2 pt-1">
              <svg className="h-4 w-4 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Showing {filteredInvoices.length} of {invoices.length} invoice
                {filteredInvoices.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          {[
            { value: "all", label: "All" },
            { value: "SENT", label: "Sent" },
            { value: "PAID", label: "Paid" },
            { value: "OVERDUE", label: "Overdue" },
            { value: "DRAFT", label: "Draft" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap min-h-[44px] ${
                filter === tab.value
                  ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>


      {/* Invoice list */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invoices found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? `No invoices match "${searchQuery}"`
              : filter === "all"
              ? "Invoices will be automatically generated when appointments are completed."
              : `No ${filter.toLowerCase()} invoices found.`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {invoice.client.fullName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {invoice.client.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                      {isPrepaidTopUp(invoice) && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                          Prepaid Top-Up
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <dl className="px-4 py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Amount</dt>
                    <dd className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ${Number(invoice.amount).toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                    <dd className="text-gray-900 dark:text-gray-100">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Due Date</dt>
                    <dd className="text-gray-900 dark:text-gray-100">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>

                {/* Card Actions */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex gap-2">
                    {invoice.status !== "PAID" && (
                      <button
                        onClick={(e) => handleMarkAsPaid(invoice.id, e)}
                        disabled={updatingInvoiceId === invoice.id}
                        className={`
                          flex-1 px-3 py-2 text-sm font-medium text-center rounded-md min-h-[44px] flex items-center justify-center
                          transition-all duration-200
                          ${
                            updatingInvoiceId === invoice.id
                              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-wait"
                              : celebratingInvoiceId === invoice.id
                              ? "bg-green-600 dark:bg-green-500 text-white"
                              : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                          }
                        `}
                      >
                        {updatingInvoiceId === invoice.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : celebratingInvoiceId === invoice.id ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-bounce">💰</span> Paid!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span>✓</span> Mark Paid
                          </span>
                        )}
                      </button>
                    )}
                    <Link
                      href={`/trainer/invoices/${invoice.id}`}
                      className={`${invoice.status !== "PAID" ? "flex-1" : "w-full"} px-3 py-2 text-sm font-medium text-center rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 min-h-[44px] flex items-center justify-center`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  onClick={() => handleSort("client")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    Client
                    {getSortIcon("client")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("amount")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    Amount
                    {getSortIcon("amount")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    Created
                    {getSortIcon("createdAt")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("dueDate")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    Due Date
                    {getSortIcon("dueDate")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                {filteredInvoices.some((inv) => inv.status !== "PAID") && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={handleMarkAllAsPaid}
                      disabled={isMarkingAllPaid || showMassiveCelebration}
                      className={`
                        relative overflow-hidden px-3 py-1.5 rounded-md font-medium text-xs
                        transition-all duration-200
                        ${
                          isMarkingAllPaid || showMassiveCelebration
                            ? "border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-wait"
                            : "border border-green-500 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-600 dark:hover:border-green-500"
                        }
                      `}
                    >
                      {isMarkingAllPaid ? (
                        <span className="flex items-center gap-1">
                          <svg
                            className="animate-spin h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </span>
                      ) : showMassiveCelebration ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-bounce text-sm">💰</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs">
                          <span>✓</span>
                          All
                        </span>
                      )}
                    </button>
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {invoice.client.fullName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.client.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ${Number(invoice.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                      {isPrepaidTopUp(invoice) && (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                          Prepaid
                        </span>
                      )}
                    </div>
                  </td>
                  {filteredInvoices.some((inv) => inv.status !== "PAID") && (
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {invoice.status !== "PAID" ? (
                        <button
                          onClick={(e) => handleMarkAsPaid(invoice.id, e)}
                          disabled={updatingInvoiceId === invoice.id}
                          className={`
                            relative overflow-hidden px-3 py-1.5 rounded-md font-medium text-sm
                            transition-all duration-200 transform
                            ${
                              updatingInvoiceId === invoice.id
                                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-wait"
                                : celebratingInvoiceId === invoice.id
                                ? "bg-green-600 dark:bg-green-500 text-white scale-110 shadow-lg"
                                : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 hover:scale-105 hover:shadow-md active:scale-95"
                            }
                          `}
                        >
                          {updatingInvoiceId === invoice.id ? (
                            <span className="flex items-center gap-1">
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            </span>
                          ) : celebratingInvoiceId === invoice.id ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-bounce">💰</span>
                              Paid!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span>✓</span>
                              Mark Paid
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <Link
                      href={`/trainer/invoices/${invoice.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
        </>
      )}

      {/* Monthly Billing Tab */}
      {activeTab === "monthly" && (
        <>
          {isLoadingMonthly ? (
            <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading monthly billing data...</p>
            </div>
          ) : monthlyPreview ? (
            <>
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{monthlyPreview.billingPeriod.month}</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Monthly invoices generate on day {monthlyPreview.monthlyInvoiceDay} of each month
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">${monthlyPreview.totals.completedTotal.toFixed(2)}</p>
                      <p className="text-blue-100 text-sm">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">${monthlyPreview.totals.projectedTotal.toFixed(2)}</p>
                      <p className="text-blue-100 text-sm">Projected</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{monthlyPreview.totals.clientCount}</p>
                      <p className="text-blue-100 text-sm">Clients</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client List */}
              {monthlyPreview.clients.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No monthly billing clients</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You don&apos;t have any clients set up with monthly billing yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyPreview.clients.map((clientData) => (
                    <div
                      key={clientData.client.id}
                      className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Client Header - Always Visible */}
                      <button
                        onClick={() => toggleClientExpanded(clientData.client.id)}
                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="min-w-0 text-left">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {clientData.client.fullName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {clientData.client.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0">
                          {/* Session Counts */}
                          <div className="hidden sm:flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {clientData.completed.sessions.length}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">completed</span>
                            </div>
                            <div className="text-center">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {clientData.scheduled.count}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-1">scheduled</span>
                            </div>
                          </div>
                          {/* Totals */}
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                              ${clientData.completed.total.toFixed(2)}
                            </p>
                            {clientData.projectedTotal > clientData.completed.total && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Projected: ${clientData.projectedTotal.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {/* Expand Icon */}
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedClients.has(clientData.client.id) ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {expandedClients.has(clientData.client.id) && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                          {/* Rates Info */}
                          <div className="flex flex-wrap gap-4 mb-4 text-sm">
                            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                              <span className="text-gray-500 dark:text-gray-400">Individual Rate: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                ${clientData.individualRate.toFixed(2)}
                              </span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                              <span className="text-gray-500 dark:text-gray-400">Group Rate: </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {clientData.groupRate ? `$${clientData.groupRate.toFixed(2)}` : "N/A"}
                              </span>
                            </div>
                            <div className={`px-3 py-2 rounded-lg border ${
                              clientData.autoInvoiceEnabled
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                            }`}>
                              <span className={`font-medium ${
                                clientData.autoInvoiceEnabled
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-yellow-700 dark:text-yellow-300"
                              }`}>
                                {clientData.autoInvoiceEnabled ? "Auto-Invoice On" : "Auto-Invoice Off"}
                              </span>
                            </div>
                          </div>

                          {/* Session Details */}
                          {clientData.completed.sessions.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Completed Sessions This Month
                              </h4>
                              <div className="space-y-2">
                                {clientData.completed.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-900 dark:text-gray-100">
                                        {new Date(session.date).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                      {session.isGroupSession ? (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                          Group
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                          Individual
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      ${session.rate.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {/* Session Summary */}
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {clientData.completed.individualCount} individual, {clientData.completed.groupCount} group
                                </span>
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                  Total: ${clientData.completed.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No completed sessions this month
                            </p>
                          )}

                          {/* Scheduled Sessions Info */}
                          {clientData.scheduled.count > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {clientData.scheduled.count} scheduled sessions
                                </span>
                                {" "}remaining this month
                                {clientData.scheduled.groupCount > 0 && (
                                  <span className="text-gray-500">
                                    {" "}({clientData.scheduled.individualCount} individual, {clientData.scheduled.groupCount} group)
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Link to Client */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Link
                              href={`/trainer/clients/${clientData.client.id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            >
                              View Client Profile →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Failed to load monthly billing data</p>
            </div>
          )}
        </>
      )}

      {/* Prepaid Balances Tab */}
      {activeTab === "prepaid" && (
        <>
          {isLoadingPrepaid ? (
            <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading prepaid balances...</p>
            </div>
          ) : prepaidData && prepaidData.totals ? (
            <>
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Prepaid Balances</h2>
                    <p className="text-purple-100 text-sm mt-1">
                      Clients with prepaid session credits
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">${prepaidData.totals.totalBalance.toFixed(2)}</p>
                      <p className="text-purple-100 text-sm">Total Balance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{prepaidData.totals.clientCount}</p>
                      <p className="text-purple-100 text-sm">Clients</p>
                    </div>
                    {prepaidData.totals.clientsNeedingAttention > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-300">{prepaidData.totals.clientsNeedingAttention}</p>
                        <p className="text-purple-100 text-sm">Need Attention</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client List */}
              {prepaidData.clients.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No prepaid clients</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You don&apos;t have any clients set up with prepaid billing yet. Add prepaid credit to a client to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prepaidData.clients.map((clientData) => (
                    <div
                      key={clientData.client.id}
                      className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getBalanceStatusBg(clientData.balanceStatus)}`}>
                            <div className={`w-3 h-3 rounded-full ${
                              clientData.balanceStatus === "healthy" ? "bg-green-500" :
                              clientData.balanceStatus === "low" ? "bg-yellow-500" : "bg-red-500"
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {clientData.client.fullName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {clientData.client.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0">
                          {/* Balance Info */}
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getBalanceStatusColor(clientData.balanceStatus)}`}>
                              ${clientData.currentBalance.toFixed(2)}
                            </p>
                            {clientData.targetBalance > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Target: ${clientData.targetBalance.toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Sessions consumed */}
                          {clientData.sessionsConsumedSinceLastCredit > 0 && (
                            <div className="text-center hidden sm:block">
                              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                {clientData.sessionsConsumedSinceLastCredit}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Sessions Used
                              </p>
                            </div>
                          )}

                          {/* Add Credit Button */}
                          <button
                            onClick={() => {
                              setSelectedPrepaidClient(clientData)
                              setShowAddCreditModal(true)
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                          >
                            Add Credit
                          </button>
                        </div>
                      </div>

                      {/* Last transaction info */}
                      {clientData.lastTransactionDate && (
                        <div className="px-4 sm:px-6 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last transaction: {new Date(clientData.lastTransactionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">Failed to load prepaid data</p>
            </div>
          )}
        </>
      )}

      {/* Add Credit Modal */}
      {showAddCreditModal && selectedPrepaidClient && (
        <AddCreditModal
          client={selectedPrepaidClient}
          onClose={() => {
            setShowAddCreditModal(false)
            setSelectedPrepaidClient(null)
          }}
          onSubmit={handleAddCredit}
        />
      )}
    </div>
  )
}

// Add Credit Modal Component
function AddCreditModal({
  client,
  onClose,
  onSubmit,
}: {
  client: PrepaidClientData
  onClose: () => void
  onSubmit: (amount: number, notes?: string) => Promise<void>
}) {
  const [amount, setAmount] = useState(
    client.targetBalance > 0 ? (client.targetBalance - client.currentBalance).toFixed(2) : ""
  )
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setIsSubmitting(true)
    await onSubmit(numAmount, notes || undefined)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Prepaid Credit
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {client.client.fullName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Balance Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                ${client.currentBalance.toFixed(2)}
              </span>
            </div>
            {client.targetBalance > 0 && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Target Balance</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  ${client.targetBalance.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount to Add (USD)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
            {client.targetBalance > 0 && client.currentBalance < client.targetBalance && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${(client.targetBalance - client.currentBalance).toFixed(2)} needed to reach target
              </p>
            )}
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
              placeholder="e.g., Cash payment received"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Credit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
