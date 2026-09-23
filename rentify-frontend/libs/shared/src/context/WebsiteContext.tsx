// context/ThemeContext.tsx
import React, { createContext, useContext, ReactNode, FC } from 'react';
import { useThemeService } from '../hooks/useThemeService';
import type { StaffWithContact } from '../types';

interface WebsiteContextProps {
  theme: any;
  rawTheme: any;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  websiteId: string | null;
  userId: string | null;
  userEmail: string | null;
  userPhoneNumber: string | null;
  content: any;
  websiteTemplate?: any;
  paymentConfigs?: any;
  getFilteredContent: (category: string) => any;
  staffs?: StaffWithContact[];
}

interface WebsiteProviderProps {
  children: ReactNode;
  templateId?: string;
}

const WebsiteContext = createContext<WebsiteContextProps | undefined>(undefined);

export const WebsiteProvider: FC<WebsiteProviderProps> = ({
  children,
  templateId,
}) => {
  const { theme, isLoading, error, refetch, websiteData, getFilteredContent, staffs } =
    useThemeService(templateId);

  return (
    <WebsiteContext.Provider
      value={{
        theme,
        rawTheme: theme,
        isLoading,
        error,
        refetch,
        websiteId: websiteData.websiteId,
        userId: websiteData.userId,
        userEmail: websiteData.userEmail,
        userPhoneNumber: websiteData.userPhoneNumber,
        content: websiteData.content,
        getFilteredContent,
        staffs,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
};

export const useWebsiteData = (): WebsiteContextProps => {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error('useWebsiteData must be used within a WebsiteProvider');
  }
  return context;
};

