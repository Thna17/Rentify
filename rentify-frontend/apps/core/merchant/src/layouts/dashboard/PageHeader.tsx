import React from 'react';
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
      className="w-full border-b border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-6 md:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Breadcrumb - hidden on phones */}
          {breadcrumb && (
            <nav className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground mb-3" aria-label="Breadcrumb">
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center">
                  {item.href ? (
                    <a href={item.href} className="hover:text-foreground transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-foreground font-medium">{item.label}</span>
                  )}
                  {index < breadcrumb.length - 1 && (
                    <span className="mx-2 text-muted-foreground/60">/</span>
                  )}
                </div>
              ))}
            </nav>
          )}
          
          {/* Title Section */}
          <div className="flex items-center gap-4">
            {Icon && (
              <div className="hidden sm:flex p-3 bg-primary/10 text-primary rounded-xl shadow-xs shrink-0">
                <Icon className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                {title}
              </h1>
              {description && (
                <p className="hidden sm:block text-muted-foreground mt-1.5 max-w-3xl leading-relaxed text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
};
