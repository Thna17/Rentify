import { Card } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import {
  IconDotsVertical,
  IconTrash,
  IconDownload,
  IconCheck,
} from '@tabler/icons-react';

// Define the props interface for better type safety
interface BulkActionsBarProps {
  selectedCount: number;               // Number of selected items
  onDelete: () => void;                // Callback for delete action
  onExport: () => void;                // Callback for export action
  onMoreActions?: () => void;          // Optional callback for additional actions
  deleteLabel: string;                 // Label for delete button
  exportLabel: string;                 // Label for export action
  moreActionsLabel: string;            // Label for more actions button
  disabled?: boolean;                  // Disable buttons if true
}

/**
 * BulkActionsBar component
 * Displays a contextual action bar for bulk operations on selected items.
 */
export function BulkActionsBar({
  selectedCount,
  onDelete,
  onExport,
  onMoreActions,
  deleteLabel,
  exportLabel,
  moreActionsLabel,
  disabled = false,
}: BulkActionsBarProps) {
  // Don't render the bar if no items are selected
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Selected items count badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="h-6 w-6 rounded-full p-0 flex items-center justify-center"
          >
            {selectedCount}
          </Badge>
          <span className="text-sm font-medium">
            {selectedCount} items selected
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Delete button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={disabled}
            className="gap-2"
          >
            <IconTrash className="h-4 w-4" />
            {deleteLabel}
          </Button>

          {/* Dropdown for more actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <IconDotsVertical className="h-4 w-4" />
                {moreActionsLabel}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {/* Export action */}
              <DropdownMenuItem onClick={onExport} className="gap-2">
                <IconDownload className="h-4 w-4" />
                {exportLabel}
              </DropdownMenuItem>

              {/* Optional more actions */}
              {onMoreActions && (
                <DropdownMenuItem onClick={onMoreActions} className="gap-2">
                  <IconCheck className="h-4 w-4" />
                  Change Status
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
