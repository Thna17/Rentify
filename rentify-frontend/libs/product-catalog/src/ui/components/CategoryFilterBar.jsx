import { useTranslation } from '@rentify/utils';
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { X } from 'lucide-react';

export const CategoryFilterBar = ({
  categories,
  selectedCategories,
  handleCategoryToggle,
  setSelectedCategories,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 py-2 overflow-x-auto">
      <h3 className="text-sm font-semibold whitespace-nowrap">
        {t('header.category_name')}
      </h3>
      
      <div className="flex gap-2">
        {categories?.map((cat) => (
          <Badge
            key={cat.id}
            variant={selectedCategories.includes(cat.name) ? "default" : "outline"}
            className="cursor-pointer px-3 py-1"
            onClick={() => handleCategoryToggle(cat.name)}
          >
            {cat.name}
          </Badge>
        ))}
      </div>
      
      {selectedCategories.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCategories([])}
          className="ml-auto text-muted-foreground"
        >
          {t('header.clear')}
          <X className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
