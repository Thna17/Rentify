// Builds a new website's initial content from its template and the business
// details collected during onboarding.

/**
 * Personalize template content
 */
function personalizeTemplateContent(templateContents, businessData) {
  const items = (templateContents || []).map(item => {
    let value = safeParseJSON(item.value);

    // Apply business data personalization
    value = applyBusinessPersonalization(item.label, value, businessData);

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
function safeParseJSON(value) {
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
function applyBusinessPersonalization(label, value, businessData) {
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

module.exports = { personalizeTemplateContent, safeParseJSON, applyBusinessPersonalization };
