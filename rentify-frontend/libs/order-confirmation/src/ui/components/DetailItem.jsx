import { Button } from '@rentify/shared/ui/button';
import { 
  Copy,
} from 'lucide-react';

export const DetailItem = ({ icon, label, value, copyable = false }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex gap-3 items-start py-3">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-600 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{value}</p>
          {copyable && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopy} 
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};