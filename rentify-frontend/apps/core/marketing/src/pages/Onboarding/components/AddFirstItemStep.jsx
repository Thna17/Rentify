import React, { useState } from 'react';
import { Upload, Camera, DollarSign } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';

const AddFirstItemStep = ({ data, onUpdate, onNext, language }) => {
  const [itemData, setItemData] = useState({
    name: '',
    price: '',
    currency: 'USD',
    image: null
  });

  const handleInputChange = (field, value) => {
    const newData = { ...itemData, [field]: value };
    setItemData(newData);
    
    // Auto-save to form data if we have a name
    if (field === 'name' && value.trim()) {
      onUpdate({ firstItem: newData });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newData = { ...itemData, image: e.target.result };
        setItemData(newData);
        onUpdate({ firstItem: newData });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = () => {
    onUpdate({ firstItem: itemData });
    onNext();
  };

  const getItemType = () => {
    return data.businessType === 'food-beverage' 
      ? (language === 'KH' ? 'មុខម្ហូប' : 'menu item')
      : (language === 'KH' ? 'ផលិតផល' : 'product');
  };

  const isFormValid = itemData.name.trim() && itemData.price;

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {language === 'KH' 
            ? `តោះបន្ថែម${getItemType()}ដំបូងរបស់អ្នក`
            : `Let's add your first ${getItemType()}`
          }
        </h1>
        <p className="text-lg text-gray-600">
          {language === 'KH' 
            ? 'ចាប់ផ្ដើមជាមួយផលិតផលមួយ បន្ទាប់មកបន្ថែមបន្ថែមទៀតនៅក្នុងផ្ទាំងគ្រប់គ្រង'
            : 'Start with one item, then add more in your dashboard later'
          }
        </p>
      </div>

      <div className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {language === 'KH' ? 'រូបភាពផលិតផល' : 'Item Photo'}
          </label>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors group"
            onClick={() => document.getElementById('item-image').click()}
          >
            <input
              type="file"
              id="item-image"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
            
            {itemData.image ? (
              <div className="space-y-3">
                <img 
                  src={itemData.image} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg mx-auto"
                />
                <p className="text-sm text-gray-600">
                  {language === 'KH' ? 'ចុចដើម្បីប្ដូររូប' : 'Click to change photo'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/10">
                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'KH' ? 'បន្ថែមរូបភាព' : 'Add a photo'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {language === 'KH' ? 'ឬទាញដាក់រូបនៅទីនេះ' : 'or drag and drop here'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Item Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {language === 'KH' ? `ឈ្មោះ${getItemType()}` : `${getItemType()} Name`}
          </label>
          <input
            type="text"
            value={itemData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={
              data.businessType === 'food-beverage'
                ? (language === 'KH' ? 'ឧ. កាហ្វេទឹកកក' : 'e.g., Iced Coffee')
                : (language === 'KH' ? 'ឧ. កាបូបលក់' : 'e.g., Handbag')
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {language === 'KH' ? 'តម្លៃ' : 'Price'}
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={itemData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <select 
                value={itemData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-gray-600"
              >
                <option value="USD">USD</option>
                <option value="KHR">KHR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={onNext}
          className="flex-1 border-gray-300"
        >
          {language === 'KH' ? 'រំលងសម្រាប់ពេលនេះ' : 'Skip for now'}
        </Button>
        
        <Button
          onClick={handleAddItem}
          disabled={!isFormValid}
          className="flex-1 bg-gradient-to-r from-primary to-secondary shadow-lg"
        >
          {language === 'KH' ? 'បន្ថែមផលិតផល' : 'Add Item'}
        </Button>
      </div>

      {/* Quick Tip */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600">💡</span>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              {language === 'KH' ? 'ព័ត៌មានជំនួយ' : 'Quick Tip'}
            </p>
            <p className="text-xs text-blue-700">
              {language === 'KH' 
                ? 'អ្នកអាចបន្ថែមផលិតផលបន្ថែមទៀត និងកែប្រែព័ត៌មាននៅពេលក្រោយនៅក្នុងផ្ទាំងគ្រប់គ្រង'
                : 'You can add more items and edit details later in your dashboard'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFirstItemStep;