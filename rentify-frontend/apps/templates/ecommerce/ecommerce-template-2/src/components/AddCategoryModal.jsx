import { useState } from 'react';
import { Plus, X, Tag, Sparkles, Check, Lightbulb } from 'lucide-react';
import { useTranslation } from '@rentify/storefront';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@rentify/shared/ui/dialog';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';

export default function AddCategoryModal({ open, onClose, onAdd }) {
  const [category, setCategory] = useState({ name: '' });
  const [errors, setErrors] = useState({});
  const { t } = useTranslation();

  const suggestedCategories = [
    'Clothing',
    'Electronics',
    'Home & Garden',
    'Beauty',
    'Books',
    'Toys',
    'Sports',
    'Food',
    'Jewelry',
    'Footwear',
    'Furniture',
    'Kitchen',
    'Health',
    'Baby',
    'Pet Supplies',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategory((prev) => ({ ...prev, [name]: value }));

    if (name === 'name') {
      setErrors((prev) => ({
        ...prev,
        name:
          value.length < 3 ? 'Category name must be at least 3 characters' : '',
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (category.name.length < 3) {
      setErrors({ name: 'Category name must be at least 3 characters' });
      return;
    }

    onAdd(category);
    setCategory({ name: '' });
    setErrors({});
    onClose();
  };

  const handleSuggestionClick = (cat) => {
    setCategory((prev) => ({ ...prev, name: cat }));
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0  overflow-hidden border-0 shadow-xl">
        <div className=" pt-6 px-6 text-black">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-black text-xl">
                <Tag className="h-5 w-5" />
                {t('header.new_category')}
              </DialogTitle>
            </div>
            <DialogDescription className=" text-black">
              Create a new category to organize your products
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium">
              {t('header.category_name')} *
            </Label>
            <Input
              id="name"
              name="name"
              value={category.name}
              onChange={handleChange}
              className={`h-11 ${
                errors.name
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              placeholder="e.g., Electronics, Clothing, Home Decor"
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-destructive text-sm flex items-center gap-1">
                <X className="h-3 w-3" />
                {errors.name}
              </p>
            )}
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              {t('header.min_chars')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">
                {t('header.suggested_categories')}
              </Label>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto py-1">
              {suggestedCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant={category.name === cat ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1.5 rounded-full transition-all ${
                    category.name === cat
                      ? 'gradient-hero text-white'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => handleSuggestionClick(cat)}
                >
                  {category.name === cat && <Check className="h-3 w-3 mr-1" />}
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-10 px-4"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!category.name || category.name.length < 3}
              className="rounded-lg h-10 px-4 gradient-hero"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('header.add_category')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
