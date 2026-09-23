// settings-layout.tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { useNavigate } from 'react-router-dom';

interface SettingsLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  children,
  icon,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container  mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with back button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {React.cloneElement(icon as React.ReactElement, { 
                className: "h-6 w-6 text-blue-600" 
              })}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600">{description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};