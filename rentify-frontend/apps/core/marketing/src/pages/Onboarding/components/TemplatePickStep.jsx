import React, { useMemo, useState } from 'react';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Check, Eye, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useGetTemplatesByCategoryQuery } from '@rentify/apis';

const industries = [
  {
    value: 'ecommerce',
    label: 'E-commerce',
    labelKh: 'ពាណិជ្ជកម្មអេឡិចត្រូនិក',
  },
  {
    value: 'Food & Beverage',
    label: 'Food & Beverage',
    labelKh: 'អាហារ និង ភេសជ្ជៈ',
  },
  {
    value: 'Beauty & Wellness',
    label: 'Beauty & Wellness',
    labelKh: 'សម្រស់ និង សុខភាព',
  },
  { value: 'Custom', label: 'Custom', labelKh: 'តាមតម្រូវការ' },
];

const TemplatePickStep = ({ data, onUpdate }) => {
  const { language } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState(data.template);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [filter, setFilter] = useState('ecommerce');
    const [currentPreviewPage, setCurrentPreviewPage] = useState('/');
  const { data: apiTemplates = [], isLoading } =
    useGetTemplatesByCategoryQuery(filter);
      const [deviceMode, setDeviceMode] = useState("desktop"); 

  const templates = useMemo(
    () =>
      apiTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        nameKh: template.name, // Use same as English if no translation
        category: template.category,
        categoryKh: template.category, // Use same as English
        image:
          template.thumbnailUrl || 'https://placehold.co/600x450/e2e8f0/e2e8f0',
        description: template.description,
        descriptionKh: template.description, // Use same as English
        features: [
          ...Object.entries(template.features)
            .filter(([key, value]) => value)
            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1)),
          ...template.pages.map((page) => page.page),
        ],
        featuresKh: [], // Leave empty if no translations
        bestFor: [template.category],
        bestForKh: [template.category],
        popular: true, // Set based on your criteria
        recommended: false, // Set based on your criteria
        languages: template.features.multiLanguage
          ? ['English', 'Khmer']
          : ['English'],
        responsive: template.features.responsive,
        liveDemo: template.baseUrl,
        tags: [
          ...Object.entries(template.features)
            .filter(([key, value]) => value)
            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1)),
        ],
             pageRoutes: {
          homepage: '/',
          product: '/products',
          cart: '/cart',
          dashboard: '/dashboard'
        }
      })),
    [apiTemplates]
  );


  // Function to handle page navigation in preview
  const navigatePreview = (route) => {
    setCurrentPreviewPage(route);
  };

  const filteredTemplates =
    filter === 'All'
      ? templates
      : templates.filter((t) => t.category === filter);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    onUpdate({ template });
    setPreviewTemplate(null);
  };

    const handlePreview = (template) => {
    setPreviewTemplate(template);
    // Reset to homepage when opening preview
    setCurrentPreviewPage(template.pageRoutes.homepage);
  };


  const closePreview = () => {
    setPreviewTemplate(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary px-6 py-3 rounded-full text-sm mb-6">
            <Sparkles className="w-5 h-5" />
            <span>Loading templates...</span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with guidance */}
      <div className="text-center mb-12">
        <h1
          className={`text-3xl font-bold text-gray-900 mb-4 ${
            language === 'KH' ? 'font-khmer' : ''
          }`}
        >
          {language === 'KH'
            ? 'ជ្រើសរើសការរចនាដំបូងរបស់អ្នក'
            : 'Choose Your Starting Design'}
        </h1>
        <p
          className={`text-lg text-gray-600 max-w-2xl mx-auto ${
            language === 'KH' ? 'font-khmer' : ''
          }`}
        >
          {language === 'KH'
            ? 'ជ្រើសរើសគំរូដែលសមរម្យជាមួយម៉ាករបស់អ្នក។ អ្នកអាចកែប្រែអ្វីៗគ្រប់យ៉ាងនៅពេលក្រោយ។'
            : 'Select a template that best fits your brand. You can customize everything later.'}
        </p>
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {industries.map((industry) => (
          <Button
            key={industry.value}
            variant={filter === industry.value ? 'default' : 'outline'}
            onClick={() => setFilter(industry.value)}
            className={`${language === 'KH' ? 'font-khmer' : ''}`}
          >
            {language === 'KH' ? industry.labelKh : industry.label}
          </Button>
        ))}
      </div>

      {/* All Templates */}
      <div className="space-y-16">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={`group cursor-pointer transition-all duration-300 hover:shadow-2xl overflow-hidden ${
              selectedTemplate?.id === template.id
                ? 'ring-2 ring-primary shadow-xl'
                : 'hover:shadow-lg'
            }`}
          >
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="relative h-full bg-gray-100 overflow-hidden">
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute top-4 right-4 z-20 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 h-full">
                    <iframe
                      src={template.liveDemo}
                      className="w-full h-full border-0"
                      title={`Preview of ${template.name}`}
                      sandbox="allow-same-origin allow-scripts"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-4">
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template);
                      }}
                      className="bg-white/95 text-gray-900 hover:bg-white"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      {language === 'KH' ? 'មើល' : 'Preview'}
                    </Button>
                    <Button
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelect(template);
                      }}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      {language === 'KH' ? 'ជ្រើសរើស' : 'Choose'}
                    </Button>
                  </div>
                </div>
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div>
                      <Badge className="bg-primary/10 text-primary px-3 py-1 text-sm mb-4">
                        {language === 'KH'
                          ? template.categoryKh
                          : template.category}
                      </Badge>
                      <h4
                        className={`text-3xl font-bold text-gray-900 mb-4 ${
                          language === 'KH' ? 'font-khmer' : ''
                        }`}
                      >
                        {language === 'KH' ? template.nameKh : template.name}
                      </h4>
                      <p
                        className={`text-lg text-gray-600 mb-6 ${
                          language === 'KH' ? 'font-khmer' : ''
                        }`}
                      >
                        {language === 'KH'
                          ? template.descriptionKh
                          : template.description}
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button
                        size="lg"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <Check className="w-5 h-5 mr-2" />
                        <span className={language === 'KH' ? 'font-khmer' : ''}>
                          {language === 'KH'
                            ? 'ជ្រើសរើសគំរូនេះ'
                            : 'Choose This Template'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
{previewTemplate && (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-in fade-in-0">
    <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0">
        <h3
          className={`text-lg sm:text-xl font-semibold ${
            language === 'KH' ? 'font-khmer' : ''
          }`}
        >
          {language === 'KH'
            ? previewTemplate.nameKh
            : previewTemplate.name}
        </h3>
        <Button variant="ghost" size="icon" onClick={closePreview}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation (Pages + Device Switcher) */}
      <div className="flex flex-wrap gap-2 p-3 sm:p-4 border-b bg-gray-50 shrink-0">
        {/* Page buttons */}
        <div className="flex flex-wrap gap-2 flex-1">
          <Button
            variant={currentPreviewPage === previewTemplate.pageRoutes.homepage ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigatePreview(previewTemplate.pageRoutes.homepage)}
          >
            {language === 'KH' ? 'ទំព័រដើម' : 'Homepage'}
          </Button>
          <Button
            variant={currentPreviewPage === previewTemplate.pageRoutes.product ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigatePreview(previewTemplate.pageRoutes.product)}
          >
            {language === 'KH' ? 'ផលិតផល' : 'Products'}
          </Button>
          <Button
            variant={currentPreviewPage === previewTemplate.pageRoutes.cart ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigatePreview(previewTemplate.pageRoutes.cart)}
          >
            {language === 'KH' ? 'រទេះ' : 'Cart'}
          </Button>
          <Button
            variant={currentPreviewPage === previewTemplate.pageRoutes.dashboard ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigatePreview(previewTemplate.pageRoutes.dashboard)}
          >
            {language === 'KH' ? 'ផ្ទាំងគ្រប់គ្រង' : 'Dashboard'}
          </Button>
        </div>

        {/* Device buttons */}
        <div className="flex gap-2">
          <Button
            variant={deviceMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceMode('mobile')}
          >
            📱 Mobile
          </Button>
          <Button
            variant={deviceMode === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceMode('tablet')}
          >
            📲 Tablet
          </Button>
          <Button
            variant={deviceMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDeviceMode('desktop')}
          >
            💻 Desktop
          </Button>
        </div>
      </div>

      {/* Iframe preview */}
      <div className="flex-1 flex items-center justify-center overflow-auto bg-gray-100">
        <div
          className={`
            border shadow-lg bg-white 
            ${deviceMode === 'mobile' ? 'w-[375px] h-[667px]' : ''} 
            ${deviceMode === 'tablet' ? 'w-[768px] h-[1024px]' : ''} 
            ${deviceMode === 'desktop' ? 'w-full h-full' : ''}
          `}
        >
          <iframe
            src={`${previewTemplate.liveDemo}${currentPreviewPage}`}
            className="w-full h-full border-0"
            title={`Preview of ${previewTemplate.name}`}
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end items-center p-4 sm:p-6 border-t bg-gray-50 shrink-0">
        <Button onClick={() => handleTemplateSelect(previewTemplate)}>
          <Check className="w-4 h-4 mr-2" />
          <span className={language === 'KH' ? 'font-khmer' : ''}>
            {language === 'KH' ? 'ជ្រើសរើសគំរូនេះ' : 'Choose This Template'}
          </span>
        </Button>
      </div>
    </div>
  </div>
)}



    </div>
  );
};

export default TemplatePickStep;
