// src/utils/vercelClient.js
const axios = require('axios');
const { logger } = require('./logger');

class VercelClient {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.vercel.com',
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    // Add retry interceptor
    this.axiosInstance.interceptors.response.use(null, async (error) => {
      const config = error.config;
      if (!config._retryCount) {
        config._retryCount = 0;
      }
      
      if (config._retryCount < 2) {
        config._retryCount += 1;
        const delay = config._retryCount * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.axiosInstance(config);
      }
      
      throw error;
    });
  }

  /**
   * Create deployment
   */
  async createDeployment(name, config) {
    const response = await this.axiosInstance.post('/v13/deployments', config, {
      timeout: 45000
    });
    return response.data;
  }

  /**
   * Update project settings
   */
  async updateProjectSettings(projectId) {
    try {
      await this.axiosInstance.patch(`/v13/projects/${projectId}`, {
        ssoProtection: null,
      }, {
        timeout: 10000
      });
    } catch (error) {
      logger.warn('Failed to update project settings', {
        projectId,
        error: error.message
      });
      // Non-critical error
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId) {
    const response = await this.axiosInstance.get(`/v13/deployments/${deploymentId}`, {
      timeout: 10000
    });
    return response.data.readyState;
  }
}

module.exports = VercelClient;