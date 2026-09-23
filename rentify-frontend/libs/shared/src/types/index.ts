export type WebsiteContent = {
  id: string;
  value: string | any;
  createdAt: string;
  updatedAt: string;
  websiteId: string;
  category: string;
  label: string;
  type: string;
};

export type StaffWithContact = {
  id: string;
  contact: string;
  permissions: string[];
};

export type WebsitePackage = {
  id: string;
  name: string;
  features: string[];
  packageEndDate: string;
  subscriptionId: string;
};

export type WebsiteData = {
  websiteId: string | null;
  userId: string | null;
  userEmail: string | null;
  userPhoneNumber: string | null;
  content: WebsiteContent[];
  websiteTemplateId: string | null;
  package: WebsitePackage | null;
  storageUsedMB?: string | null;
  staffs?: StaffWithContact[];
};

export type Theme = {
  colors?: Record<string, string>;
  typography?: {
    fontFamily?: Record<string, string>;
    fontSize?: Record<string, string>;
    fontWeight?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
};