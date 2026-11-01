// components/EditableField.tsx
import React from 'react';
import { Edit2, Check, X, LucideIcon } from 'lucide-react';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';

interface EditableFieldProps {
  field: string;
  value: any;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  /** Kept for callers; labels no longer show icons. */
  Icon?: LucideIcon;
  editingField: string | null;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  tempValue: string;
  setTempValue: (value: string) => void;
  isUpdating: boolean;
  t: (key: string) => string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  field,
  value,
  label,
  type = 'text',
  Icon,
  editingField,
  onEdit,
  onSave,
  onCancel,
  tempValue,
  setTempValue,
  isUpdating,
  t
}) => {
  const isEditing = editingField === field;

  const displayValue =
    typeof value === 'string'
      ? value
      : typeof value === 'number'
      ? String(value)
      : value && typeof value === 'object' && !Array.isArray(value)
      ? String((value as any).text ?? (value as any).value ?? '')
      : '';

  return (
    <div className="space-y-2">
      <label htmlFor={`field-${field}`} className="text-sm font-medium">
        {t(label)}
      </label>

      {isEditing ? (
        <div className="flex gap-2">
          <Input
            id={`field-${field}`}
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            autoFocus
            className="h-11 flex-1 rounded-xl"
          />
          <Button
            size="icon"
            onClick={() => onSave(field)}
            disabled={isUpdating}
            aria-label={t('merchant.common.save')}
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onCancel}
            aria-label={t('merchant.p.cancel')}
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          id={`field-${field}`}
          onClick={() => onEdit(field, displayValue)}
          className="group flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-input bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
        >
            <span className={`min-w-0 truncate ${displayValue ? 'font-medium' : 'text-muted-foreground'}`}>
              {displayValue || t(`dashboard.store_management.enter_${label.split('.').pop()?.toLowerCase()}`)}
            </span>
            <Edit2 className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};