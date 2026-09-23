import { useTranslation } from '@rentify/utils';
import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './Sidebar';

export function NavMain({ items, currentTab, onTabChange }) {
  const [expandedItems, setExpandedItems] = useState({});
  const { t } = useTranslation();

  const toggleExpanded = (path) => {
    setExpandedItems((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleItemClick = (item) => {
    onTabChange(item.path);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 mb-2">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full justify-start h-10 transition-all duration-300 shadow-sm hover:shadow-md rounded-lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Quick Create</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Main Menu
        </div>
        <SidebarMenu>
          {items.map((item) => (
            <React.Fragment key={item.name}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    currentTab.path === item.path ||
                    (item.hasSubmenu &&
                      item.subItems.some(
                        (subItem) => currentTab.path === subItem.path
                      ))
                  }
                  onClick={() => !item.hasSubmenu && handleItemClick(item)}
                  hasSubmenu={item.hasSubmenu}
                  isExpanded={expandedItems[item.path]}
                  onExpandToggle={() => toggleExpanded(item.path)}
                >
                  {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                  <span className="font-medium">{t(item.name)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Render submenu if expanded */}
              {item.hasSubmenu && expandedItems[item.path] && (
                <SidebarMenuItem>
                  <div className="ml-6 pl-2 border-l border-border">
                    <SidebarMenu>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuItem key={subItem.name}>
                          <SidebarMenuButton
                            isActive={currentTab.path === subItem.path}
                            onClick={() => onTabChange(subItem.path)}
                            className="h-8 text-sm"
                          >
                            <span className="font-normal">{subItem.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </div>
                </SidebarMenuItem>
              )}
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}