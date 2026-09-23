import { Button } from '@rentify/shared/ui/button'
import { useTranslation } from '@rentify/utils'
import { IconDownload, IconPlus, IconUpload } from '@tabler/icons-react'
import { cn } from '@rentify/utils'
import React from 'react'

// Define props with TypeScript for better type safety and clarity
interface ManagementHeaderProps {
  title: string
  subtitle: string | ((total: number) => React.ReactNode)
  totalItems?: number
  onImport?: () => void
  onExport?: () => void
  onCreate?: () => void
  exportDisabled?: boolean
  importLabel?: string
  exportLabel?: string
  createLabel?: string
  className?: string
}

/**
 * ManagementHeader Component
 *
 * A reusable header section commonly used in management dashboards.
 * Displays a title, subtitle, and optional Import/Export/Create buttons.
 */
export function ManagementHeader({
  title,
  subtitle,
  totalItems = 0,
  onImport,
  onExport,
  onCreate,
  exportDisabled = false,
  importLabel = 'Import',
  exportLabel = 'Export',
  createLabel = 'Create New',
  className = '',
}: ManagementHeaderProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      {/* Title and subtitle section */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent break-words">
            {t(title)}
          </h2>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <div className="hidden sm:block w-px h-6 bg-border" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {typeof subtitle === 'function'
                ? subtitle(totalItems)
                : t(subtitle)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Import Button */}
        {onImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-[100px] sm:min-w-0"
          >
            <IconUpload className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">
              {t(importLabel)}
            </span>
          </Button>
        )}

        {/* Export Button */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportDisabled}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-[100px] sm:min-w-0"
          >
            <IconDownload className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">
              {t(exportLabel)}
            </span>
          </Button>
        )}

        {/* Create Button - Primary action */}
        {onCreate && (
          <Button
            size="sm"
            onClick={onCreate}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-initial min-w-[120px] sm:min-w-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            <IconPlus className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xs:inline truncate">
              {t(createLabel)}
            </span>
          </Button>
        )}

        {/* Condensed mobile-only button group */}
        <div className="flex sm:hidden gap-1 w-full justify-end">
          {onImport && (
            <Button
              variant="outline"
              size="icon"
              onClick={onImport}
              className="h-9 w-9"
            >
              <IconUpload className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="icon"
              onClick={onExport}
              disabled={exportDisabled}
              className="h-9 w-9"
            >
              <IconDownload className="h-4 w-4" />
            </Button>
          )}
          {onCreate && (
            <Button size="icon" onClick={onCreate} className="h-9 w-9">
              <IconPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
