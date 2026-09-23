// New AIHelper component for contextual guidance
import React from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@rentify/shared/ui/popover';
import { Button } from '@rentify/shared/ui/button'
const AIHelper = ({ currentStep, formData, suggestions, language }) => {
  const getTip = () => {
    switch (currentStep) {
      case 1: return language === 'KH' ? 'ព្យាយាមឈ្មោះសាមញ្ញដូចជា ឈ្មោះអ្នក + ប្រភេទហាង' : 'Try a simple name like your name + business type';
      case 2: return language === 'KH' ? 'ជ្រើសរើសប្រភេទដែលជិតបំផុត យើងអាចកែក្រោយ' : 'Pick the closest type, we can adjust later';
      case 3: return language === 'KH' ? 'បន្ថែមផលិតផលពេញនិយមដំបូង ដើម្បីឃើញលទ្ធផលរហ័ស' : 'Add your best-seller first for quick results';
      case 4: return language === 'KH' ? 'ជ្រើសរើសការរចនាស្អាត យើងនឹងបន្ថែមពណ៌ម៉ាកអ្នកដោយស្វ័យប្រវត្តិ' : 'Choose a clean design, we\'ll auto-add your brand colors';
      case 5: return language === 'KH' ? 'សូមរង់ចាំបន្តិច ហាងអ្នកនឹងត្រៀមក្នុងពេលឆាប់ៗ' : 'Hang tight, your store will be ready soon';
      default: return '';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="absolute top-4 right-4">
          <HelpCircle className="mr-2 h-4 w-4" />
          {language === 'KH' ? 'ជំនួយ AI' : 'AI Help'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-primary mt-1" />
          <div>
            <h4 className="font-semibold mb-2">{language === 'KH' ? 'ព័ត៌មានជំនួយ' : 'Quick Tip'}</h4>
            <p className="text-sm text-gray-600">{getTip()}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AIHelper;