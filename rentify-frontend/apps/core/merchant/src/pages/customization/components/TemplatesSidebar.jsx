import React, { useEffect, useState } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@rentify/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@rentify/shared/ui/tooltip";
import { Card } from "@rentify/shared/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Home, 
  ShoppingCart, 
  Store, 
  ShoppingBag, 
  Package,
  Storefront,
  CreditCard,
  CheckCircle
} from 'lucide-react';


const TemplateSidebar = ({
  isTemplatePanelCollapsed,
  handleTemplateChange,
  setIsTemplatePanelCollapsed,
  selectedTemplate,
  templates,
}) => {
  const [isMdScreen, setIsMdScreen] = useState(false);

  // Responsive screen detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMdScreen(window.innerWidth < 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Automatically collapse sidebar on medium screens
  useEffect(() => {
    if (isMdScreen) {
      setIsTemplatePanelCollapsed(true);
    }
  }, [isMdScreen, setIsTemplatePanelCollapsed]);

  const templateIcons = {
    'global setting': <Settings className="h-5 w-5" />,
    'homepage': <Home className="h-5 w-5" />,
    'product': <Store className="h-5 w-5" />,
    'cart': <ShoppingCart className="h-5 w-5" />,
    'checkout': <CreditCard className="h-5 w-5" />,
    'confirmation': <CheckCircle className="h-5 w-5" />,
  };

  const getDisplayText = (page) => {
    return page.charAt(0).toUpperCase() + page.slice(1).toLowerCase();
  };

  return (
    <Card className={`
      flex flex-col
      ${isTemplatePanelCollapsed ? 'w-20' : 'w-72'}
      h-screen
      rounded-none
      border-r
      border-gray-200
      shadow-lg
      transition-all
      duration-300
      ease-in-out
      bg-gradient-to-br from-background to-muted/20
      flex-shrink-0
    `}>
      {/* Header */}
      {!isTemplatePanelCollapsed && (
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold text-foreground">Templates</h2>
        </div>
      )}

      {/* Tabs */}
      <div className="flex-1 px-3 py-4">
        <Tabs 
          value={selectedTemplate.toString()} 
          onValueChange={(value) => handleTemplateChange(Number(value))}
          className="w-full"
          orientation="vertical"
        >
          <TabsList className={`
            flex flex-col items-stretch gap-2 bg-transparent p-0
            ${isTemplatePanelCollapsed ? 'items-center' : 'items-stretch'}
          `}>
            {templates?.map((template) => (
              <TooltipProvider key={template.id}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={template.id.toString()}
                      className={`
                        justify-start
                        h-12
                        px-3
                        transition-all
                        duration-200
                        ease-in-out
                        hover:translate-x-1
                        hover:bg-accent
                        hover:text-accent-foreground
                        data-[state=active]:bg-primary
                        data-[state=active]:text-primary-foreground
                        data-[state=active]:shadow-md
                        data-[state=active]:border-primary
                        group
                        ${isTemplatePanelCollapsed ? 'w-12 px-0 justify-center' : 'w-full'}
                      `}
                    >
                      <div className={`
                        flex items-center gap-3
                        ${isTemplatePanelCollapsed ? 'justify-center' : ''}
                      `}>
                        <div className="flex-shrink-0">
                          {templateIcons[template.page.toLowerCase()] || 
                           <Storefront className="h-5 w-5" />}
                        </div>
                        {!isTemplatePanelCollapsed && (
                          <span className="text-sm font-medium whitespace-nowrap">
                            {getDisplayText(template.page)}
                          </span>
                        )}
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  {isTemplatePanelCollapsed && (
                    <TooltipContent side="right" className="ml-2">
                      <p className="text-sm">{getDisplayText(template.page)}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Collapse Button */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTemplatePanelCollapsed(!isTemplatePanelCollapsed)}
                  className="h-9 w-9 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {isTemplatePanelCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isTemplatePanelCollapsed ? 'Expand Panel' : 'Collapse Panel'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
};

export default TemplateSidebar;