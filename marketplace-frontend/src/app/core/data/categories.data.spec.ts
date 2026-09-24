import { classifyCategory, findCategory, subcategorySlug, CATEGORIES } from './categories.data';

describe('categories.data', () => {
  it('should find existing category by slug', () => {
    expect(findCategory('fashion')?.name).toBe('Fashion & Accessories');
    expect(findCategory('beauty-wellness')?.name).toBe('Beauty & Wellness');
    expect(findCategory('electronics')?.name).toBe('Electronics');
    expect(findCategory('non-existent')).toBeUndefined();
  });

  it('should convert strings to URL-friendly slugs', () => {
    expect(subcategorySlug("Women's Clothing")).toBe('womens-clothing');
    expect(subcategorySlug('Electronics Accessories')).toBe('electronics-accessories');
    expect(subcategorySlug('Phones & Devices')).toBe('phones-devices');
  });

  describe('classifyCategory', () => {
    it('should classify top-level departments directly', () => {
      const fashion = classifyCategory('Fashion & Accessories');
      expect(fashion.categorySlug).toBe('fashion');
      expect(fashion.categoryName).toBe('Fashion & Accessories');
      expect(fashion.subcategory).toBeNull();

      const beauty = classifyCategory('Beauty');
      expect(beauty.categorySlug).toBe('beauty-wellness');
      expect(beauty.categoryName).toBe('Beauty & Wellness');
    });

    it('should classify subcategories to their parent department', () => {
      const skincare = classifyCategory('Skincare');
      expect(skincare.categorySlug).toBe('beauty-wellness');
      expect(skincare.categoryName).toBe('Beauty & Wellness');
      expect(skincare.subcategory).toBe('Skincare');
      expect(skincare.subcategorySlug).toBe('skincare');
    });

    it('should classify Commerce API canonical categories', () => {
      const phones = classifyCategory('Phones & Devices');
      expect(phones.categorySlug).toBe('electronics');
      expect(phones.categoryName).toBe('Electronics');
      expect(phones.subcategory).toBe('Phones & Tablets');
      expect(phones.subcategorySlug).toBe('phones-tablets');

      const accessories = classifyCategory('Electronics Accessories');
      expect(accessories.categorySlug).toBe('electronics');
      expect(accessories.categoryName).toBe('Electronics');
      expect(accessories.subcategory).toBe('Electronic Accessories');
      expect(accessories.subcategorySlug).toBe('electronic-accessories');

      const clothing = classifyCategory('Clothing');
      expect(clothing.categorySlug).toBe('fashion');
      expect(clothing.subcategory).toBe("Women's Clothing");
    });

    it('should classify store primary categories', () => {
      const beautyStore = classifyCategory('Beauty & Skincare');
      expect(beautyStore.categorySlug).toBe('beauty-wellness');
      expect(beautyStore.categoryName).toBe('Beauty & Wellness');

      const electronicsStore = classifyCategory('Electronics');
      expect(electronicsStore.categorySlug).toBe('electronics');
      expect(electronicsStore.categoryName).toBe('Electronics');
    });

    it('should classify legacy categories', () => {
      const pottery = classifyCategory('pottery');
      expect(pottery.categorySlug).toBe('home-living');
      expect(pottery.subcategory).toBe('Pottery & Ceramics');
    });

    it('should fallback gracefully for unknown or general categories', () => {
      const general = classifyCategory('General');
      expect(general.categorySlug).toBe('general');
      expect(general.categoryName).toBe('General');

      const custom = classifyCategory('Unknown Custom Shelf');
      expect(custom.categorySlug).toBe('unknown-custom-shelf');
      expect(custom.categoryName).toBe('Unknown Custom Shelf');
    });
  });
});
