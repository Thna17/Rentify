// components/ThemeCustomizationSection.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Type, 
  Ruler,
  CornerUpLeft,
  Globe,
  Layout
} from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { templateThemes } from '@rentify/shared/themes/index';
import { useTranslation } from '@rentify/utils';

interface ThemeCustomizationSectionProps {
  storeData: any;
  editingField: string | null;
  handleEdit: (field: string, value: string) => void;
  handleSave: (field: string) => void;
  handleCancel: () => void;
  tempValue: string;
  setTempValue: (value: string) => void;
  handleFontChange?: (field: string, value: string) => void;
  isUpdating: boolean;
  t: (key: string) => string;
  className?: string;
  colorPalettes?: string[] | any;
  onPaletteChange: (palette: string) => void;
  onResetTheme: () => void;
}

export const ThemeCustomizationSection: React.FC<ThemeCustomizationSectionProps> = ({
  storeData,
  editingField,
  handleEdit,
  handleSave,
  handleCancel,
  tempValue,
  setTempValue,
  handleFontChange,
  isUpdating,
  t,
  className,
  colorPalettes = ['default', 'luxuryGoldTheme', 'modernEcommerceTheme'],
  onPaletteChange,
  onResetTheme
}) => {
  const [expandedSections, setExpandedSections] = useState({
    colors: true,
    typography: false,
    spacing: false,
    borderRadius: false
  });

  // Ensure colorPalettes is always a valid array of string palette names
  const palettesList: string[] = Array.isArray(colorPalettes) && colorPalettes.length > 0
    ? colorPalettes
    : ['default', 'luxuryGoldTheme', 'modernEcommerceTheme'];

  // Get theme configuration from storeData?.shop?.theme
  const themeConfig = storeData?.shop?.theme || {
    colors: {},
    typography: {},
    spacing: {},
    borderRadius: {}
  };

  // Safely get selected color palette name (as a string)
  const rawPaletteValue = storeData?.contents?.find((c: any) => 
    c.label === 'Color Palette' && c.type === 'palette'
  )?.value;

  const selectedPalette = typeof rawPaletteValue === 'string'
    ? rawPaletteValue
    : (rawPaletteValue && typeof rawPaletteValue === 'object' && rawPaletteValue.name
        ? rawPaletteValue.name
        : (rawPaletteValue && typeof rawPaletteValue === 'object' ? 'custom' : 'default'));

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get current palette theme for preview
  const getCurrentPaletteTheme = () => {
    return templateThemes['1']?.[selectedPalette] || templateThemes['1']?.default;
  };

  const paletteTheme = getCurrentPaletteTheme();


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-muted to-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
                <Layout className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {t('dashboard.store_management.theme_customization')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dashboard.store_management.theme_customization_description')}
                </p>
              </div>
            </div>
            <button
              onClick={onResetTheme}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[var(--rentify-color-danger-base)] to-[var(--rentify-color-danger-base)] hover:from-[var(--rentify-color-danger-base)] hover:to-[var(--rentify-color-danger-base)] rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4" />
              {t('dashboard.store_management.reset_theme')}
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Color Palette Selection */}
          <div className="bg-gradient-to-br from-muted to-white p-5 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-muted to-[var(--rentify-color-danger-subtle)] rounded-lg">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {t('dashboard.store_management.color_palette')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.p2.selectAPreDesigned')}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-accent text-primary-strong text-sm font-medium rounded-lg">
                {t('dashboard.store_management.current_palette')}: {selectedPalette}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {palettesList.map((palette) => (
                <button
                  key={palette}
                  onClick={() => onPaletteChange(palette)}
                  disabled={isUpdating}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                    selectedPalette === palette
                      ? 'bg-gradient-to-br from-primary/10 to-secondary/10 border-primary shadow-sm'
                      : 'bg-card border-border hover:border-border hover:shadow-sm'
                  } disabled:opacity-50`}
                >
                  <div className="flex gap-1">
                    <div className={`w-6 h-6 rounded-full ${
                      palette === 'luxuryGoldTheme' ? 'bg-[var(--rentify-color-warning-base)]' :
                      palette === 'modernEcommerceTheme' ? 'bg-black' :
                      'bg-primary'
                    }`} />
                    <div className={`w-6 h-6 rounded-full ${
                      palette === 'luxuryGoldTheme' ? 'bg-foreground' :
                      palette === 'modernEcommerceTheme' ? 'bg-muted-foreground' :
                      'bg-[var(--rentify-color-success-base)]'
                    }`} />
                    <div className={`w-6 h-6 rounded-full ${
                      palette === 'luxuryGoldTheme' ? 'bg-[var(--rentify-color-warning-base)]' :
                      palette === 'modernEcommerceTheme' ? 'bg-[var(--rentify-color-danger-base)]' :
                      'bg-[var(--rentify-color-warning-base)]'
                    }`} />
                  </div>
                  <span className={`text-sm font-medium ${
                    selectedPalette === palette ? 'text-primary' : 'text-foreground'
                  }`}>
                    {palette}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Colors Section */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('colors')}
              className="w-full p-5 flex items-center justify-between hover:bg-muted transition-colors bg-gradient-to-r from-muted to-white"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-accent to-[var(--rentify-color-info-subtle)] rounded-lg">
                  <Palette className="h-5 w-5 text-primary-strong" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">
                    {t('dashboard.store_management.colors')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('merchant.p2.customizeYourPrimarySecondary')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t('dashboard.store_management.palette_default')}: {paletteTheme?.colors?.primary || '#3B82F6'}
                </span>
                {expandedSections.colors ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {expandedSections.colors && (
              <div className="p-5 border-t border-border space-y-6 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <ColorPicker
                    field="theme.colors.primary"
                    value={themeConfig.colors?.primary || paletteTheme?.colors?.primary || '#3B82F6'}
                    label="dashboard.store_management.primary_color"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                  
                  <ColorPicker
                    field="theme.colors.secondary"
                    value={themeConfig.colors?.secondary || paletteTheme?.colors?.secondary || '#10B981'}
                    label="dashboard.store_management.secondary_color"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />

                  <ColorPicker
                    field="theme.colors.accent"
                    value={themeConfig.colors?.accent || paletteTheme?.colors?.accent || '#F59E0B'}
                    label="dashboard.store_management.accent_color"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                </div>

                {/* Color Preview */}
                <div className="p-5 bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {t('dashboard.store_management.color_preview')}
                  </h4>
                  <div className="flex flex-wrap gap-5 items-center">
                    <div className="text-center">
                      <div 
                        className="w-20 h-20 rounded-2xl mb-3 border-2 border-border shadow-sm"
                        style={{ backgroundColor: themeConfig.colors?.primary || paletteTheme?.colors?.primary || '#3B82F6' }}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {t('dashboard.store_management.primary_color')}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {themeConfig.colors?.primary || paletteTheme?.colors?.primary || '#3B82F6'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-20 h-20 rounded-2xl mb-3 border-2 border-border shadow-sm"
                        style={{ backgroundColor: themeConfig.colors?.secondary || paletteTheme?.colors?.secondary || '#10B981' }}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {t('dashboard.store_management.secondary_color')}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {themeConfig.colors?.secondary || paletteTheme?.colors?.secondary || '#10B981'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-20 h-20 rounded-2xl mb-3 border-2 border-border shadow-sm"
                        style={{ backgroundColor: themeConfig.colors?.accent || paletteTheme?.colors?.accent || '#F59E0B' }}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {t('dashboard.store_management.accent_color')}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {themeConfig.colors?.accent || paletteTheme?.colors?.accent || '#F59E0B'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-5 shadow-sm sm:min-w-[300px]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-foreground">{t('merchant.p2.buttonPreview')}</span>
                        <button 
                          className="px-4 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all duration-200 hover:shadow"
                          style={{ backgroundColor: themeConfig.colors?.primary || paletteTheme?.colors?.primary || '#3B82F6' }}
                        >
                          {t('header.shop')}
                        </button>
                      </div>
                      <div 
                        className="h-2 rounded-full"
                        style={{ backgroundColor: themeConfig.colors?.secondary || paletteTheme?.colors?.secondary || '#10B981' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Typography Section */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('typography')}
              className="w-full p-5 flex items-center justify-between hover:bg-muted transition-colors bg-gradient-to-r from-muted to-white"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-accent to-muted rounded-lg">
                  <Type className="h-5 w-5 text-primary-strong" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">
                    {t('dashboard.store_management.typography')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('merchant.p2.chooseFontsForHeadings')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t('dashboard.store_management.palette_default')}: {paletteTheme?.typography?.fontFamily?.primary || 'Inter'}
                </span>
                {expandedSections.typography ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {expandedSections.typography && (
              <div className="p-5 border-t border-border space-y-6 bg-card">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-accent rounded">
                        <Type className="h-4 w-4 text-primary-strong" />
                      </div>
                      <label className="text-sm font-semibold text-foreground">
                        {t('dashboard.store_management.primary_font')}
                      </label>
                      <span className="ml-2 px-2 py-1 bg-accent text-primary-strong text-xs rounded">
                        {t('merchant.p2.headings')}
                      </span>
                    </div>
            <FontSelector
  value={themeConfig.typography?.fontFamily?.primary || paletteTheme?.typography?.fontFamily?.primary || 'Inter'}
  onChange={(value) => handleFontChange?.('theme.typography.fontFamily.primary', value)}
  placeholder={t('merchant.p2.selectPrimaryFont')}
  label={t('merchant.p2.mainFontForHeadings')}
/>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-accent rounded">
                        <Globe className="h-4 w-4 text-primary-strong" />
                      </div>
                      <label className="text-sm font-semibold text-foreground">
                        {t('dashboard.store_management.secondary_font')}
                      </label>
                      <span className="ml-2 px-2 py-1 bg-[var(--rentify-color-success-subtle)] text-[var(--rentify-color-success-text)] text-xs rounded">
                        {t('merchant.p2.bodyText')}
                      </span>
                    </div>
                    <FontSelector
                      value={themeConfig.typography?.fontFamily?.secondary || paletteTheme?.typography?.fontFamily?.secondary || 'Inter'}
                      onChange={(value) => handleFontChange?.('theme.typography.fontFamily.secondary', value)}
                      placeholder={t('merchant.p2.selectSecondaryFont')}
                      label={t('merchant.p2.fontForBodyText')}
                    />
                  </div>
                </div>

                {/* Font Preview */}
                <div className="p-5 bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    {t('merchant.p2.fontPreview')}
                  </h4>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Primary Font Preview */}
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-3">{t('merchant.p2.primaryFont')}</div>
                        <div 
                          className="space-y-3"
                          style={{ fontFamily: themeConfig.typography?.fontFamily?.primary || paletteTheme?.typography?.fontFamily?.primary || 'Inter' }}
                        >
                          <h1 className="text-3xl font-bold text-foreground">{t('merchant.p2.heading1')}</h1>
                          <h2 className="text-2xl font-semibold text-foreground">{t('merchant.p2.heading2')}</h2>
                          <h3 className="text-xl font-medium text-foreground">{t('merchant.p2.heading3')}</h3>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            {t('merchant.p2.thisIsHowYour')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Secondary Font Preview */}
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground mb-3">{t('merchant.p2.secondaryFont')}</div>
                        <div 
                          className="space-y-3"
                          style={{ fontFamily: themeConfig.typography?.fontFamily?.secondary || paletteTheme?.typography?.fontFamily?.secondary || 'Inter' }}
                        >
                          <p className="text-lg text-foreground leading-relaxed">
                            {t('merchant.p2.thisIsHowYour2')}
                          </p>
                          <p className="text-base text-muted-foreground leading-relaxed">
                            {t('merchant.p2.paragraphsWithTheSecondary')}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {t('merchant.p2.smallerTextAndCaptions')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Combined Preview */}
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <div className="text-xs text-muted-foreground mb-3">{t('merchant.p2.combinedPreview')}</div>
                      <div className="space-y-4">
                        <div 
                          className="text-2xl font-bold text-foreground"
                          style={{ fontFamily: themeConfig.typography?.fontFamily?.primary || paletteTheme?.typography?.fontFamily?.primary || 'Inter' }}
                        >
                          {t('merchant.p2.welcomeToYourStore')}
                        </div>
                        <div 
                          className="text-base text-muted-foreground leading-relaxed"
                          style={{ fontFamily: themeConfig.typography?.fontFamily?.secondary || paletteTheme?.typography?.fontFamily?.secondary || 'Inter' }}
                        >
                          {t('merchant.p2.thisIsAPreview')}
                        </div>
                        <button 
                          className="px-4 py-2 bg-gradient-to-r from-primary to-primary text-white font-medium rounded-lg mt-2"
                          style={{ fontFamily: themeConfig.typography?.fontFamily?.primary || paletteTheme?.typography?.fontFamily?.primary || 'Inter' }}
                        >
                          {t('merchant.p2.shopNow')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spacing Section */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('spacing')}
              className="w-full p-5 flex items-center justify-between hover:bg-muted transition-colors bg-gradient-to-r from-muted to-white"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-[var(--rentify-color-success-subtle)] to-[var(--rentify-color-success-subtle)] rounded-lg">
                  <Ruler className="h-5 w-5 text-[var(--rentify-color-success-text)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">
                    {t('dashboard.store_management.spacing')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('merchant.p2.adjustSpacingBetweenElements')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t('dashboard.store_management.palette_default')}: {paletteTheme?.spacing?.md || '1rem'}
                </span>
                {expandedSections.spacing ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {expandedSections.spacing && (
              <div className="p-5 border-t border-border space-y-4 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SpacingField
                    field="theme.spacing.xs"
                    value={themeConfig.spacing?.xs || paletteTheme?.spacing?.xs || '0.5rem'}
                    label="dashboard.store_management.spacing_xs"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                  
                  <SpacingField
                    field="theme.spacing.sm"
                    value={themeConfig.spacing?.sm || paletteTheme?.spacing?.sm || '0.75rem'}
                    label="dashboard.store_management.spacing_sm"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />

                  <SpacingField
                    field="theme.spacing.md"
                    value={themeConfig.spacing?.md || paletteTheme?.spacing?.md || '1rem'}
                    label="dashboard.store_management.spacing_md"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />

                  <SpacingField
                    field="theme.spacing.lg"
                    value={themeConfig.spacing?.lg || paletteTheme?.spacing?.lg || '1.5rem'}
                    label="dashboard.store_management.spacing_lg"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                </div>
                
                {/* Spacing Preview */}
                <div className="p-5 bg-gradient-to-br from-muted to-white rounded-xl border border-border mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">{t('merchant.p2.spacingPreview')}</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {['xs', 'sm', 'md', 'lg'].map((size) => (
                        <div key={size} className="flex items-center gap-2">
                          <div 
                            className="bg-primary rounded"
                            style={{
                              width: themeConfig.spacing?.[size] || paletteTheme?.spacing?.[size] || 
                                    (size === 'xs' ? '0.5rem' : size === 'sm' ? '0.75rem' : size === 'md' ? '1rem' : '1.5rem'),
                              height: '8px'
                            }}
                          />
                          <span className="text-xs text-muted-foreground capitalize">{size}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-card border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2" style={{ width: '60%' }} />
                          <div className="h-3 bg-muted rounded" style={{ width: '40%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Border Radius Section */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('borderRadius')}
              className="w-full p-5 flex items-center justify-between hover:bg-muted transition-colors bg-gradient-to-r from-muted to-white"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gradient-to-br from-[var(--rentify-color-warning-subtle)] to-[var(--rentify-color-warning-subtle)] rounded-lg">
                  <CornerUpLeft className="h-5 w-5 text-[var(--rentify-color-warning-text)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">
                    {t('dashboard.store_management.border_radius')}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('merchant.p2.customizeCornerRounding')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t('dashboard.store_management.palette_default')}: {paletteTheme?.borderRadius?.md || '0.5rem'}
                </span>
                {expandedSections.borderRadius ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>
            
            {expandedSections.borderRadius && (
              <div className="p-5 border-t border-border space-y-4 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <BorderRadiusField
                    field="theme.borderRadius.sm"
                    value={themeConfig.borderRadius?.sm || paletteTheme?.borderRadius?.sm || '0.375rem'}
                    label="dashboard.store_management.border_radius_sm"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                  
                  <BorderRadiusField
                    field="theme.borderRadius.md"
                    value={themeConfig.borderRadius?.md || paletteTheme?.borderRadius?.md || '0.5rem'}
                    label="dashboard.store_management.border_radius_md"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />

                  <BorderRadiusField
                    field="theme.borderRadius.lg"
                    value={themeConfig.borderRadius?.lg || paletteTheme?.borderRadius?.lg || '0.75rem'}
                    label="dashboard.store_management.border_radius_lg"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />

                  <BorderRadiusField
                    field="theme.borderRadius.full"
                    value={themeConfig.borderRadius?.full || paletteTheme?.borderRadius?.full || '9999px'}
                    label="dashboard.store_management.border_radius_full"
                    editingField={editingField}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    tempValue={tempValue}
                    setTempValue={setTempValue}
                    isUpdating={isUpdating}
                    t={t}
                  />
                </div>
                
                {/* Border Radius Preview */}
                <div className="p-5 bg-gradient-to-br from-muted to-white rounded-xl border border-border mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">{t('merchant.p2.borderRadiusPreview')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {['sm', 'md', 'lg', 'full'].map((size) => (
                      <div key={size} className="text-center">
                        <div 
                          className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary mb-3 flex items-center justify-center text-white font-bold"
                          style={{
                            borderRadius: themeConfig.borderRadius?.[size] || paletteTheme?.borderRadius?.[size] || 
                                        (size === 'sm' ? '0.375rem' : size === 'md' ? '0.5rem' : size === 'lg' ? '0.75rem' : '9999px')
                          }}
                        >
                          {size === 'full' ? '○' : '□'}
                        </div>
                        <div className="text-xs font-medium text-foreground capitalize">{size}</div>
                        <div className="text-xs text-muted-foreground">
                          {themeConfig.borderRadius?.[size] || paletteTheme?.borderRadius?.[size] || 
                           (size === 'sm' ? '0.375rem' : size === 'md' ? '0.5rem' : size === 'lg' ? '0.75rem' : 'Full circle')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Spacing Field Component
const SpacingField: React.FC<any> = ({
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
          {t(label)}
        </label>
        {!isEditing && (
          <button
            onClick={() => onEdit(field, value)}
            className="text-xs text-primary-strong hover:text-primary-strong font-medium"
          >
            {t('merchant.p2.edit')}
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex gap-2">
          <input
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-border rounded-lg text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-sm"
            placeholder="0.5rem"
          />
          <button 
            onClick={() => onSave(field)}
            disabled={isUpdating}
            className="h-10 w-10 bg-gradient-to-r from-primary to-primary text-white rounded-lg flex items-center justify-center hover:from-primary hover:to-primary disabled:opacity-50 transition-all duration-200"
          >
            ✓
          </button>
          <button 
            onClick={onCancel}
            className="h-10 w-10 border border-border bg-card rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div 
            onClick={() => onEdit(field, value)}
            className="p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-border hover:shadow-sm transition-all duration-200"
          >
            <span className="font-medium text-foreground">{value}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Border Radius Field Component
const BorderRadiusField: React.FC<any> = ({
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <CornerUpLeft className="h-3.5 w-3.5 text-muted-foreground" />
          {t(label)}
        </label>
        {!isEditing && (
          <button
            onClick={() => onEdit(field, value)}
            className="text-xs text-primary-strong hover:text-primary-strong font-medium"
          >
            {t('merchant.p2.edit')}
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex gap-2">
          <input
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-border rounded-lg text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-sm"
            placeholder="0.5rem"
          />
          <button 
            onClick={() => onSave(field)}
            disabled={isUpdating}
            className="h-10 w-10 bg-gradient-to-r from-primary to-primary text-white rounded-lg flex items-center justify-center hover:from-primary hover:to-primary disabled:opacity-50 transition-all duration-200"
          >
            ✓
          </button>
          <button 
            onClick={onCancel}
            className="h-10 w-10 border border-border bg-card rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div 
            onClick={() => onEdit(field, value)}
            className="p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-border hover:shadow-sm transition-all duration-200"
          >
            <span className="font-medium text-foreground">{value}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};