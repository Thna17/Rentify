import React from 'react';
import { Upload, Building, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const BusinessDetailsStep = ({ data, onUpdate }) => {
  const { t, language } = useLanguage();
  const isKhmer = language === 'KH';

  const handleInputChange = (field, value) => {
    onUpdate({ businessDetails: { ...data.businessDetails, [field]: value } });
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const logoUrl = URL.createObjectURL(file);
      onUpdate({ businessDetails: { ...data.businessDetails, logo: logoUrl, file: file } });
    }
  };


  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className={`text-3xl font-bold text-gray-900 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.title')}</h1>
        <p className={`mt-2 text-lg text-gray-600 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.description')}</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.name.label')}</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={data.businessDetails?.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('business.name.placeholder')} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" required />
          </div>
        </div>
        
        <div>
           <label className={`block text-sm font-medium text-gray-700 mb-2 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.logo.label')}</label>
           <div className="flex items-center gap-4">
              {data.businessDetails?.logo && <img src={data.businessDetails.logo} alt="Logo Preview" className="w-20 h-20 rounded-lg object-cover border"/>}
              <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => document.getElementById('logo-upload').click()}>
                  <input type="file" id="logo-upload" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/svg+xml" />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className={`text-sm text-gray-600 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.logo.upload')}</p>
                  <p className={`text-xs text-gray-500 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.logo.format')}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.location.label')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <select value={data.businessDetails?.location || ''} onChange={(e) => handleInputChange('location', e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition appearance-none" required>
                    <option value="">{t('business.location.placeholder')}</option>
                    <option value="phnom-penh">{t('business.location.phnom-penh') || 'Phnom Penh'}</option>
                    <option value="siem-reap">{t('business.location.siem-reap') || 'Siem Reap'}</option>
                    <option value="kampong-speu">{t('business.location.kampong-speu') || 'Kampong Speu'}</option>
                    <option value="other">{t('business.location.other') || 'Other'}</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.contact.label')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={data.businessDetails?.contact || ''} onChange={(e) => handleInputChange('contact', e.target.value)} placeholder={t('business.contact.placeholder')} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" required />
              </div>
            </div>
        </div>
        
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${isKhmer ? 'font-khmer' : ''}`}>{t('business.email.label')}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="email" value={data.businessDetails?.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} placeholder={t('business.email.placeholder')} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition" required />
          </div>
        </div>
      </div>
    </div>
  );
};


export default BusinessDetailsStep;