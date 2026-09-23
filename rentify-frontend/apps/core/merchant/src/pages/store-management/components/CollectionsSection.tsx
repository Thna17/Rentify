// components/CollectionsSection.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Edit2, Plus, Folder, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
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

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({ 
  storeData, 
  t,
  className 
}) => {
  const handleEditCollection = (collectionId: string) => {
    // Implement edit collection logic
    console.log('Edit collection:', collectionId);
  };

  const handleDeleteCollection = (collectionId: string) => {
    // Implement delete collection logic
    console.log('Delete collection:', collectionId);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-muted-foreground" />
                {t('header.add_category')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.store_management.collections_description')}
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('header.add_category')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Array.isArray(storeData?.collections) && storeData.collections.length > 0 ? (
            <div className="space-y-3">
              {storeData.collections.map((collection: any) => (
                <motion.div
                  key={collection.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors group">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Folder className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">
                          {collection.title || collection.name}
                        </h4>
                        {collection.productCount && (
                          <Badge variant="secondary" className="text-xs">
                            {collection.productCount} {t('dashboard.store_management.products')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {collection.description || t('dashboard.store_management.no_description')}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCollection(collection.id)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCollection(collection.id)}
                          className="text-destructive"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('header.add_category')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};