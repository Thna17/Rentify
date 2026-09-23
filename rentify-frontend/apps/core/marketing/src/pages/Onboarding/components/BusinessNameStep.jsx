// Updated BusinessNameStep with AI suggestions and auto-URL generation
import React, { useState, useEffect } from 'react';
import { Store, Link as LinkIcon, Sparkles } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';

const BusinessNameStep = ({ data, onUpdate, language, aiSuggestions }) => {
  const [name, setName] = useState(data.businessName || '');
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  useEffect(() => {
    if (name.trim()) {
      onUpdate({ businessName: name });
    }
  }, [name]);

  const generateStoreUrl = (name) => {
    if (!name.trim()) return 'your-store.rentify.com.kh';
    const slug = name.toLowerCase().replace(/[^a-z0-9ក-ឳ]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return `${slug}.rentify.com.kh`;
  };

  // Mock AI suggestions - in production, call AI API
  const aiNameSuggestions = [
    language === 'KH' ? 'ហាងកាហ្វេស្រី' : "Srey's Cafe",
    language === 'KH' ? 'ភោជនីយដ្ឋានខ្មែរ' : 'Khmer Kitchen',
    language === 'KH' ? 'ហាងលក់ខោអាវកម្ពុជា' : 'Cambodia Fashion'
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {language === 'KH' ? 'សូមស្វាគមន៍! តោះរៀបចំហាងអ្នក' : 'Welcome! Let\'s get you set up'}
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          {language === 'KH' 
            ? 'ជ្រើសរើសឈ្មោះសាមញ្ញ យើងនឹងបង្កើតតំណភ្ជាប់ហាងឱ្យអ្នក'
            : 'Pick a simple name, we\'ll create your store link'}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {language === 'KH' ? 'ឈ្មោះអាជីវកម្មរបស់អ្នក' : 'Your Business Name'}
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'KH' ? 'ឧ. ហាងកាហ្វេ Srey' : 'e.g., Srey\'s Cafe'}
              className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-lg"
              autoFocus
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <LinkIcon className="w-4 h-4" />
            <span>{language === 'KH' ? 'តំណភ្ជាប់ហាងរបស់អ្នក' : 'Your store link'}</span>
          </div>
          <div className="font-mono text-primary font-medium text-lg">
            {generateStoreUrl(name)}
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setShowAiSuggestions(!showAiSuggestions)}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {language === 'KH' ? 'មើលការស្នើពី AI' : 'Get AI Name Suggestions'}
          </Button>
          {showAiSuggestions && (
            <div className="grid gap-2">
              {aiNameSuggestions.map((sug, i) => (
                <Button 
                  key={i} 
                  variant="ghost" 
                  onClick={() => setName(sug)}
                  className="justify-start"
                >
                  {sug}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessNameStep;