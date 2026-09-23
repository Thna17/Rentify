import React, { useState } from 'react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { AspectRatio } from '@rentify/shared/ui/aspect-ratio';
import { Heart, Eye, CheckCircle } from 'lucide-react';

export const TemplateCard = ({
  name,
  baseUrl,
  category,
  features,
  isPopular = true,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="h-full flex flex-col rounded-2xl overflow-visible transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-2xl border-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className="relative p-4">
        <Badge 
          className="absolute top-2 left-4 bg-blue-600 text-white font-bold text-xs h-6 px-2 z-10 capitalize"
          variant="default"
        >
          {category}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background hover:bg-muted w-8 h-8"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          {isFavorite ? (
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          ) : (
            <Heart className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Template Preview */}
      <div className="flex-1 rounded-xl px-4">
        <div className="relative overflow-hidden rounded-xl">
          <AspectRatio ratio={4 / 3}>
            <div className="relative w-full h-full overflow-hidden rounded-xl">
              <div className="w-[200%] h-[200%] scale-50 origin-top-left overflow-hidden">
                <iframe
                  src={baseUrl}
                  className="w-full h-full border-none block overflow-hidden"
                  title="Template Preview"
                  scrolling="no"
                />
              </div>
              <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Button
                  className="rounded-full px-6 py-2 font-semibold shadow-lg bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Live Preview
                </Button>
              </div>
            </div>
          </AspectRatio>
        </div>
      </div>

      {/* Card Footer */}
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-base truncate">
            {name}
          </h3>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {isPopular && (
            <Badge
              variant="secondary"
              className="rounded-lg h-6 text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Popular
            </Badge>
          )}
        </div>

        <div className="border-t my-3" />

        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(features).map(
            ([key, value]) =>
              value && (
                <Badge
                  key={key}
                  variant="outline"
                  className="rounded-lg text-xs h-7 bg-muted/50"
                >
                  {key}
                </Badge>
              )
          )}
        </div>
      </CardContent>
    </Card>
  );
};