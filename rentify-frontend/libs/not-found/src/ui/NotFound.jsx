import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { ArrowLeft, Sparkles, RefreshCw, ShoppingBag, Package, HomeIcon } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Log the 404 error
    console.error('404 Error: Page not found -', window.location.pathname);
  }, []);

  const suggestions = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Product', path: '/products', icon: Package },
    { name: 'Cart', path: '/cart', icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Animated 404 */}
        <div className={`mb-8 transition-all duration-1000 ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
          <div className="relative inline-block">
            {/* Large 404 Text */}
            <h1 className="text-8xl md:text-9xl font-black bg-gradient-primary bg-clip-text relative">
              404
            </h1>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4">
              <Sparkles className="w-8 h-8 text-primary animate-float" />
            </div>
            <div className="absolute -bottom-2 -left-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 animate-pulse" />
            </div>
            
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl animate-pulse-glow" />
          </div>
        </div>

        {/* Error message */}
        <div className={`mb-8 transition-all duration-1000 delay-300 ${mounted ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            The page you're looking for seems to have vanished into the digital void. 
            Don't worry, even the best explorers sometimes take a wrong turn.
          </p>
        </div>

        {/* Action buttons */}
        <div className={`mb-12 transition-all duration-1000 delay-500 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
              className="group hover:shadow-card transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
              Go Back
            </Button>
            
            <Button
              asChild
              size="lg"
              className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 hover:scale-105"
            >
              <Link to="/">
                <HomeIcon className="w-5 h-5 mr-2 " />
                Home
              </Link>
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="lg"
              className="group hover:bg-muted transition-all duration-300"
            >
              <RefreshCw className="w-5 h-5 mr-2 transition-transform duration-200 group-hover:rotate-180" />
              Retry
            </Button>
          </div>
        </div>

        {/* Quick suggestions */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'animate-slide-up' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-glass backdrop-blur-glass rounded-2xl p-6 shadow-glass border border-glass-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Popular Destinations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {suggestions.map((suggestion, index) => (
                <Link
                  key={suggestion.name}
                  to={suggestion.path}
                  className={`group flex items-center space-x-3 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 transition-all duration-300 hover:shadow-card hover:scale-105 ${
                    mounted ? 'animate-scale-in' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${800 + index * 100}ms` }}
                >
                  <suggestion.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-foreground font-medium">{suggestion.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-glow/5 rounded-full blur-3xl animate-float [animation-delay:1s]" />
        </div>
      </div>
    </div>
  );
};


export default NotFound;
