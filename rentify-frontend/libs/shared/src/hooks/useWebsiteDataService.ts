// services/website/website-data.service.ts

import { WebsiteContent, StaffWithContact, WebsiteData } from '../types';

export class WebsiteDataService {
  private data: WebsiteData = {
    websiteId: null,
    userId: null,
    userEmail: null,
    userPhoneNumber: null,
    content: [],
    websiteTemplateId: null,
    package: null,
    storageUsedMB: null, // Added for dashboard compatibility (optional)
  };

  private staffs: StaffWithContact[] = [];

  constructor(private apiService: any) {}

  // Update from frontstore API (getWebsiteByDomain)
  updateFromDomainData(apiData: any) {
    if (!apiData) return;

    const {
      websiteId,
      userId,
      userEmail,
      userPhoneNumber,
      content = [],
      websiteTemplateId,
      package: pkg,
      staffs = [],
      storageUsedMB, // If present
    } = apiData;

    this.data = {
      websiteId,
      userId,
      userEmail,
      userPhoneNumber,
      content,
      websiteTemplateId,
      package: pkg || null,
      storageUsedMB: storageUsedMB || null,
    };
    this.staffs = staffs;
  }

  // Update from dashboard API (getCurrentWebsite)
  updateFromDashboardData(apiData: any) {
    if (!apiData) return;

    const {
      id: websiteId,
      userId,
      userData,
      staffData = [],
      package: pkg,
      websiteTemplateId,
      WebsiteContents: content = [],
      storageUsedMB, // If present
    } = apiData;

    this.data = {
      websiteId,
      userId,
      userEmail: userData?.email || null,
      userPhoneNumber: userData?.phoneNumber || null,
      content,
      websiteTemplateId,
      package: pkg || null,
      storageUsedMB: storageUsedMB || null,
    };

    this.staffs = staffData.map((s: any) => ({
      id: s.id,
      contact: s.email || s.phoneNumber || '',
      permissions: s.permissions || [],
    }));
  }

  // Set default data (for auth/preview modes)
  setDefaultData() {
    this.data = {
      websiteId: null,
      userId: null,
      userEmail: null,
      userPhoneNumber: null,
      content: [],
      websiteTemplateId: 'platform',
      package: null,
      storageUsedMB: null,
    };
    this.staffs = [];
  }

  getData(): WebsiteData {
    return { ...this.data };
  }

  getStaffs(): StaffWithContact[] {
    return [...this.staffs];
  }

  getFilteredContent(category: string): WebsiteContent[] {
    return this.data.content.filter(
      (item) => item.category?.toLowerCase() === category.toLowerCase()
    );
  }

  getColorPalette(): WebsiteContent | undefined {
    return this.data.content.find(
      (item) => item.label === 'Color Palette' && item.type === 'palette'
    );
  }

  getThemeConfiguration(): WebsiteContent | undefined {
    return this.data.content.find(
      (item) => item.label === 'Theme Configuration' && item.type === 'theme'
    );
  }
}

export const createWebsiteDataService = (apiService: any) =>
  new WebsiteDataService(apiService);