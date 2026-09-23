import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';

export function SidebarGroup({ children, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 p-2 ${className}`}>{children}</div>
  );
}

export function SidebarGroupContent({ children, className = '' }) {
  return <div className={`flex flex-col gap-1 ${className}`}>{children}</div>;
}

export function SidebarMenu({ children, className = '' }) {
  return <ul className={`flex flex-col gap-1 ${className}`}>{children}</ul>;
}

export function SidebarMenuItem({ children, className = '' }) {
  return <li className={`relative ${className}`}>{children}</li>;
}

export function SidebarMenuButton({
  children,
  tooltip,
  isActive = false,
  onClick,
  className = '',
  asChild = false,
  size = 'default',
  hasSubmenu = false,
  isExpanded = false,
  onExpandToggle,
}) {
  const sizeClasses = {
    default: 'h-10',
    lg: 'h-12',
  };

  const handleClick = () => {
    if (hasSubmenu) {
      onExpandToggle?.();
    } else {
      onClick?.();
    }
  };

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={`w-full justify-start transition-all duration-200 ${
        sizeClasses[size]
      } ${
        isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'hover:bg-accent/20 hover:text-primary'
      } ${className}`}
      onClick={handleClick}
    >
      {children}
      {hasSubmenu && (
        <div className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 opacity-70" />
          ) : (
            <ChevronRight className="h-4 w-4 opacity-70" />
          )}
        </div>
      )}
    </Button>
  );
}
