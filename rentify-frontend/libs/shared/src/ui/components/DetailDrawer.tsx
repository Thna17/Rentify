import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@rentify/shared/ui/drawer'
import { Badge } from '@rentify/shared/ui/badge'
import { Button } from '@rentify/shared/ui/button'
import { ScrollArea } from '@rentify/shared/ui/scroll-area'
import { IconX, IconSparkles } from '@tabler/icons-react'
import React from 'react'

/** Props for the DetailDrawer component */
interface DetailDrawerProps<T = any> {
  /** Whether the drawer is open */
  open: boolean
  /** Callback fired when drawer open state changes */
  onOpenChange: (open: boolean) => void
  /** Item currently selected for detail view */
  selectedItem?: T & { id: string }
  /** Title displayed in the header */
  title: string
  /** Description displayed under the title */
  description?: string
  /** Function to render the detail content */
  renderDetail: (item: T) => React.ReactNode
  /** Adjusts padding/layout for mobile vs desktop */
  isMobile?: boolean
}

/**
 * DetailDrawer Component
 *
 * A reusable side/bottom drawer for showing detailed information about a selected item.
 * Supports custom render function, mobile-friendly layout, and scrollable content.
 */
export function DetailDrawer<T = any>({
  open,
  onOpenChange,
  selectedItem,
  title,
  description,
  renderDetail,
  isMobile = false,
}: DetailDrawerProps<T>) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh] rounded-t-2xl border-t border-gray-200 flex flex-col">
        {/* Small drag handle indicator (mobile UX) */}
        <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full mt-2 mb-1" />

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className={isMobile ? 'p-4' : 'max-w-2xl mx-auto w-full p-6'}>
            {/* Header Section */}
            <DrawerHeader className="text-left px-0 pb-6 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon box */}
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                    <IconSparkles className="h-4 w-4 text-white" />
                  </div>

                  {/* Title and description */}
                  <div>
                    <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      {title}
                      {selectedItem && (
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-primary/10 text-primary border-primary/20"
                        >
                          #{selectedItem.id.slice(0, 8).toUpperCase()}
                        </Badge>
                      )}
                    </DrawerTitle>
                    {description && (
                      <DrawerDescription className="text-sm text-gray-600 mt-1">
                        {description}
                      </DrawerDescription>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  onClick={() => onOpenChange(false)}
                >
                  <IconX className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </DrawerHeader>

            {/* Detail content */}
            <div className="space-y-6">
              {selectedItem && renderDetail(selectedItem)}
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
