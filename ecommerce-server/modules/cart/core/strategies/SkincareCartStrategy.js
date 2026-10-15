// strategies/SkincareCartStrategy.js
const CartStrategy = require('./CartStrategy');

class SkincareCartStrategy extends CartStrategy {
  constructor() {
    super('skincare');
    this.config = {
      maxQuantity: 5,
      allowCustomizations: true,
      taxRate: 0.08,
      validCustomizations: [
        'giftMessage', 'giftWrapping', 'sampleRequest', 
        'skinTypeRecommendation', 'allergyInfo'
      ],
      requiresAgeVerification: false
    };
  }

  validateProductSpecific(product, variant, customizations) {
    // Validate skin type compatibility if specified
    if (customizations.skinTypeRecommendation) {
      const validSkinTypes = ['dry', 'oily', 'combination', 'sensitive', 'normal'];
      if (!validSkinTypes.includes(customizations.skinTypeRecommendation)) {
        throw new Error('Invalid skin type specified');
      }
    }

    // Check for potential allergic reactions
    if (customizations.allergyInfo && product.nicheAttributes?.ingredients) {
      const allergens = customizations.allergyInfo.split(',').map(a => a.trim().toLowerCase());
      const ingredients = product.nicheAttributes.ingredients.map(i => i.toLowerCase());
      
      const potentialAllergens = allergens.filter(allergen => 
        ingredients.some(ingredient => ingredient.includes(allergen))
      );
      
      if (potentialAllergens.length > 0) {
        throw new Error(`Product contains potential allergens: ${potentialAllergens.join(', ')}`);
      }
    }

    // Validate product combinations (e.g., don't mix certain ingredients)
    this.validateProductCompatibility(product, customizations);
  }

  validateProductCompatibility(product, customizations) {
    const incompatibleWith = product.nicheAttributes?.incompatibleWith || [];
    
    if (customizations.otherProducts && customizations.otherProducts.length > 0) {
      const conflicts = customizations.otherProducts.filter(otherProduct =>
        incompatibleWith.includes(otherProduct)
      );
      
      if (conflicts.length > 0) {
        throw new Error(`This product is incompatible with: ${conflicts.join(', ')}`);
      }
    }
  }

  applyCustomizationPricing(basePrice, customizations) {
    let finalPrice = basePrice;
    
    if (customizations.giftWrapping) {
      finalPrice += customizations.giftWrapping === 'luxury' ? 6.99 : 3.99;
    }
    
    if (customizations.personalizedAdvice) {
      finalPrice += 15.00; // Consultation fee
    }

    return finalPrice;
  }

  calculateShipping(cartItems) {
    let shipping = 0;
    let totalWeight = 0;

    cartItems.forEach(item => {
      const weight = item.Product.nicheAttributes?.weight || 0.5; // default 0.5kg
      totalWeight += weight * item.quantity;
      
      // Fragile items require special handling
      if (item.Product.nicheAttributes?.fragile) {
        shipping += 2.00;
      }
    });

    // Base shipping + weight-based
    // shipping += 4.99 + (totalWeight * 0.5);
    shipping += 0 + (totalWeight * 0.5);  // Remove the 4.99


    // Free shipping over $75
    if (this.getSubtotal(cartItems) > 75) {
      shipping = 0;
    }

    return shipping;
  }

  getCartMetadata() {
    return {
      type: 'skincare',
      requiresSkinTypeInfo: true,
      allergyWarnings: true,
      productCompatibilityCheck: true,
      personalizedAdviceAvailable: true,
      sampleRequests: true,
      ingredientTransparency: true
    };
  }
}

module.exports = SkincareCartStrategy;