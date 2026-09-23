import * as React from "react"
import { useState } from "react"
import { Button } from "@rentify/shared/ui/button"
import { Input } from "@rentify/shared/ui/input"
import { Label } from "@rentify/shared/ui/label"
import { Textarea } from "@rentify/shared/ui/Textarea"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rentify/shared/ui/Tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@rentify/shared/ui/avatar"
import { Badge } from "@rentify/shared/ui/badge"
import { ScrollArea } from "@rentify/shared/ui/scroll-area"
import { Separator } from "@rentify/shared/ui/separator"
import { toast } from "sonner"
import { 
  Plus, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react"

export const BulkCreateProductsModal = ({
  open,
  onOpenChange,
  onSubmit,
  categories = [],
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState("manual")
  const [manualProducts, setManualProducts] = useState([{ id: Date.now() }])
  const [csvData, setCsvData] = useState([])
  const [errors, setErrors] = useState({})
  const [isDragging, setIsDragging] = useState(false)

  const handleManualAdd = () => {
    setManualProducts([...manualProducts, { id: Date.now() + manualProducts.length }])
  }

  const handleManualRemove = (id) => {
    if (manualProducts.length > 1) {
      setManualProducts(manualProducts.filter(product => product.id !== id))
      
      // Clear errors for removed product
      const newErrors = { ...errors }
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${id}-`)) {
          delete newErrors[key]
        }
      })
      setErrors(newErrors)
    }
  }

  const validateField = (id, field, value) => {
    const newErrors = { ...errors }
    const errorKey = `${id}-${field}`
    
    if (field === 'name' && !value) {
      newErrors[errorKey] = 'Product name is required'
    } else if (field === 'price' && (!value || parseFloat(value) <= 0)) {
      newErrors[errorKey] = 'Valid price is required'
    } else {
      delete newErrors[errorKey]
    }
    
    setErrors(newErrors)
  }

  const handleManualChange = (id, field, value) => {
    const newProducts = manualProducts.map(product => 
      product.id === id ? { ...product, [field]: value } : product
    )
    setManualProducts(newProducts)
    validateField(id, field, value)
  }

  const handleImageUpload = (id, files) => {
    if (!files) return
    
    try {
      const newImages = Array.from(files).map((file, i) => ({
        url: URL.createObjectURL(file),
        publicId: `temp_${Date.now()}_${i}`,
        name: file.name
      }))

      const newProducts = manualProducts.map(product => 
        product.id === id 
          ? { 
              ...product, 
              images: [...(product.images || []), ...newImages].slice(0, 8) // Limit to 8 images
            } 
          : product
      )
      
      setManualProducts(newProducts)
      toast.success(`Added ${files.length} image(s)`)
    } catch (error) {
      toast.error("Failed to upload images")
    }
  }

  const removeImage = (productId, imageIndex) => {
    const newProducts = manualProducts.map(product => 
      product.id === productId 
        ? { 
            ...product, 
            images: product.images?.filter((_, index) => index !== imageIndex) || [] 
          } 
        : product
    )
    setManualProducts(newProducts)
  }

  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result 
        const lines = csv.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim())
          const product = { id: `csv-${index}` }
          
          headers.forEach((header, i) => {
            if (values[i] && header !== 'images') {
              product[header] = values[i]
            }
          })
          
          return product
        })

        setCsvData(data)
        toast.success(`Found ${data.length} products in CSV`)
      } catch (error) {
        toast.error("Invalid CSV format")
      }
    }
    reader.readAsText(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e, productId) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    handleImageUpload(productId, files)
  }

  const hasErrors = Object.keys(errors).length > 0

  const handleSubmit = async () => {
    const products = activeTab === "manual" ? manualProducts : csvData
    
    if (hasErrors) {
      toast.error("Please fix validation errors before submitting")
      return
    }

    try {
      await onSubmit(products)
      onOpenChange(false)
      setManualProducts([{ id: Date.now() }])
      setCsvData([])
      setErrors({})
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setManualProducts([{ id: Date.now() }])
    setCsvData([])
    setErrors({})
  }

  const downloadTemplate = () => {
    const headers = ['name', 'description', 'price', 'stockQuantity', 'categoryId']
    const csvContent = headers.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'product_template.csv'
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Bulk Create Products
              </DialogTitle>
              <DialogDescription>
                Add multiple products at once using manual entry or CSV upload
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV Upload
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="px-6 flex-1 max-h-[60vh]">
          {activeTab === "manual" ? (
            <div className="space-y-4 py-4">
              {manualProducts.map((product) => (
                <ProductFormCard
                  key={product.id}
                  product={product}
                  categories={categories}
                  errors={errors}
                  onRemove={() => handleManualRemove(product.id)}
                  onChange={handleManualChange}
                  onImageUpload={(files) => handleImageUpload(product.id, files)}
                  onRemoveImage={(index) => removeImage(product.id, index)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, product.id)}
                />
              ))}
              
              <Button
                variant="outline"
                onClick={handleManualAdd}
                className="w-full h-12 border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Product
              </Button>
            </div>
          ) : (
            <div className="py-4">
              <CSVUploadSection
                csvData={csvData}
                onFileUpload={handleFileUpload}
                onDownloadTemplate={downloadTemplate}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const files = e.dataTransfer.files
                  if (files[0]) handleFileUpload(files[0])
                }}
              />
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeTab === "manual" 
              ? `${manualProducts.length} product(s) ready`
              : `${csvData.length} product(s) from CSV`
            }
            {hasErrors && (
              <span className="text-destructive ml-2">
                • Please fix errors
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || hasErrors || 
                (activeTab === "manual" ? manualProducts.some(p => !p.name || !p.price) : csvData.length === 0)}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Products
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ProductFormCard = ({ 
  product, 
  categories, 
  errors, 
  onRemove, 
  onChange, 
  onImageUpload, 
  onRemoveImage,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  return (
    <Card className="group relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Product Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${product.id}`} className="text-sm">
              Product Name *
            </Label>
            <Input
              id={`name-${product.id}`}
              value={product.name || ""}
              onChange={(e) => onChange(product.id, "name", e.target.value)}
              className={errors[`${product.id}-name`] ? "border-destructive" : ""}
              placeholder="Enter product name..."
            />
            {errors[`${product.id}-name`] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[`${product.id}-name`]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`price-${product.id}`} className="text-sm">
              Price *
            </Label>
            <Input
              id={`price-${product.id}`}
              type="number"
              step="0.01"
              min="0"
              value={product.price || ""}
              onChange={(e) => onChange(product.id, "price", e.target.value)}
              className={errors[`${product.id}-price`] ? "border-destructive" : ""}
              placeholder="0.00"
            />
            {errors[`${product.id}-price`] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[`${product.id}-price`]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`stock-${product.id}`} className="text-sm">
              Stock Quantity
            </Label>
            <Input
              id={`stock-${product.id}`}
              type="number"
              min="0"
              value={product.stockQuantity || ""}
              onChange={(e) => onChange(product.id, "stockQuantity", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Category</Label>
            <Select
              value={product.categoryId || ""}
              onValueChange={(value) => onChange(product.id, "categoryId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`description-${product.id}`} className="text-sm">
            Description
          </Label>
          <Textarea
            id={`description-${product.id}`}
            value={product.description || ""}
            onChange={(e) => onChange(product.id, "description", e.target.value)}
            placeholder="Enter product description..."
            rows={2}
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Product Images
            <span className="text-muted-foreground text-xs font-normal">
              (Max 8 images)
            </span>
          </Label>
          
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById(`file-upload-${product.id}`)?.click()}
          >
            <Input
              id={`file-upload-${product.id}`}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onImageUpload(e.target.files)}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop images here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG, WEBP (max 5MB each)
            </p>
          </div>
          
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, index) => (
                <div key={index} className="relative group">
                  <Avatar className="w-full aspect-square rounded-md">
                    <AvatarImage src={img.url} className="object-cover" />
                    <AvatarFallback className="rounded-md">
                      <ImageIcon className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveImage(index)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const CSVUploadSection = ({ 
  csvData, 
  onFileUpload, 
  onDownloadTemplate, 
  isDragging, 
  onDragOver, 
  onDragLeave, 
  onDrop 
}) => {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Upload CSV File</h3>
          <p className="text-muted-foreground">
            Upload a CSV file with your product data. Ensure it follows our template format.
          </p>
        </div>

        <div 
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              Drag & drop your CSV file here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse files
            </p>
            <Button variant="outline">
              Select CSV File
            </Button>
          </label>
        </div>

        <div className="text-left">
          <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Include columns: name, description, price, stockQuantity, categoryId</li>
            <li>• First row should contain headers</li>
            <li>• Price should be in decimal format (e.g., 29.99)</li>
            <li>• stockQuantity should be whole numbers</li>
          </ul>
        </div>

        <Button variant="ghost" onClick={onDownloadTemplate} className="flex items-center gap-2 mx-auto">
          <Download className="h-4 w-4" />
          Download CSV Template
        </Button>

        {csvData.length > 0 && (
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {csvData.length} products found in CSV
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}