import * as React from "react"
import { useState } from "react"
import { Button } from "@rentify/shared/ui/button"
import { Input } from "@rentify/shared/ui/input"
import { Label } from "@rentify/shared/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rentify/shared/ui/dialog"
import { Card, CardContent } from "@rentify/shared/ui/card"
import { Badge } from "@rentify/shared/ui/badge"
import { DollarSign, TrendingUp } from "lucide-react"
import { toast } from "sonner"

export const BulkPriceUpdateModal = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isLoading = false
}) => {
  const [newPrice, setNewPrice] = useState("")

  const handleSubmit = async () => {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      })
      return
    }

    try {
      await onConfirm(price)
      onOpenChange(false)
      setNewPrice("")
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setNewPrice("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm sm:max-w-md w-[95vw] p-4 sm:p-6">
        <DialogHeader className="text-center space-y-2 sm:space-y-3">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Update Product Prices
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Set a new price for {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 sm:p-4 text-center">
              <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary text-xs">
                {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This will update the price for all selected products
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2 sm:space-y-3">
            <Label htmlFor="new-price" className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              New Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                id="new-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="h-9 sm:h-10 pl-8 sm:pl-10 text-sm focus:border-primary focus:ring-primary/20"
              />
            </div>
            {newPrice && !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0 && (
              <Card className="bg-muted/30 border-0">
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Total value:</span>
                    <span className="font-medium text-foreground">
                      ${(parseFloat(newPrice) * selectedCount).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="flex-1 h-9 text-sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0}
            className="flex-1 h-9 text-sm shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <DollarSign className="h-3.5 w-3.5 mr-2" />
                Update Price
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}