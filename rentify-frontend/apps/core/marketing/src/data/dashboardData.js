// src/mockData/dashboardData.js
export const statsData = {
    totalWebsites: 5,
    statusCounts: [
      { status: 'active', count: 3 },
      { status: 'archived', count: 2 },
    ],
    subscriptionStatus: "Pro Plan",
    recentActivity: [
      { id: 1, action: 'Deployed', timestamp: '2024-02-15T09:30:00', domain: 'my-shop.com' },
      { id: 2, action: 'Updated', timestamp: '2024-02-14T15:20:00', domain: 'blog-site.org' },
      { id: 3, action: 'Deployed', timestamp: '2024-02-13T11:10:00', domain: 'portfolio-2024.net' },
    ],
    performanceData: [
      { date: 'Jan', visits: 65 },
      { date: 'Feb', visits: 125 },
      { date: 'Mar', visits: 195 },
    ]
  };
  
  export const websitesData = [
    {
      id: 1,
      domain: 'my-shop.com',
      status: 'active',
      template: 'E-commerce Pro',
      updatedAt: '2024-02-15T09:30:00',
      analytics: { visits: 2345 },
      thumbnail: '/thumbnails/ecom-thumb.jpg'
    },
    {
      id: 2,
      domain: 'blog-site.org',
      status: 'active',
      template: 'Blog Starter',
      updatedAt: '2024-02-14T15:20:00',
      analytics: { visits: 1890 },
      thumbnail: '/thumbnails/blog-thumb.jpg'
    },
    {
      id: 3,
      domain: 'portfolio-2024.net',
      status: 'archived',
      template: 'Portfolio Modern',
      updatedAt: '2024-02-10T11:10:00',
      analytics: { visits: 890 },
      thumbnail: '/thumbnails/portfolio-thumb.jpg'
    },
  ];
  
  export const websiteDetails = {
    id: 1,
    domain: 'my-shop.com',
    status: 'active',
    template: 'E-commerce Pro',
    deploymentHistory: [
      { id: 1, action: 'Initial Deployment', timestamp: '2024-01-01T10:00:00' },
      { id: 2, action: 'Updated Product Catalog', timestamp: '2024-01-15T14:30:00' },
      { id: 3, action: 'Security Patch Update', timestamp: '2024-02-01T09:15:00' },
    ],
    analytics: {
      visits: 2345,
      sources: {
        direct: 45,
        social: 30,
        search: 25
      }
    }
  };