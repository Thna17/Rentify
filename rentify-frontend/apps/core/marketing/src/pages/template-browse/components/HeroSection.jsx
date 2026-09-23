import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Search } from 'lucide-react';

const categories = [
  { label: 'All', value: 'all' },
  { label: 'E-Commerce', value: 'ecommerce' },
  { label: 'Coffee Shop', value: 'coffee-shop' },
  { label: 'Restaurant', value: 'restaurant' },
];

const HeroSection = ({
  title,
  description,
  onSearch,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/50 to-white min-h-[60vh] flex items-center border-b border-border/50 mt-14">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] -top-20 -left-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-3xl opacity-10 animate-float" />
        <div className="absolute w-[500px] h-[500px] -bottom-30 -right-15 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full blur-3xl opacity-10 animate-float animation-delay-2000" />
      </div>

      <div className="container relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </motion.div>

          {/* Description Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
              {description}
            </p>
          </motion.div>

          {/* Search Input */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-full max-w-2xl"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search templates..."
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 h-14 text-lg bg-background border-blue-300/30 rounded-xl shadow-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all duration-200"
              />
            </div>
          </motion.div>

          {/* Category Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  onClick={() => onCategoryChange(cat.value)}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  className={`px-6 py-2 h-auto rounded-lg font-semibold transition-all duration-300 ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                      : 'bg-blue-100/50 text-slate-600 border-blue-200 hover:bg-blue-200/50 hover:text-slate-700 hover:border-blue-300'
                  } hover:-translate-y-0.5`}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 12s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default HeroSection;