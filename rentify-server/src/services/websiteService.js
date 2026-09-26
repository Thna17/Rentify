// services/websiteService.js
const { Website, WebsiteTemplate, User, Staff, Package, WebsiteSyncOutbox, WebsiteContent } = require('../models');
const subscriptionService = require('./subscriptionService');
const storeService = require('./storeService');
const storeSyncService = require('./storeSyncService');
const { logger } = require('../utils/logger');
const { DEPLOYMENT } = require('../config/constants');

class WebsiteService {
  /**
   * Create website with free trial
   */
  async createWebsiteWithTrial({ userId, templateId, businessData, packageId, paymentId }) {
    const transaction = await Website.sequelize.transaction();

    try {
      // Validate inputs
      await this.validateCreationInputs({ templateId, packageId, userId });

      // A deployment retry must reuse the same Website and trial. A merchant
      // may own only one Website, including after starting as marketplace-only.
      const existingWebsite = await Website.findOne({ where: { userId }, transaction });
      if (existingWebsite) {
        await transaction.commit();
        return existingWebsite;
      }

      // Get package and template
      const [packageData, template, user, staffs] = await Promise.all([
        Package.findByPk(packageId, { transaction }),
        this.getTemplateWithContents(templateId, transaction),
        User.findByPk(userId, { transaction }),
        Staff.findAll({ 
          where: { merchantId: userId }, 
          attributes: ['id', 'name', 'email', 'phoneNumber', 'permissions'],
          transaction 
        })
      ]);

      // Personalize template content
      const initialContent = this.personalizeTemplateContent(
        template.TemplateContents, 
        businessData
      );

      const store = await storeService.ensureForWebsite({
        ownerUserId: userId,
        businessData,
        transaction,
      });

      // Create the website first because Subscription.websiteId is required.
      // Both rows stay in the same transaction so a failed trial rolls back
      // the website as well.
      const website = await Website.create({
        userId,
        storeId: store.id,
        templateId,
        businessDetails: businessData,
        // Paid plans are paid by KHQR before this point; free plans start a trial
        pricing: { totalPrice: Number(packageData.price) > 0 ? Number(packageData.price) : 0 },
        limits: packageData.limits,
        name: businessData.name,
        status: DEPLOYMENT.STATUS.CUSTOMIZATION,
      }, { transaction });

      // Persist website content entries for the new website
      if (initialContent && initialContent.length > 0) {
        await WebsiteContent.bulkCreate(
          initialContent.map((item) => ({
            websiteId: website.id,
            category: item.category,
            label: item.label,
            type: item.type,
            value: item.value,
          })),
          { transaction }
        );
      }

      await store.update({ projectionVersion: store.projectionVersion + 1 }, { transaction });
      await storeSyncService.queueStore(store, { websiteId: website.id, transaction });

      const subscription = Number(packageData.price) > 0
        ? await subscriptionService.createPaidSubscriptionForWebsite({
          userId,
          pkg: packageData,
          paymentId,
          websiteId: website.id,
          transaction,
        })
        : await subscriptionService.createTrialSubscription(
          userId,
          packageId,
          website.id,
          transaction
        );
      await website.update({ subscriptionId: subscription.id }, { transaction });

      // Prepare data for external services
      website._ecommerceData = {
        websiteId: website.id,
        storeId: store.id,
        userId,
        domain: website.domain || null,
        niche: businessData?.niche || "ecommerce",
        businessConfig: businessData?.businessConfig || {},
        nicheSettings: businessData?.nicheSettings || {},
        content: initialContent,
        status: DEPLOYMENT.STATUS.CUSTOMIZATION,
        userData: this.serializeUserData(user),
        staffData: staffs,
        websiteTemplateId: template.websiteTemplateId,
        package: this.serializePackageData(subscription)
      };

      // Persist the exact projection in the same transaction. A failed HTTP
      // request can then be retried without recreating the website or trial.
      await WebsiteSyncOutbox.create({
        websiteId: website.id,
        payload: website._ecommerceData,
      }, { transaction });

      await transaction.commit();

      logger.info('Website created successfully', {
        websiteId: website.id,
        userId
      });

      return website;

    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      logger.error('Website creation failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate creation inputs
   */
  async validateCreationInputs({ templateId, packageId, userId }) {
    if (!templateId || !packageId || !userId) {
      throw new Error('Missing required fields: templateId, packageId, userId');
    }

    const [templateExists, packageExists] = await Promise.all([
      WebsiteTemplate.findByPk(templateId),
      Package.findByPk(packageId)
    ]);

    if (!templateExists) throw new Error('Template not found');
    if (!packageExists) throw new Error('Package not found');
  }

  /**
   * Get template with contents
   */
  async getTemplateWithContents(templateId, transaction = null) {
    const template = await WebsiteTemplate.findByPk(templateId, {
      include: ['TemplateContents'],
      transaction
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }

  /**
   * Personalize template content
   */
  personalizeTemplateContent(templateContents, businessData) {
    const items = (templateContents || []).map(item => {
      let value = this.safeParseJSON(item.value);

      // Apply business data personalization
      value = this.applyBusinessPersonalization(item.label, value, businessData);

      return {
        category: item.category,
        label: item.label,
        type: item.type,
        value
      };
    });

    const hasName = items.some(item =>
      ['website name', 'site title', 'store name'].includes(String(item.label || '').toLowerCase())
    );
    if (!hasName && businessData?.name) {
      items.push({
        category: 'Header',
        label: 'Website Name',
        type: 'text',
        value: { text: businessData.name }
      });
    }

    const hasLogo = items.some(item =>
      ['logo', 'store logo'].includes(String(item.label || '').toLowerCase())
    );
    if (!hasLogo && businessData?.logo && typeof businessData.logo === 'string') {
      items.push({
        category: 'Header',
        label: 'Logo',
        type: 'image',
        value: { url: businessData.logo }
      });
    }

    return items;
  }

  /**
   * Safe JSON parse
   */
  safeParseJSON(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Apply business personalization
   */
  applyBusinessPersonalization(label, value, businessData) {
    const name = businessData?.name;
    const logo = businessData?.logo;
    const phone = businessData?.phone || businessData?.contact;
    const location = businessData?.location;

    const wrapText = (newText, originalVal) => {
      if (!newText) return originalVal;
      if (typeof originalVal === 'object' && originalVal !== null && 'text' in originalVal) {
        return { ...originalVal, text: newText };
      }
      return typeof originalVal === 'object' && originalVal !== null ? { ...originalVal, text: newText } : { text: newText };
    };

    const wrapImage = (newUrl, originalVal) => {
      if (!newUrl) return originalVal;
      if (typeof originalVal === 'object' && originalVal !== null && 'url' in originalVal) {
        return { ...originalVal, url: newUrl };
      }
      return { url: newUrl };
    };

    // Brand colours the merchant picked during onboarding (hex values only)
    const HEX = /^#[0-9a-f]{6}$/i;
    const brandPalette = Object.fromEntries(
      Object.entries(businessData?.colorPalette || {}).filter(
        ([key, color]) => ['primary', 'secondary', 'background'].includes(key) && HEX.test(String(color))
      )
    );

    const personalizationMap = {
      'Color Palette': () =>
        Object.keys(brandPalette).length
          ? { ...(typeof value === 'object' && value !== null ? value : {}), ...brandPalette }
          : value,
      'Website Name': () => (name ? wrapText(name, value) : value),
      'Site Title': () => (name ? wrapText(name, value) : value),
      'Store Name': () => (name ? wrapText(name, value) : value),
      'Logo': () => (logo && typeof logo === 'string' ? wrapImage(logo, value) : value),
      'Store Logo': () => (logo && typeof logo === 'string' ? wrapImage(logo, value) : value),
      'Phone Number': () => (phone ? wrapText(phone, value) : value),
      'Phone': () => (phone ? wrapText(phone, value) : value),
      'Locations': () => (location ? wrapText(location, value) : value),
      'Location': () => (location ? wrapText(location, value) : value),
      'Copyright': () => {
        if (!name) return value;
        const year = new Date().getFullYear();
        return wrapText(`© ${year} ${name}. Powered by Rentify.`, value);
      },
      'Social Media': () => ({
        ...(typeof value === 'object' && value !== null ? value : {}),
        facebook: businessData?.socials?.facebook || '',
        instagram: businessData?.socials?.instagram || '',
        twitter: businessData?.socials?.twitter || '',
        linkedin: businessData?.socials?.linkedin || '',
      })
    };

    const personalizer = personalizationMap[label];
    return personalizer ? personalizer() : value;
  }

  /**
   * Get user's website with full details
   */
  async getUserWebsite(userId) {
    const website = await Website.findOne({
      where: { userId },
      include: [
        { 
          model: WebsiteTemplate,
          include: ['TemplateColorPalettes']
        },
        'WebsiteContents'
      ]
    });

    if (!website) return null;

    // Enhance with color palette
    const enhancedWebsite = await this.enhanceWithColorPalette(website);
    return enhancedWebsite;
  }

  /**
   * Enhance website with color palette
   */
  async enhanceWithColorPalette(website) {
    const contents = website.WebsiteContents || [];
    const colorPaletteItem = contents.find(item => 
      item.label === 'Color Palette' && item.type === 'palette'
    );

    let colorPalette = { primary: '#3B82F6', secondary: '#10B981' };

    if (colorPaletteItem && website.WebsiteTemplate) {
      colorPalette = await this.resolveColorPalette(
        colorPaletteItem.value, 
        website.WebsiteTemplate.id
      );
    }

    website.dataValues.colorPalette = colorPalette;
    return website;
  }

  /**
   * Resolve color palette value
   */
  async resolveColorPalette(value, templateId) {
    if (typeof value === 'string') {
      const palettes = await TemplateColorPalette.findAll({ 
        where: { templateId } 
      });
      const palette = palettes.find(p => p.name === value);
      return palette ? JSON.parse(palette.value) : { primary: '#3B82F6', secondary: '#10B981' };
    }
    return value;
  }

  /**
   * Validate website access
   */
  async validateWebsiteAccess(websiteId) {
    const website = await Website.findByPk(websiteId, {
      attributes: ['id', 'status', 'userId']
    });

    if (!website) {
      throw new Error('Website not found');
    }

    return {
      valid: true,
      userId: website.userId,
      status: website.status
    };
  }

  /**
   * Get merchant telegram info
   */
  async getMerchantTelegramInfo(websiteId) {
    const website = await Website.findByPk(websiteId, {
      include: [{
        model: User,
        attributes: ['telegramChatId', 'id']
      }]
    });

    if (!website || !website.User) {
      throw new Error('Merchant not found');
    }

    return {
      telegramChatId: website.User.telegramChatId,
      merchantId: website.User.id
    };
  }

  /**
   * Update color palette
   */
  async updateColorPalette(websiteId, paletteId) {
    const website = await Website.findByPk(websiteId);
    
    if (!website) {
      throw new Error('Website not found');
    }

    await website.update({ colorPaletteId: paletteId });
    return website;
  }

  /**
   * Serialize user data for external services
   */
  serializeUserData(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber
    };
  }

  /**
   * Serialize package data for external services
   */
  serializePackageData(subscription) {
    return {
      id: subscription.Package.id,
      subscriptionId: subscription.id,
      packageEndDate: subscription.endDate,
      features: subscription.Package.features,
      name: subscription.Package.name
    };
  }
}

module.exports = new WebsiteService();
