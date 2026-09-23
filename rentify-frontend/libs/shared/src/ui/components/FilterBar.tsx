import { useState } from 'react'
import { Card } from '@rentify/shared/ui/card'
import { Input } from '@rentify/shared/ui/input'
import { Button } from '@rentify/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@rentify/shared/ui/sheet'
import { ScrollArea } from '@rentify/shared/ui/scroll-area'
import { IconSearch, IconX, IconFilter } from '@tabler/icons-react'
import { cn } from '@rentify/utils'
import React from 'react'

/** Represents a single filter dropdown option */
interface FilterOption {
  key: string
  placeholder: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}

/** Props for the FilterBar component */
interface FilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterOptions?: FilterOption[]
  onClearFilters: () => void
  searchPlaceholder?: string
  gridClass?: string
  className?: string
}

/**
 * FilterBar Component
 *
 * A responsive search and filter bar for dashboards.
 * - On mobile: collapses into a sheet with search & filter options.
 * - On desktop: displayed as a horizontal filter bar with inputs and dropdowns.
 */
export function FilterBar({
  searchTerm,
  onSearchChange,
  filterOptions = [],
  onClearFilters,
  searchPlaceholder,
  gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3',
  className = '',
}: FilterBarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  /** Handles clearing all filters */
  const handleClearFilters = () => {
    onClearFilters()
    setIsSheetOpen(false)
  }

  /** Mobile-only filters sheet */
  const MobileFiltersSheet = () => (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <ScrollArea className="h-full">
          <div className="space-y-6 p-4 pb-8">
            {/* Title */}
            <div className="text-center">
              <SheetTitle className="text-lg font-semibold">
                Filters & Search
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                Refine your results
              </p>
            </div>

            {/* Search */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => onSearchChange('')}
                    >
                      <IconX className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter dropdowns */}
              {filterOptions.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-sm font-medium">
                    {filter.placeholder}
                  </label>
                  <Select value={filter.value} onValueChange={filter.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={filter.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClearFilters}
                size="sm"
              >
                Clear All
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsSheetOpen(false)}
                size="sm"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <IconFilter className="h-4 w-4" />
              Filters & Search
              {/* Show indicator if filters are active */}
              {searchTerm || filterOptions.some((opt) => opt.value) ? (
                <span className="ml-auto bg-primary text-primary-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">
                  !
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <MobileFiltersSheet />
        </Sheet>
      </div>

      {/* Desktop Filter Bar */}
      <Card
        className={cn(
          'bg-gradient-to-br from-background to-muted/20 border-0 shadow-sm',
          className,
          'hidden lg:block'
        )}
      >
        <div className={cn(gridClass, 'items-end')}>
          {/* Search input */}
          <div className="lg:col-span-3">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-10 pr-10"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => onSearchChange('')}
                >
                  <IconX className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter dropdowns */}
          {filterOptions.map((filter, index) => (
            <div
              key={filter.key}
              className={cn(
                filter.className,
                index === 0 ? 'lg:col-span-2' : 'lg:col-span-2'
              )}
            >
              <Select value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Clear filters button */}
          <div className="lg:col-span-3 flex justify-end">
            <Button
              variant="outline"
              className="w-full lg:w-auto"
              onClick={onClearFilters}
              size="sm"
              disabled={!searchTerm && !filterOptions.some((opt) => opt.value)}
            >
              <IconX className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile sheet instance (ensures accessibility) */}
      <MobileFiltersSheet />
    </>
  )
}
