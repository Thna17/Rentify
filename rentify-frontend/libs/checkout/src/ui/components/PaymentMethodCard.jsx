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
  badges,
  gradient,
  isSelected,
  onClick,
}) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="cursor-pointer h-full"
    onClick={onClick}
  >
    <Card
      className={`
      relative overflow-hidden transition-all duration-500 h-full border-2
      ${
        isSelected
          ? 'ring-4 ring-blue-500/20 shadow-2xl border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50'
          : 'hover:shadow-xl  shadow-lg border-border/50'
      }
    `}
    >
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <CardContent className="p-6 relative h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div
            className={`
            p-4 rounded-2xl transition-all duration-300 shadow-lg
            ${
              isSelected
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25'
                : 'bg-gradient-to-br from-gray-100 to-gray-200'
            }
          `}
          >
            <Icon
              className={`w-8 h-8 ${
                isSelected ? 'text-white' : 'text-gray-600'
              }`}
            />
          </div>
          <RadioGroupItem
            value={value}
            id={value}
            className={`w-6 h-6 ${isSelected ? 'border-blue-500' : ''}`}
          />
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
