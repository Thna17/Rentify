import {
  Check,
} from 'lucide-react';
import { Progress } from '@rentify/shared/ui/Progress';

// Progress Indicator Component
const ProgressIndicator = ({ categoriesCount, hasHeroImage, hasProducts }) => {
  const completion =
    (hasHeroImage ? 25 : 0) +
    (categoriesCount ? 25 : 0) +
    (hasProducts ? 50 : 0);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Store Setup Progress</h3>
        <span className="text-sm font-medium text-primary">{completion}%</span>
      </div>
      <Progress value={completion} className="h-2.5" />
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div
          className={`flex items-center ${
            hasHeroImage ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          {hasHeroImage ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-current mr-2"></span>
          )}
          <span className="text-xs">Hero Image</span>
        </div>
        <div
          className={`flex items-center ${
            categoriesCount ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          {categoriesCount ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-current mr-2"></span>
          )}
          <span className="text-xs">Categories</span>
        </div>
        <div
          className={`flex items-center ${
            hasProducts ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          {hasProducts ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-current mr-2"></span>
          )}
          <span className="text-xs">Products</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator