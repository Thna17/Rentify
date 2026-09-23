// components/VariantSelectorModal.tsx - UPDATED
import { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { X, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@rentify/shared/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@rentify/shared/ui/radio-group';
import { Label } from '@rentify/shared/ui/label';

interface VariantOptionValue {
  label: string;
  value: string;
}

interface VariantOption {
  id: string;
  name: string;
  values: VariantOptionValue[]; // Updated to handle object values
  required: boolean;
  type: 'select' | 'color' | 'image' | 'size';
  position: number;
}

interface ProductVariant {
  id: string;
  optionValues: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  trackInventory: boolean;
  sku: string | null;
  images: Array<{ url: string; alt?: string }>;
  status: 'active' | 'disabled';
}

interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVariantChange: (variantId: string, selectedOptions: Record<string, any>) => void;
  product: {
    id: string;
    name: string;
    images: Array<{ url: string; alt?: string }>;
    ProductOptions?: VariantOption[];
    ProductVariants?: ProductVariant[];
  };
  currentVariant?: ProductVariant;
  currentOptions: Record<string, any>;
}

export const VariantSelectorModal = ({
  isOpen,
  onClose,
  onVariantChange,
  product,
  currentVariant,
  currentOptions
}: VariantSelectorModalProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(currentOptions);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(currentVariant);

  // Initialize selected options from current variant
  useEffect(() => {
    if (currentVariant) {
      setSelectedOptions(currentVariant.optionValues);
    } else {
      setSelectedOptions(currentOptions);
    }
  }, [currentVariant, currentOptions]);

  // Find matching variant based on selected options
  useEffect(() => {
    if (product.ProductVariants && Object.keys(selectedOptions).length > 0) {
      const matchingVariant = product.ProductVariants.find(variant =>
        Object.entries(selectedOptions).every(([key, value]) => 
          variant.optionValues[key] === value
        )
      );
      setSelectedVariant(matchingVariant);
    } else {
      setSelectedVariant(undefined);
    }
  }, [selectedOptions, product.ProductVariants]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const handleConfirm = () => {
    if (selectedVariant) {
      onVariantChange(selectedVariant.id, selectedOptions);
      onClose();
    }
  };

  const isOptionAvailable = (optionName: string, value: string) => {
    if (!product.ProductVariants) return true;
    
    const tempOptions = { ...selectedOptions, [optionName]: value };
    return product.ProductVariants.some(variant =>
      Object.entries(tempOptions).every(([key, val]) => 
        variant.optionValues[key] === val
      )
    );
  };

  const getAvailableValues = (optionName: string) => {
    if (!product.ProductVariants) return [];
    
    const values = product.ProductVariants
      .map(variant => variant.optionValues[optionName])
      .filter((value, index, self) => value && self.indexOf(value) === index);
    
    return values;
  };

  // Safe image URL fallback
  const getImageUrl = () => {
    const url = selectedVariant?.images?.[0]?.url || product.images?.[0]?.url;
    return url || '/images/placeholder-product.jpg';
  };

  // Extract string values from option objects for display
  const getOptionDisplayValues = (option: VariantOption) => {
    return option.values.map(item => item.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Select Options</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              <img
                src={getImageUrl()}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/placeholder-product.jpg';
                }}
              />
            </div>
            
            {/* Selected Variant Info */}
            {selectedVariant && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Price:</span>
                  <div className="text-right">
                    {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-sm">
                          ${Number(selectedVariant.compareAtPrice).toFixed(2)}
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          ${Number(selectedVariant.price).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-lg">${Number(selectedVariant.price).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold">SKU:</span>
                  <Badge variant="outline" className="font-mono">
                    {selectedVariant.sku || 'N/A'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Stock:</span>
                  <div className="flex items-center gap-2">
                    {selectedVariant.trackInventory ? (
                      selectedVariant.stockQuantity > 0 ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          {selectedVariant.stockQuantity} in stock
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Out of stock
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Available</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Options Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
              <p className="text-muted-foreground">Please select your preferred options:</p>
            </div>

            {product.ProductOptions?.map((option) => {
              const availableValues = getAvailableValues(option.name);
              
              return (
                <div key={option.id || option.name} className="space-y-3">
                  <Label className="text-sm font-medium">
                    {option.name}
                    {option.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  
                  <RadioGroup
                    value={selectedOptions[option.name] || ''}
                    onValueChange={(value) => handleOptionChange(option.name, value)}
                    className="flex flex-wrap gap-2"
                  >
                    {option.values.map((valueObj) => {
                      const value = valueObj.value;
                      const available = isOptionAvailable(option.name, value);
                      const uniqueKey = `${option.name}-${value}`;
                      
                      return (
                        <div key={uniqueKey} className="relative">
                          <RadioGroupItem
                            value={value}
                            id={uniqueKey}
                            disabled={!available}
                            className="sr-only"
                          />
                          <Label
                            htmlFor={uniqueKey}
                            className={`
                              inline-flex items-center justify-center px-4 py-2 rounded-full border-2 text-sm font-medium cursor-pointer transition-all
                              ${selectedOptions[option.name] === value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background hover:bg-muted/50'
                              }
                              ${!available
                                ? 'opacity-50 cursor-not-allowed border-dashed'
                                : ''
                              }
                            `}
                          >
                            {valueObj.label || value}
                            {selectedOptions[option.name] === value && (
                              <Check className="h-3 w-3 ml-2" />
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  
                  {!availableValues.includes(selectedOptions[option.name]) && 
                  selectedOptions[option.name] && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Selected {option.name.toLowerCase()} is not available with other choices
                    </p>
                  )}
                </div>
              );
            })}

            {/* No variants available message */}
            {(!product.ProductVariants || product.ProductVariants.length === 0) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm">
                  No variants available for this product.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedVariant || (selectedVariant.trackInventory && selectedVariant.stockQuantity === 0)}
                className="flex-1"
              >
                Update Item
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};