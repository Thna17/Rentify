// Updated BusinessTypeStep with visual cards and AI pre-selection
import React from 'react';
import { Coffee, Shirt, Smartphone, HeartHandshake } from 'lucide-react';

const BusinessTypeStep = ({ data, onUpdate, language, aiSuggestions }) => {
  const businessTypes = [
    {
      id: 'food-beverage',
      icon: Coffee,
      name: language === 'KH' ? 'កាហ្វេ / ភោជនីយដ្ឋាន' : 'Coffee Shop / Restaurant',
      description: language === 'KH' ? 'លក់ម្ហូបអាហារ និងភេសជ្ជៈ' : 'Food and beverages',
      example: language === 'KH' ? 'ឧ. ហាងកាហ្វេនៅកំពត' : 'e.g., Kampot Cafe'
    },
    {
      id: 'fashion-retail',
      icon: Shirt,
      name: language === 'KH' ? 'ខោអាវ / ហាងលក់រាយ' : 'Fashion / Retail',
      description: language === 'KH' ? 'លក់ខោអាវ និងគ្រឿងអលង្ការ' : 'Clothing and accessories',
      example: language === 'KH' ? 'ឧ. ហាងលក់ខោអាវនៅភ្នំពេញ' : 'e.g., Phnom Penh Fashion'
    },
    {
      id: 'electronics-goods',
      icon: Smartphone,
      name: language === 'KH' ? 'អេឡិចត្រូនិច / ផលិតផលផ្សេងៗ' : 'Electronics / Goods',
      description: language === 'KH' ? 'លក់គ្រឿងអេឡិចត្រូនិច' : 'Electronics and goods',
      example: language === 'KH' ? 'ឧ. ហាងលក់ទូរសព្ទនៅបាត់ដំបង' : 'e.g., Battambang Tech'
    },
    {
      id: 'service-other',
      icon: HeartHandshake,
      name: language === 'KH' ? 'សេវាកម្ម / ផ្សេងៗ' : 'Services / Other',
      description: language === 'KH' ? 'សេវាកម្ម និងការណាត់ជួប' : 'Services and appointments',
      example: language === 'KH' ? 'ឧ. សាឡនសម្រស់នៅកំពង់ស្ពឺ' : 'e.g., Kampong Speu Salon'
    }
  ];

  const handleSelect = (type) => {
    onUpdate({ businessType: type });
  };

  // Auto-select AI suggestion if available
  useEffect(() => {
    if (aiSuggestions.businessType && !data.businessType) {
      handleSelect(aiSuggestions.businessType);
    }
  }, [aiSuggestions]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {language === 'KH' ? 'ជ្រើសរើសប្រភេទអាជីវកម្មរបស់អ្នក' : 'Select Your Business Type'}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {language === 'KH' ? 'ជ្រើសរើសមួយដែលសមនឹងអ្នក យើងនឹងរៀបចំឱ្យត្រូវ' : 'Pick one that fits, we\'ll set it up for you'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {businessTypes.map((type) => (
          <div
            key={type.id}
            className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
              data.businessType === type.id ? 'border-primary bg-primary/5' : 'border-gray-200'
            }`}
            onClick={() => handleSelect(type.id)}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                data.businessType === type.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <type.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
                <p className="text-xs text-gray-500 mt-1">{type.example}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessTypeStep;