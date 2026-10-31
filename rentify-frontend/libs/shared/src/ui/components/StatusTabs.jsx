import { Badge } from "@rentify/shared/ui/badge"
import { Button } from "@rentify/shared/ui/button"
import { useTranslation } from "@rentify/utils"
import { cn } from "@rentify/utils"

export function StatusTabs({
  statusFilters,
  statusCounts,
  currentStatus,
  onStatusChange,
  className = ""
}) {
  const { t } = useTranslation()

  return (
    <div className={cn("relative", className)}>
      <div className="flex overflow-x-auto gap-2 pb-4 hide-scrollbar">
        {Object.entries(statusFilters).map(([key, { label, icon }]) => {
          const isActive = currentStatus === key
          const count = statusCounts[key] || 0

          // Neutral filters: one quiet grey for every status, dark for the selected one.
          // Status colour belongs on the rows themselves, not on the filter bar.
          return (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(key)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full whitespace-nowrap transition-colors duration-200",
                isActive
                  ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                  : "bg-muted text-foreground/70 hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {icon && (
                <div className={cn("size-4", isActive ? "text-background" : "opacity-60")}>
                  {icon}
                </div>
              )}
              <span>{t(label)}</span>
              {count > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-foreground/[0.07] text-foreground/70"
                  )}
                >
                  {count}
                </Badge>
              )}
            </Button>
          )
        })}
      </div>
      
      {/* Scroll indication */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  )
}