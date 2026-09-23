import * as React from "react"
import { useState } from "react"
import { Button } from "@rentify/shared/ui/button"
import { Label } from "@rentify/shared/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rentify/shared/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rentify/shared/ui/dialog"
import { Card, CardContent } from "@rentify/shared/ui/card"
import { Badge } from "@rentify/shared/ui/badge"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Archive, 
  FileText,
  Activity
} from "lucide-react"


const statusOptions = [
  {
    value: "active",
    label: "Active",
    description: "Product is available for purchase",
    icon: CheckCircle,
    color: "text-success"
  },
  {
    value: "inactive",
    label: "Inactive", 
    description: "Product is temporarily unavailable",
    icon: XCircle,
    color: "text-muted-foreground"
  },
  {
    value: "low_stock",
    label: "Low Stock",
    description: "Product has low inventory",
    icon: Activity,
    color: "text-warning"
  },
  {
    value: "out_of_stock",
    label: "Out of Stock",
    description: "Product is currently out of stock",
    icon: XCircle,
    color: "text-destructive"
  },
  {
    value: "archived",
    label: "Archived",
    description: "Product is archived and hidden",
    icon: Archive,
    color: "text-muted-foreground"
  }
]

export const BulkStatusChangeModal = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isLoading = false
}) => {
  const [newStatus, setNewStatus] = useState("active")

  const handleSubmit = async () => {
    try {
      await onConfirm(newStatus)
      onOpenChange(false)
      setNewStatus("active")
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setNewStatus("active")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm sm:max-w-md w-[95vw] p-4 sm:p-6">
        <DialogHeader className="text-center space-y-2 sm:space-y-3">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Change Product Status
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Update the status for {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary text-xs">
                {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This will update the status for all selected products
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              New Status
            </Label>
            
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-9 sm:h-10 text-sm focus:border-primary focus:ring-primary/20">
                <SelectValue placeholder="Select new status..." />
              </SelectTrigger>
              <SelectContent className="z-50">
                {statusOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value} className="p-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <IconComponent className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${option.color} shrink-0`} />
                        <div className="min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate">{option.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1 h-9 text-sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="flex-1 h-9 text-sm shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}