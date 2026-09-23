import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, ShoppingCart, Check, Edit, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// Shadcn Components
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';

export const ProductCard = ({
  product,
  preview,
  owner,
  userId,
  onAddToCart,
  onEdit,
  onDelete,
  viewMode,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const navigate = useNavigate();

  const discount =
    product.originalPrice && product.price < product.originalPrice
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100
        )
      : 0;

  if (viewMode === 'list') {
    return (
      <Card
        onClick={() => navigate(`/product/${product.id}`)}
        className="transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden cursor-pointer"
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            {(preview || owner) && (
              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white shadow-sm z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                 <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-sm text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
              </div>
            )}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {product.images?.[0]?.url ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
              )}

              <div className="absolute top-2 left-2 flex gap-1">
                {product.isNew && (
                  <Badge variant="success" className="text-xs px-2 py-0.5">
                    NEW
                  </Badge>
                )}
                {product.onSale && (
                  <Badge variant="destructive" className="text-xs px-2 py-0.5">
                    SALE
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{product.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {product.description || 'No description available'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[120px]">
              <div className="text-right">
                <p className="font-bold text-lg">${product.price}</p>
                {product.originalPrice && (
                  <p className="text-sm text-gray-500 line-through">
                    ${product.originalPrice}
                  </p>
                )}
              </div>

              <Button
                variant={isAddedToCart ? 'outline' : 'default'}
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                  setIsAddedToCart(true);
                  setTimeout(() => setIsAddedToCart(false), 2000);
                }}
              >
                {isAddedToCart ? (
                  <span className="flex items-center">
                    <Check className="h-4 w-4 mr-1" /> Added
                  </span>
                ) : (
                  'Add to Cart'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={() => navigate(`/product/${product.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="h-full overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer relative"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isHovered ? 'scale-105' : 'scale-100'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-gray-400" />
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          {product.isNew && (
            <Badge variant="success" className="text-xs">
              NEW
            </Badge>
          )}
          {product.onSale && (
            <Badge variant="destructive" className="text-xs">
              SALE
            </Badge>
          )}
          {discount > 0 && (
            <Badge variant="secondary" className="text-xs">
              -{discount}%
            </Badge>
          )}
        </div>

        {(preview || owner) && (
          <div className="absolute top-3 right-3 flex gap-2 z-20">
            <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-sm text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="bg-white/90 rounded-full p-1 flex gap-1 shadow">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorited(!isFavorited);
              }}
            >
              <Heart
                className={`h-5 w-5 ${
                  isFavorited ? 'text-red-500 fill-current' : 'text-gray-700'
                }`}
              />
            </Button>
            <Button variant="ghost" size="icon">
              <Eye className="h-5 w-5 text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
                setIsAddedToCart(true);
                setTimeout(() => setIsAddedToCart(false), 2000);
              }}
            >
              {isAddedToCart ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-gray-700" />
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-medium line-clamp-2 h-12 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {product.description || 'No description available'}
        </p>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-lg">${product.price}</p>
            {product.originalPrice && (
              <p className="text-sm text-gray-500 line-through">
                ${product.originalPrice}
              </p>
            )}
          </div>

          <Button
            variant={isAddedToCart ? 'outline' : 'default'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
              setIsAddedToCart(true);
              setTimeout(() => setIsAddedToCart(false), 2000);
            }}
          >
            {isAddedToCart ? (
              <span className="flex items-center">
                <Check className="h-4 w-4 mr-1" /> Added
              </span>
            ) : (
              'Add to Cart'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
