// components/ProductOptionsManager.jsx
import { X, Trash, Plus, Settings, Layers, Sparkles, Zap } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { Switch } from '@rentify/shared/ui/switch';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { Badge } from '@rentify/shared/ui/badge';
import { Skeleton } from '@rentify/shared/ui/skeleton';
const NICHE_OPTION_TYPES = {
  skincare: ['select', 'radio'],
  restaurant: ['select', 'radio', 'checkbox'],
  ecommerce: ['select', 'color', 'image', 'text', 'size'],
  cafe: ['select', 'radio'],
  fashion: ['select', 'color', 'image', 'size'],
};
export const ProductOptionsManager = ({
  options,
  onAddOption,
  onRemoveOption,
  onOptionChange,
  onOptionValueChange,
  onAddOptionValue,
  onRemoveOptionValue,
  onGenerateVariants,
  errors,
  recommendedOptions,
  showRecommended,
  onToggleRecommended,
  niche,
  loadingRecommended,
}) => {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Product Options</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Define options like size, color, material for variants
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onToggleRecommended}
              className="gap-2"
              size="sm"
            >
              <Sparkles className="h-4 w-4" />
              Templates
            </Button>
            <Button onClick={() => onAddOption()} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Option
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Recommended Options Section */}
        {showRecommended && recommendedOptions && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Recommended for {niche}</h4>
                </div>
                <Badge variant="secondary">
                  {recommendedOptions.recommendedOptions?.length || 0} templates
                </Badge>
              </div>

              {loadingRecommended ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recommendedOptions.recommendedOptions?.map(
                    (template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4 hover:bg-primary/5"
                        onClick={() => onAddOption(template)}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">
                            {template.name}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {template.type} • {template.values.length} values
                          </div>
                        </div>
                      </Button>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Options List */}
        {options.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl">
            <div className="p-4 rounded-full bg-muted/30 inline-flex mb-4">
              <Settings className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No options yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Add options to create product variants
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={onToggleRecommended}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Use Template
              </Button>
              <Button onClick={() => onAddOption()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Option
              </Button>
            </div>
          </div>
        ) : (
          <>
            {options.map((option, optionIndex) => (
              <Card key={optionIndex} className="border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <Settings className="h-4 w-4" />
                      </div>
                      <h4 className="font-semibold">
                        Option {optionIndex + 1}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveOption(optionIndex)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Option Name *
                      </Label>
                      <Input
                        value={option.name}
                        onChange={(e) =>
                          onOptionChange(optionIndex, 'name', e.target.value)
                        }
                        placeholder="e.g., Color, Size, Material"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Option Type</Label>
                      <Select
                        value={option.type}
                        onValueChange={(value) =>
                          onOptionChange(optionIndex, 'type', value)
                        }
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            NICHE_OPTION_TYPES[niche] || [
                              'select',
                              'color',
                              'image',
                              'text',
                              'size',
                              'radio',
                              'checkbox',
                            ]
                          ).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Color-specific fields */}
                  {option.type === 'color' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Default Color Format</Label>
                        <Select defaultValue="hex">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hex">Hex Code</SelectItem>
                            <SelectItem value="rgb">RGB</SelectItem>
                            <SelectItem value="name">Color Name</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Values *</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddOptionValue(optionIndex)}
                        className="h-8 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Value
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {option.values.map((value, valueIndex) => (
                        <div
                          key={valueIndex}
                          className="flex gap-2 items-start"
                        >
                          <Input
                            value={value.value}
                            onChange={(e) =>
                              onOptionValueChange(
                                optionIndex,
                                valueIndex,
                                'value',
                                e.target.value
                              )
                            }
                            placeholder="Value (e.g., Red, Large)"
                            className="flex-1 h-9"
                          />

                          {option.type === 'color' && (
                            <div className="flex items-center gap-2">
                              <Input
                                value={value.hexCode || ''}
                                onChange={(e) =>
                                  onOptionValueChange(
                                    optionIndex,
                                    valueIndex,
                                    'hexCode',
                                    e.target.value
                                  )
                                }
                                placeholder="#000000"
                                className="w-24 h-9"
                              />
                              <div
                                className="w-9 h-9 rounded-lg border"
                                style={{
                                  backgroundColor: value.hexCode || '#ccc',
                                }}
                              />
                            </div>
                          )}

                          {option.type === 'image' && (
                            <Input
                              value={value.imageUrl || ''}
                              onChange={(e) =>
                                onOptionValueChange(
                                  optionIndex,
                                  valueIndex,
                                  'imageUrl',
                                  e.target.value
                                )
                              }
                              placeholder="Image URL"
                              className="flex-1 h-9"
                            />
                          )}

                          {option.values.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onRemoveOptionValue(optionIndex, valueIndex)
                              }
                              className="h-9 w-9 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={option.required}
                      onCheckedChange={(checked) =>
                        onOptionChange(optionIndex, 'required', checked)
                      }
                      id={`required-${optionIndex}`}
                    />
                    <Label
                      htmlFor={`required-${optionIndex}`}
                      className="text-sm"
                    >
                      Required option
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Generate Variants Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={onGenerateVariants}
                className="min-w-[200px] gap-2"
              >
                <Layers className="h-4 w-4" />
                Generate Variants
              </Button>
            </div>
          </>
        )}

        {errors && typeof errors === 'string' && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{errors}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
