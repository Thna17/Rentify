import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { RadioGroupItem } from '@rentify/shared/ui/radio-group';
import { Badge } from '@rentify/shared/ui/badge';
import { Label } from '@rentify/shared/ui/label';

export const PaymentMethodCard = ({
  value,
  icon: Icon,
  title,
  subtitle,
  badges = [],
  gradient,
  isSelected,
  onClick,
  isComingSoon = false,
}) => (
  <motion.div
    whileHover={!isComingSoon ? { scale: 1.02, y: -4 } : { y: -2 }}
    whileTap={!isComingSoon ? { scale: 0.98 } : {}}
    className={`cursor-pointer h-full ${isComingSoon ? 'opacity-95' : ''}`}
    onClick={onClick}
  >
    <Card
      className={`
      relative overflow-hidden transition-all duration-300 h-full border-2
      ${
        isSelected
          ? 'ring-4 ring-blue-500/20 shadow-2xl border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50'
          : isComingSoon
          ? 'border-dashed border-amber-300/80 bg-amber-50/20 hover:border-amber-400 shadow-sm'
          : 'hover:shadow-xl shadow-lg border-border/50'
      }
    `}
    >
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <CardContent className="p-6 relative h-full flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div
            className={`
            p-4 rounded-2xl transition-all duration-300 shadow-md
            ${
              isSelected
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25 text-white'
                : isComingSoon
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
            }
          `}
          >
            <Icon className="w-8 h-8" />
          </div>
          {isComingSoon ? (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
              Coming Soon
            </span>
          ) : (
            <RadioGroupItem
              value={value}
              id={value}
              className={`w-6 h-6 ${isSelected ? 'border-blue-500' : ''}`}
            />
          )}
        </div>

        <div className="mb-6 flex-grow">
          <Label htmlFor={value} className="text-xl font-bold text-gray-900 mb-2 block cursor-pointer">
            {title}
          </Label>
          <p className="text-gray-600 text-sm leading-relaxed">{subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={`
                text-xs px-3 py-1 border-0 font-medium
                ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : badge.color || 'bg-gray-100 text-gray-700'
                }
                ${isSelected ? 'shadow-sm' : ''}
              `}
            >
              {badge.icon && (
                <badge.icon className="w-3 h-3 mr-1" />
              )}
              {badge.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
export default PaymentMethodCard;
