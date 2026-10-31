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
      case 'khmer': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'english-serif':
      case 'english-sans':
      case 'english-display': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'system': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'custom': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
            <Type className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-gray-900 truncate" style={getFontPreviewStyle()}>
              {getDisplayValue()}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {selectedFont?.value || value || 'Select font family'}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search fonts..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Font List */}
            <div className="overflow-y-auto max-h-64">
              {filteredCategories.map((category) => (
                <div key={category.id} className="border-b border-gray-100 last:border-b-0">
                  <div className={`sticky top-0 px-4 py-2 text-xs font-semibold ${getCategoryColor(category.id)} flex items-center gap-2`}>
                    {getCategoryIcon(category.id)}
                    {category.label}
                  </div>
                  {category.fonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleFontSelect(font)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                        (selectedFont?.id === font.id || (font.id === 'custom-font' && isCustomFont(value))) 
                          ? 'bg-blue-50' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          font.category === 'khmer' ? 'bg-emerald-100' :
                          font.category === 'english' ? 'bg-blue-100' :
                          font.category === 'system' ? 'bg-purple-100' :
                          'bg-amber-100'
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
                            className="font-medium text-gray-900"
                            style={{ fontFamily: font.value }}
                          >
                            {font.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {font.preview || font.value}
                          </div>
                        </div>
                      </div>
                      {(selectedFont?.id === font.id || (font.id === 'custom-font' && isCustomFont(value))) && (
                        <Check className="h-5 w-5 text-blue-600" />
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
                className="border-t border-gray-100 p-4 bg-gradient-to-r from-amber-50 to-orange-50"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Font Family
                    </label>
                    <input
                      id="custom-font-input"
                      type="text"
                      value={customFont}
                      onChange={(e) => handleCustomFontChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., 'Your Custom Font, sans-serif'"
                      className="w-full px-4 py-3 bg-white border border-amber-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    />
                  </div>
                  <div className="text-xs text-amber-600 space-y-1">
                    <p>💡 Tips:</p>
                    <p>• Include fallback fonts: "Custom Font, Arial, sans-serif"</p>
                    <p>• Use quotes for fonts with spaces: "'Font Name', sans-serif"</p>
                    <p>• Ensure the font is available on your users' devices</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomFontSave}
                    disabled={!customFont.trim()}
                    className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Apply Custom Font
                  </button>
                </div>
              </motion.div>
            )}

            {/* Preview Section */}
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="text-xs text-gray-500 mb-2">Preview</div>
              <div 
                className="p-4 bg-white border border-gray-200 rounded-lg text-lg leading-relaxed"
                style={getFontPreviewStyle()}
              >
                {selectedFont?.category === 'khmer' ? (
                  <>
                    <div className="text-2xl mb-2">ពុទ្ធសាសនា</div>
                    <div className="text-base text-gray-600">
                      ប្រទេសកម្ពុជា មានព្រះពុទ្ធសាសនា ថេរវាទជាសាសនារបស់រដ្ឋ
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl mb-2 font-bold">The quick brown fox</div>
                    <div className="text-base text-gray-600">
                      The quick brown fox jumps over the lazy dog. 1234567890
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
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
          className="mt-3 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg"
        >
          <div className="text-xs text-gray-500 mb-2">Active Font Preview</div>
          <div 
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: value }}
          >
            {selectedFont?.category === 'khmer' ? 'ពុទ្ធសាសនា' : 'Typography Preview'}
          </div>
          <div 
            className="text-sm text-gray-600 leading-relaxed"
            style={{ fontFamily: value }}
          >
            {selectedFont?.category === 'khmer' 
              ? 'ការជ្រើសរើសពុម្ពអក្សរដ៏ល្អគឺសំខាន់សម្រាប់ការអានបានងាយស្រួល និងបទពិសោធន៍អ្នកប្រើប្រាស់។' 
              : 'Good typography establishes a clear visual hierarchy, provides a graphic balance, and sets the product’s overall tone.'
            }
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
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
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Change font
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};