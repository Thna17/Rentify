// components/CollectionsSection.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Plus, Folder, MoreVertical, Trash2 } from 'lucide-react';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from '@rentify/apis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';

interface CollectionsSectionProps {
  storeData: any;
  t: (key: string) => string;
  className?: string;
}

// Collections are the merchant's own storefront groupings (shop categories). The shared
// marketplace taxonomy is separate and is chosen per product.
export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  storeData,
  t,
  className,
}) => {
  const websiteId = storeData?.websiteId;
  const { data: collections = [] } = useGetCategoriesQuery(websiteId, { skip: !websiteId });
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  // editing: null = closed, {} = new collection, {id, name} = rename
  const [editing, setEditing] = useState<{ id?: string; name?: string } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const openDialog = (collection?: { id: string; name: string }) => {
    setEditing(collection ? { id: collection.id, name: collection.name } : {});
    setName(collection?.name || '');
    setError('');
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a collection name');
      return;
    }
    try {
      if (editing?.id) await updateCategory({ id: editing.id, name: trimmed }).unwrap();
      else await createCategory({ websiteId, name: trimmed }).unwrap();
      setEditing(null);
    } catch (e: any) {
      setError(e?.data?.error || 'Could not save the collection');
    }
  };

  const handleDelete = async (collection: { id: string; name: string }) => {
    if (!window.confirm(`Delete "${collection.name}"? Products stay, only the collection is removed.`)) return;
    try {
      await deleteCategory(collection.id).unwrap();
    } catch (e: any) {
      window.alert(e?.data?.error || 'Could not delete the collection');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="rounded-2xl border border-border shadow-[var(--shadow-soft)]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-base font-semibold">{t('header.add_category')}</CardTitle>
              <CardDescription>
                {t('dashboard.store_management.collections_description')}
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()} disabled={!websiteId} className="min-h-[44px] rounded-xl">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('header.add_category')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {collections.length > 0 ? (
            <div className="space-y-3">
              {collections.map((collection: any) => (
                <div
                  key={collection.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <h4 className="flex-1 min-w-0 font-medium truncate">{collection.name}</h4>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" aria-label={collection.name}>
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(collection)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(collection)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t('dashboard.store_management.no_collections')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('dashboard.store_management.no_collections_description')}
              </p>
              <Button onClick={() => openDialog()} disabled={!websiteId}>
                <Plus className="h-4 w-4 mr-2" />
                {t('header.add_category')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Rename collection' : 'New collection'}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            placeholder="e.g. New arrivals"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={creating || updating}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
