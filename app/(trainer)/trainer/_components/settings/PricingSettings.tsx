import { useState, useEffect, useRef } from "react"
import { Settings } from "../useTrainerSettings"

type Props = {
  settings: Settings | null
  isLoading: boolean
  onIndividualRateChange: (rate: number) => Promise<boolean>
  onGroupRateChange: (rate: number) => Promise<boolean>
}

export function PricingSettings({
  settings,
  isLoading,
  onIndividualRateChange,
  onGroupRateChange,
}: Props) {
  const [individualRate, setIndividualRate] = useState<string>("")
  const [groupRate, setGroupRate] = useState<string>("")
  const initializedRef = useRef(false)

  useEffect(() => {
    if (settings && !initializedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndividualRate(settings.defaultIndividualSessionRate?.toString() || "")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGroupRate(settings.defaultGroupSessionRate?.toString() || "")
      initializedRef.current = true
    }
  }, [settings])

  const handleIndividualRateBlur = async () => {
    const rate = parseFloat(individualRate)
    if (!isNaN(rate) && rate >= 0) {
      await onIndividualRateChange(rate)
    }
  }

  const handleGroupRateBlur = async () => {
    const rate = parseFloat(groupRate)
    if (!isNaN(rate) && rate >= 0) {
      await onGroupRateChange(rate)
    }
  }

  if (isLoading) {
    return <div className="text-gray-600">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pricing</h2>
        <p className="mt-2 text-gray-600">Set your default session rates for individual and group training</p>
      </div>

      <div className="space-y-6">
        {/* Individual Session Rate */}
        <div>
          <label htmlFor="individualRate" className="block text-sm font-medium text-gray-700">
            Default Individual Session Rate
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Default rate for one-on-one training sessions
          </p>
          <div className="mt-1 relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="individualRate"
              value={individualRate}
              onChange={(e) => setIndividualRate(e.target.value)}
              onBlur={handleIndividualRateBlur}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">per session</p>
          <p className="mt-1 text-xs text-gray-500">
            This rate will be used as the default when creating new clients
          </p>
        </div>

        {/* Group Session Rate */}
        <div>
          <label htmlFor="groupRate" className="block text-sm font-medium text-gray-700">
            Default Group Session Rate
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Default rate for group training sessions
          </p>
          <div className="mt-1 relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              id="groupRate"
              value={groupRate}
              onChange={(e) => setGroupRate(e.target.value)}
              onBlur={handleGroupRateBlur}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">per session</p>
          <p className="mt-1 text-xs text-gray-500">
            This rate will be used for group training sessions (coming soon)
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How pricing works:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Default rates are applied when creating new client profiles</li>
            <li>You can override rates on a per-client basis in their profile</li>
            <li>Individual sessions are one-on-one training appointments</li>
            <li>Group sessions allow multiple clients in the same time slot</li>
            <li>Rates are used for automatic invoice generation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
