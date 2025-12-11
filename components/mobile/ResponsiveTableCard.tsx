"use client"

import { ReactNode } from "react"

type FieldConfig<T> = {
  key: keyof T
  label: string
  render?: (value: T[keyof T], item: T) => ReactNode
}

type ResponsiveTableCardProps<T> = {
  item: T
  primaryField: keyof T
  primaryRender?: (value: T[keyof T], item: T) => ReactNode
  secondaryField?: keyof T
  secondaryRender?: (value: T[keyof T], item: T) => ReactNode
  badge?: ReactNode
  fields: FieldConfig<T>[]
  actions?: ReactNode
  onClick?: () => void
  className?: string
}

export function ResponsiveTableCard<T extends Record<string, unknown>>({
  item,
  primaryField,
  primaryRender,
  secondaryField,
  secondaryRender,
  badge,
  fields,
  actions,
  onClick,
  className = "",
}: ResponsiveTableCardProps<T>) {
  const primaryValue = item[primaryField]
  const secondaryValue = secondaryField ? item[secondaryField] : undefined

  return (
    <div
      className={`
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-lg
        shadow-sm
        overflow-hidden
        ${onClick ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {primaryRender
                ? primaryRender(primaryValue, item)
                : String(primaryValue ?? "")}
            </h3>
            {secondaryField && secondaryValue !== undefined && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {secondaryRender
                  ? secondaryRender(secondaryValue, item)
                  : String(secondaryValue ?? "")}
              </p>
            )}
          </div>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
      </div>

      {/* Body - Key/Value pairs */}
      {fields.length > 0 && (
        <dl className="px-4 py-3 space-y-2">
          {fields.map((field) => {
            const value = item[field.key]
            return (
              <div
                key={String(field.key)}
                className="flex justify-between items-center text-sm"
              >
                <dt className="text-gray-500 dark:text-gray-400">{field.label}</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium text-right">
                  {field.render ? field.render(value, item) : String(value ?? "-")}
                </dd>
              </div>
            )
          })}
        </dl>
      )}

      {/* Actions */}
      {actions && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </div>
  )
}

// Helper component for card action buttons
type CardActionButtonProps = {
  onClick: (e: React.MouseEvent) => void
  children: ReactNode
  variant?: "primary" | "secondary" | "danger"
  className?: string
}

export function CardActionButton({
  onClick,
  children,
  variant = "secondary",
  className = "",
}: CardActionButtonProps) {
  const variantClasses = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
    secondary:
      "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600",
    danger:
      "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className={`
        px-3 py-2
        text-sm font-medium
        rounded-md
        min-h-[44px]
        transition-colors
        flex-1 sm:flex-none
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
