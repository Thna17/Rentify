import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';

export function SearchBar({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  onBlur,
  className = '',
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex w-full items-center ${className}`}
      role="search"
      aria-label="Site search"
    >
      <div className="relative flex-1">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 transition-colors duration-200 ${
            isFocused ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur && onBlur(e);
          }}
          placeholder="Search products, brands, and categories..."
          className="pl-10 pr-10 h-10 rounded-lg border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200 bg-card"
          aria-label="Search products"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors duration-200"
            aria-label="Clear search"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        className="ml-2 h-10 px-4 rounded-lg hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
        aria-label="Submit search"
      >
        Search
      </Button>
    </form>
  );
}