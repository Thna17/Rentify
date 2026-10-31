// components/FontSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search, Globe, Type, Layers, Zap, Sparkles } from 'lucide-react';
import { Font, fontCategories, findFontByValue, isCustomFont, allFonts } from '../data/fonts';

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Select a font...',
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFont, setSelectedFont] = useState<Font | null>(null);
  const [customFont, setCustomFont] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize selected font
  useEffect(() => {
    if (value) {
      const font = findFontByValue(value);
      if (font) {
        setSelectedFont(font);
      } else {
        setSelectedFont(null);
        setCustomFont(value);
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

// In FontSelector.tsx, ensure the onChange is called properly:
const handleFontSelect = (font: Font) => {
  if (font.id === 'custom-font') {
    setSelectedFont(font);
    setTimeout(() => {
      const customInput = document.getElementById('custom-font-input');
      customInput?.focus();
    }, 100);
  } else {
    setSelectedFont(font);
    console.log('Selected font:', font.value); // Debug
    // This calls the parent's onChange
    onChange(font.value);
    setIsOpen(false);
    setSearchTerm('');
  }
};

  const handleCustomFontChange = (fontValue: string) => {
    setCustomFont(fontValue);
    onChange(fontValue);
  };

  const handleCustomFontSave = () => {
    if (customFont.trim()) {
      onChange(customFont.trim());
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedFont?.id === 'custom-font' && customFont.trim()) {
      handleCustomFontSave();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Filter fonts based on search
  const filteredCategories = fontCategories.map(category => ({
    ...category,
    fonts: category.fonts.filter(font =>
      font.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      font.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.fonts.length > 0);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'khmer': return <Globe className="h-4 w-4" />;
      case 'english-serif':
      case 'english-sans':
      case 'english-display': return <Type className="h-4 w-4" />;
      case 'system': return <Zap className="h-4 w-4" />;
      case 'custom': return <Sparkles className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'khmer': return 'text-[var(--rentify-color-success-text)] bg-[var(--rentify-color-success-subtle)] border-[var(--rentify-color-success-border)]';
      case 'english-serif':
      case 'english-sans':
      case 'english-display': return 'text-primary-strong bg-accent border-primary/30';
      case 'system': return 'text-muted-foreground bg-muted border-border';
      case 'custom': return 'text-[var(--rentify-color-warning-text)] bg-[var(--rentify-color-warning-subtle)] border-[var(--rentify-color-warning-border)]';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getDisplayValue = () => {
    if (selectedFont) {
      return selectedFont.label;
    }
    if (value && isCustomFont(value)) {
      return value.split(',')[0] || value;
    }
    return placeholder;
  };

  const getFontPreviewStyle = () => {
    const fontValue = selectedFont?.value === 'custom' ? customFont : value;
    return { fontFamily: fontValue };
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className="w-full px-4 py-3 bg-card border border-border rounded-lg shadow-sm hover:border-input focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all duration-200 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent flex items-center justify-center">
            <Type className="h-4 w-4 text-primary-strong" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-foreground truncate" style={getFontPreviewStyle()}>
              {getDisplayValue()}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {selectedFont?.value || value || 'Select font family'}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-96 overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-border bg-muted">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search fonts..."
                  className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                />
              </div>
            </div>

            {/* Font List */}
            <div className="overflow-y-auto max-h-64">
              {filteredCategories.map((category) => (
                <div key={category.id} className="border-b border-border last:border-b-0">
                  <div className={`sticky top-0 px-4 py-2 text-xs font-semibold ${getCategoryColor(category.id)} flex items-center gap-2`}>
                    {getCategoryIcon(category.id)}
                    {category.label}
                  </div>
                  {category.fonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleFontSelect(font)}
                      className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center justify-between group ${
                        (selectedFont?.id === font.id || (font.id === 'custom-font' && isCustomFont(value))) 
                          ? 'bg-accent' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          font.category === 'khmer' ? 'bg-[var(--rentify-color-success-subtle)]' :
                          font.category === 'english' ? 'bg-accent' :
                          font.category === 'system' ? 'bg-muted' :
                          'bg-[var(--rentify-color-warning-subtle)]'
                        }`}>
                          <div 
                            className="text-lg font-medium"
                            style={{ fontFamily: font.value }}
                          >
                            {font.preview?.[0] || 'A'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div 
                            className="font-medium text-foreground"
                            style={{ fontFamily: font.value }}
                          >
                            {font.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {font.preview || font.value}
                          </div>
                        </div>
                      </div>
                      {(selectedFont?.id === font.id || (font.id === 'custom-font' && isCustomFont(value))) && (
                        <Check className="h-5 w-5 text-primary-strong" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Custom Font Input */}
            {selectedFont?.id === 'custom-font' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border p-4 bg-gradient-to-r from-[var(--rentify-color-warning-subtle)] to-[var(--rentify-color-warning-subtle)]"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Custom Font Family
                    </label>
                    <input
                      id="custom-font-input"
                      type="text"
                      value={customFont}
                      onChange={(e) => handleCustomFontChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., 'Your Custom Font, sans-serif'"
                      className="w-full px-4 py-3 bg-card border border-[var(--rentify-color-warning-border)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--rentify-color-warning-border)] focus:border-[var(--rentify-color-warning-border)] text-sm"
                    />
                  </div>
                  <div className="text-xs text-[var(--rentify-color-warning-text)] space-y-1">
                    <p>💡 Tips:</p>
                    <p>• Include fallback fonts: "Custom Font, Arial, sans-serif"</p>
                    <p>• Use quotes for fonts with spaces: "'Font Name', sans-serif"</p>
                    <p>• Ensure the font is available on your users' devices</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomFontSave}
                    disabled={!customFont.trim()}
                    className="w-full px-4 py-2 bg-gradient-to-r from-[var(--rentify-color-warning-base)] to-[var(--rentify-color-warning-base)] text-white font-medium rounded-lg hover:from-[var(--rentify-color-warning-base)] hover:to-[var(--rentify-color-warning-base)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Apply Custom Font
                  </button>
                </div>
              </motion.div>
            )}

            {/* Preview Section */}
            <div className="border-t border-border p-4 bg-muted">
              <div className="text-xs text-muted-foreground mb-2">Preview</div>
              <div 
                className="p-4 bg-card border border-border rounded-lg text-lg leading-relaxed"
                style={getFontPreviewStyle()}
              >
                {selectedFont?.category === 'khmer' ? (
                  <>
                    <div className="text-2xl mb-2">ពុទ្ធសាសនា</div>
                    <div className="text-base text-muted-foreground">
                      ប្រទេសកម្ពុជា មានព្រះពុទ្ធសាសនា ថេរវាទជាសាសនារបស់រដ្ឋ
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-2 font-bold">The quick brown fox</div>
                    <div className="text-base text-muted-foreground">
                      The quick brown fox jumps over the lazy dog. 1234567890
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      ABCDEFGHIJKLMNOPQRSTUVWXYZ
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Font Preview */}
      {!isOpen && value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-4 bg-gradient-to-r from-muted to-white border border-border rounded-lg"
        >
          <div className="text-xs text-muted-foreground mb-2">Active Font Preview</div>
          <div 
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: value }}
          >
            {selectedFont?.category === 'khmer' ? 'ពុទ្ធសាសនា' : 'Typography Preview'}
          </div>
          <div 
            className="text-sm text-muted-foreground leading-relaxed"
            style={{ fontFamily: value }}
          >
            {selectedFont?.category === 'khmer' 
              ? 'ការជ្រើសរើសពុម្ពអក្សរដ៏ល្អគឺសំខាន់សម្រាប់ការអានបានងាយស្រួល និងបទពិសោធន៍អ្នកប្រើប្រាស់។' 
              : 'Good typography establishes a clear visual hierarchy, provides a graphic balance, and sets the product’s overall tone.'
            }
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded ${getCategoryColor(selectedFont?.category || 'custom')}`}>
                {selectedFont?.category === 'khmer' ? 'អក្សរខ្មែរ' : 
                 selectedFont?.category === 'english' ? 'English' :
                 selectedFont?.category === 'system' ? 'System' : 'Custom'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-primary-strong hover:text-primary-strong font-medium"
            >
              Change font
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};