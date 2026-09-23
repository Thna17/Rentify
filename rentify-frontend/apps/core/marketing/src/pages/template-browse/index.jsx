import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import HeroSection from './components/HeroSection';
import CTASection from './components/CTASection';
import { TemplateCard } from '../../components/common/TemplateCard';
import { useGetTemplatesQuery } from '@rentify/apis';
import Navigation from '../../components/common/Navigation';
import Footer from '../../components/common/Footer';

const BrowseTemplates = () => {
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const { data: templatesData = [], isLoading: templatesLoading } =
    useGetTemplatesQuery();

  useEffect(() => {
    filterTemplates();
  }, [templatesData, category, searchQuery]);

  const handleCategoryChange = (newValue) => {
    setCategory(newValue);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const filterTemplates = () => {
    let filtered = templatesData || [];

    if (category !== 'all') {
      filtered = filtered.filter((template) => template.category === category);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleCategorySelect = (newValue) => {
    setCategory(newValue);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection
        variant="browse"
        title="Find Your Perfect Template"
        description="Explore our collection of professional templates tailored for every need"
        onSearch={handleSearch}
        selectedCategory={category}
        onCategoryChange={handleCategorySelect}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          {templatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8)
                .fill()
                .map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-0">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <Link
                    to={`/templates/${template.id}`}
                    key={template.id}
                    className="block transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <TemplateCard
                      name={template.name}
                      baseUrl={template.baseUrl}
                      colorPalettes={template.colorPalettes}
                      price={template.price}
                      discount={'Free'}
                      rating={template.rating}
                      description={template.description}
                      category={template.category}
                      usersCount={template.usersCount}
                      pages={template.pages}
                      features={template.features}
                    />
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <div className="text-lg font-medium">No templates found</div>
                  <p className="mt-2 text-sm">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CTASection />
      <Footer />
    </div>
  );
};

export default BrowseTemplates;