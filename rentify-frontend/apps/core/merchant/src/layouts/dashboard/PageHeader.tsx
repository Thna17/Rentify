// components/PageHeader.tsx
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumb
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full border-b border-border/40 bg-gradient-to-r from-white to-gray-50/30 dark:from-card dark:to-card/50 backdrop-blur-sm p-6 md:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          {/* Breadcrumb */}
          {breadcrumb && (
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center">
                  {item.href ? (
                    <a href={item.href} className="hover:text-gray-700 transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-gray-900 font-medium">{item.label}</span>
                  )}
                  {index < breadcrumb.length - 1 && (
                    <span className="mx-2">/</span>
                  )}
                </div>
              ))}
            </nav>
          )}
          
          {/* Title Section */}
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-gray-600 mt-2 max-w-3xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
};