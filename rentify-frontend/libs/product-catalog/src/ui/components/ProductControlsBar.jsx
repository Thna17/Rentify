import { useTranslation } from '@rentify/utils';
import { Button } from "@rentify/shared/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@rentify/shared/ui/Toggle-group";
import { Grid, List, Plus } from 'lucide-react';

export const ProductControlsBar = ({
  data,
  owner,
  preview,
  viewMode,
  setViewMode,
  sortOption,
  handleSortChange,
  handleCreateProduct,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <p className="text-sm text-muted-foreground">
        {t('products.showing', {
          count: data?.products.length || 0,
          total: data?.totalItems || 0,
        })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {(owner || preview) && (
          <Button onClick={handleCreateProduct} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            {t('header.add_product')}
          </Button>
        )}

        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => setViewMode(value === viewMode ? null : value)}
          size="sm"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup 
          type="single" 
          value={sortOption} 
          onValueChange={handleSortChange}
          size="sm"
        >
          <ToggleGroupItem value="price_asc">{t('products.sort_price_asc')}</ToggleGroupItem>
          <ToggleGroupItem value="price_desc">{t('products.sort_price_desc')}</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};