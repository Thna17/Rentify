import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Button } from '@rentify/shared/ui/button';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@rentify/utils';

interface ProductMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
}

export const ProductMenu = ({
  onEdit,
  onDelete,
  align = "end",
  triggerClassName
}: ProductMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-8 h-8 p-0 data-[state=open]:bg-accent",
            "hover:bg-accent/50 transition-colors",
            triggerClassName
          )}
        >
          <MoreVertical className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Alternative version with controlled open state (if needed)
interface ControlledProductMenuProps extends ProductMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ControlledProductMenu = ({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  align = "end",
  triggerClassName
}: ControlledProductMenuProps) => {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-8 h-8 p-0 data-[state=open]:bg-accent",
            "hover:bg-accent/50 transition-colors",
            triggerClassName
          )}
        >
          <MoreVertical className="w-4 h-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
            onOpenChange(false);
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onOpenChange(false);
          }}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};