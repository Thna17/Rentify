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
        {Object.entries(statusFilters).map(([key, { label, color, icon }]) => {
          const isActive = currentStatus === key
          const count = statusCounts[key] || 0
          
          return (
            <Button
              key={key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(key)}
              className={cn(
                "rounded-full transition-all duration-200 whitespace-nowrap",
                !isActive && "bg-muted/50 hover:bg-muted/80",
                color && !isActive && color
              )}
            >
              {icon && (
                <div className={cn("size-4", isActive ? "text-primary-foreground" : "opacity-70")}>
                  {icon}
                </div>
              )}
              <span>{t(label)}</span>
              {count > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-medium transition-colors",
                    isActive 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-muted-foreground/15"
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