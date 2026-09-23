// components/EditableField.tsx
import React from 'react';
import { Edit2, Check, X, LucideIcon } from 'lucide-react';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { motion } from 'framer-motion';

interface EditableFieldProps {
  field: string;
  value: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url';
  Icon: LucideIcon;
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
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {t(label)}
      </label>
      
      {isEditing ? (
        <div className="flex gap-2">
          <Input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button 
            size="icon"
            onClick={() => onSave(field)}
            disabled={isUpdating}
            className="h-10 w-10"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon"
            variant="outline"
            onClick={onCancel}
            className="h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div 
            onClick={() => onEdit(field, value)}
            className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors group"
          >
            <span className={value ? "font-medium" : "text-muted-foreground"}>
              {value || t(`dashboard.store_management.enter_${label.split('.').pop()?.toLowerCase()}`)}
            </span>
            <Edit2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </motion.div>
      )}
    </div>
  );
};