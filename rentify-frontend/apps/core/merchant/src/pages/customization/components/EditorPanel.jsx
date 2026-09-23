import React from 'react';
import { Input } from "@rentify/shared/ui/input";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@rentify/shared/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@rentify/shared/ui/tooltip";
import { Badge } from "@rentify/shared/ui/badge";
import { Label } from "@rentify/shared/ui/label";
import { 
  Search, 
  Palette, 
  Image, 
  Type, 
  Upload, 
  ChevronDown,
  CheckCircle2,
  X
} from 'lucide-react';


const EditorPanel = ({
  groupedContent,
  expandedAccordions,
  handleAccordionChange,
  handleContentChange,
  searchQuery,
  colorPalettes,
  debouncedSave,
  setSearchQuery,
  uploadImage,
}) => {
  const getSectionIcon = (type) => {
    switch (type) {
      case 'Theme':
        return <Palette className="h-4 w-4" />;
      case 'Media':
        return <Image className="h-4 w-4" />;
      case 'Content':
        return <Type className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const getCompletionStatus = (items) => {
    const completed = items.filter(item => item.value && item.value !== '').length;
    const total = items.length;
    return { completed, total };
  };

  const getColorGradient = (paletteName) => {
    const gradients  = {
      'boldAndVibrantTheme': 'bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4]',
      'modernMinimalistTheme': 'bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF]',
      'default': 'bg-gradient-to-br from-[#87C38F] to-[#B2D3A8]'
    };
    return gradients[paletteName] || gradients.default;
  };

  const getPaletteDisplayName = (paletteName) => {
    return paletteName.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <Card className="
      w-full
      sm:w-80
      lg:w-96
      h-screen
      rounded-none
      border-r
      border-gray-200
      shadow-lg
      flex
      flex-col
      flex-shrink-0
      bg-background
      relative
      overflow-hidden
    ">
      {/* Gradient overlay */}
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      {/* Header */}
      <CardHeader className="pb-4 border-b">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Type className="h-5 w-5 text-primary" />
          Design Editor
        </CardTitle>
        
        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl bg-background"
          />
        </div>
      </CardHeader>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <Accordion 
          type="multiple" 
          className="space-y-3"
          value={Object.keys(expandedAccordions).filter(key => expandedAccordions[key])}
          onValueChange={(values) => {
            // Convert array state back to object format for compatibility
            Object.keys(groupedContent || {}).forEach(type => {
              const isExpanded = values.includes(type);
              if (expandedAccordions[type] !== isExpanded) {
                handleAccordionChange(type)(isExpanded);
              }
            });
          }}
        >
          {Object.entries(groupedContent || {}).map(([type, items]) => {
            const status = getCompletionStatus(items);
            const allCompleted = status.completed === status.total;
            
            return (
              <AccordionItem key={type} value={type} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      allCompleted ? 'bg-green-500' : 'bg-amber-500'
                    }`} />
                    
                    {/* Icon and title */}
                    {getSectionIcon(type)}
                    <span className="font-medium text-sm flex-1">
                      {type} Settings
                    </span>
                    
                    {/* Completion badge */}
                    <Badge variant="secondary" className="text-xs">
                      {status.completed}/{status.total}
                    </Badge>
                    
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    {items?.map((item) => (
                      <div key={item.id} className="space-y-2">
                        <Label htmlFor={`input-${item.id}`} className="text-sm font-medium">
                          {item.label}
                        </Label>

                        {/* Text Input */}
                        {item.type === 'text' && (
                          <Input
                            id={`input-${item.id}`}
                            value={item.value || ''}
                            onChange={(e) => handleContentChange(item.id, e.target.value)}
                            onBlur={() => debouncedSave.flush()}
                            className="rounded-lg"
                            placeholder={item.placeholder}
                          />
                        )}

                        {/* Image Upload */}
                        {item.type === 'image' && (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 text-center transition-colors hover:border-primary/50">
                            {item.value ? (
                              <>
                                <div className="mb-3 relative">
                                  <img
                                    src={item.value}
                                    alt="Upload preview"
                                    className="w-full rounded-lg max-h-32 object-cover"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleContentChange(item.id, '')}
                                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex gap-2 justify-center">
                                  <input
                                    accept="image/*"
                                    className="hidden"
                                    id={`file-upload-${item.id}`}
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadImage(item.id, file);
                                    }}
                                  />
                                  <label htmlFor={`file-upload-${item.id}`}>
                                    <Button variant="outline" size="sm" className="gap-2">
                                      <Upload className="h-4 w-4" />
                                      Replace
                                    </Button>
                                  </label>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col items-center gap-2">
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Upload an image
                                  </p>
                                  <input
                                    accept="image/*"
                                    className="hidden"
                                    id={`file-upload-${item.id}`}
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadImage(item.id, file);
                                    }}
                                  />
                                  <label htmlFor={`file-upload-${item.id}`}>
                                    <Button variant="default" size="sm" className="gap-2">
                                      <Upload className="h-4 w-4" />
                                      Upload Image
                                    </Button>
                                  </label>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Color Palette Selection */}
                        {item.type === 'palette' && (
                          <div className="grid grid-cols-3 gap-3">
                            {colorPalettes?.map((palette) => (
                              <TooltipProvider key={palette}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleContentChange(item.id, palette)}
                                      className={`
                                        aspect-square rounded-lg border-2 transition-all duration-200
                                        ${item.value === palette 
                                          ? 'border-primary ring-2 ring-primary ring-opacity-20 scale-105' 
                                          : 'border-muted-foreground/25 hover:border-primary/50'
                                        }
                                        ${getColorGradient(palette)}
                                      `}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{getPaletteDisplayName(palette)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Save Indicator */}
      <div className="p-4 border-t mt-auto">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Changes saved automatically
        </div>
      </div>
    </Card>
  );
};

export default EditorPanel;