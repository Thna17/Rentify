// components/ColorPicker.tsx
import React from 'react';
import { Palette, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ColorPickerProps {
  field: string;
  value: string;
  label: string;
  editingField: string | null;
  onEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  tempValue: string;
  setTempValue: (value: string) => void;
  isUpdating: boolean;
  t: (key: string) => string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  field,
  value,
  label,
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
      <label className="text-sm font-medium flex items-center gap-2 text-text">
        <Palette className="h-4 w-4" />
        {t(label)}
      </label>
      
      {isEditing ? (
        <div className="flex gap-2">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="color"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
            />
            <input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder="#000000"
              className="flex-1 px-3 py-2 border border-border rounded-md text-text bg-background font-mono text-sm"
            />
          </div>
          <button 
            onClick={() => onSave(field)}
            disabled={isUpdating}
            className="h-10 w-10 bg-primary text-white rounded-md flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button 
            onClick={onCancel}
            className="h-10 w-10 border border-border bg-background rounded-md flex items-center justify-center hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div 
            onClick={() => onEdit(field, value)}
            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg cursor-pointer hover:bg-surface transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded border-2 border-border"
                style={{ backgroundColor: value }}
              />
              <span className="font-mono text-sm text-text">{value}</span>
            </div>
            <Palette className="h-4 w-4 text-text-secondary group-hover:text-text transition-colors" />
          </div>
        </motion.div>
      )}
    </div>
  );
};