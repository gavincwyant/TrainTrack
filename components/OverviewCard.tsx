import Link from "next/link"

type OverviewCardProps = {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  href?: string
  highlight?: boolean
}

export function OverviewCard({
  title,
  value,
  subtitle,
  icon,
  href,
  highlight = false,
}: OverviewCardProps) {
  const content = (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${
        href ? "hover:shadow-md transition-shadow cursor-pointer" : ""
      } ${highlight ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
