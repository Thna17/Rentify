// ConfirmDeleteDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rentify/shared/ui/dialog";
import { Button } from "@rentify/shared/ui/button";

/**
 * Props interface for ConfirmDeleteDialog component
 */
interface ConfirmDeleteDialogProps {
  /** Controls the visibility of the dialog */
  open: boolean;
  /** Callback function when dialog is closed */
  onClose: () => void;
  /** Callback function when deletion is confirmed */
  onConfirm: () => void;
  /** Name of the product to be deleted (optional) */
  productName?: string;
}

/**
 * A confirmation dialog component for product deletion actions.
 * Provides a clear warning and requires explicit user confirmation
 * before proceeding with destructive operations.
 */
export const ConfirmDeleteDialog = ({
  open,
  onClose,
  onConfirm,
  productName,
}: ConfirmDeleteDialogProps): JSX.Element => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* Warning icon for visual emphasis */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          {/* Dialog title */}
          <DialogTitle className="text-center text-lg font-semibold text-gray-900">
            Confirm Deletion
          </DialogTitle>
          
          {/* Descriptive text with product name emphasis */}
          <DialogDescription className="text-center text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-medium text-gray-900">
              {productName ? `"${productName}"` : "this product"}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {/* Action buttons with responsive layout */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};