import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { useGetCategoriesQuery, useCreateCategoryMutation } from '@rentify/storefront/api';
import { trackStorefrontEvent, useStorefrontWebsite as useWebsiteData, useAuth, useTranslation } from '@rentify/storefront';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Button } from '@rentify/shared/ui/button';
import HeroSection from '../../components/HeroSection';
import CategoryProductSection from '../../components/CategoryProductSection';
import AddCategoryModal from '../../components/AddCategoryModal';
import ProgressIndicator from '../../components/ProgressIndicator';

export default function HomePage() {
  const { getFilteredContent, websiteId } = useWebsiteData();
  const { isOwner } = useAuth();
  const { t } = useTranslation();

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [hasProducts, setHasProducts] = useState(false);

  const { data: categories = [], isLoading } = useGetCategoriesQuery(websiteId, {
    skip: !websiteId,
  });

  const [createCategory] = useCreateCategoryMutation();

  const homepageContent = getFilteredContent('homepage');
  const heroImageItem = homepageContent?.find((item) => item.label === 'Hero Image');
  const hasHeroImage = Array.isArray(heroImageItem?.value) && heroImageItem.value.length > 0;
  const hasCategories = categories.length > 0;

  const completion =
    (hasHeroImage ? 25 : 0) + (hasCategories ? 25 : 0) + (hasProducts ? 50 : 0);

  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);

  const handleAddCategory = async (categoryData) => {
    try {
      await createCategory({ websiteId, ...categoryData }).unwrap();
      setAddCategoryOpen(false);
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Store Setup Progress indicator for Store Owner */}
        {isOwner && completion < 100 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <ProgressIndicator
              categoriesCount={hasCategories}
              hasHeroImage={hasHeroImage}
              hasProducts={hasProducts}
            />
          </motion.div>
        )}

        {/* Hero Section with Owner editing controls */}
        <HeroSection content={homepageContent} isOwner={isOwner} />

        {/* Empty categories state */}
        {categories.length === 0 ? (
          isOwner ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-muted/20 p-12 text-center"
            >
              <div className="mb-4 rounded-full bg-primary/10 p-5 text-primary">
                <Sparkles className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Create your first category</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Organize your catalog by creating product categories (e.g. Audio, Wearables, Computing).
              </p>
              <Button onClick={() => setAddCategoryOpen(true)} className="mt-6 gap-2">
                <Plus className="h-4 w-4" /> Add Category
              </Button>
            </motion.div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">Products will be available soon.</p>
          )
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <CategoryProductSection
                key={category.id}
                category={category}
                websiteId={websiteId}
                isOwner={isOwner}
                onProductsFound={() => setHasProducts(true)}
              />
            ))}
          </div>
        )}

        {/* Owner Floating Action Button to add categories anytime */}
        {isOwner && (
          <Button
            onClick={() => setAddCategoryOpen(true)}
            className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-2xl p-0"
            title="Add Category"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Add Category Modal */}
        <AddCategoryModal
          open={addCategoryOpen}
          onClose={() => setAddCategoryOpen(false)}
          onAdd={handleAddCategory}
        />
      </div>
    </motion.main>
  );
}
