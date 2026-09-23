// data/fonts.ts
export interface FontCategory {
  id: string;
  label: string;
  fonts: Font[];
}

export interface Font {
  id: string;
  label: string;
  value: string;
  category: 'khmer' | 'english' | 'system' | 'custom';
  preview?: string;
}

export const fontCategories: FontCategory[] = [
  {
    id: 'khmer',
    label: 'Khmer Fonts',
    fonts: [
      {
        id: 'koulen',
        label: 'Koulen',
        value: 'Koulen, cursive',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'battambang',
        label: 'Battambang',
        value: 'Battambang, cursive',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'bayon',
        label: 'Bayon',
        value: 'Bayon, sans-serif',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'kantumruy',
        label: 'Kantumruy',
        value: 'Kantumruy, sans-serif',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'moul',
        label: 'Moul',
        value: 'Moul, cursive',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'suwannaphum',
        label: 'Suwannaphum',
        value: 'Suwannaphum, serif',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'angkor',
        label: 'Angkor',
        value: 'Angkor, cursive',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'preahvihear',
        label: 'Preah Vihear',
        value: 'Preah Vihear, sans-serif',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'siemreap',
        label: 'Siemreap',
        value: 'Siemreap, sans-serif',
        category: 'khmer',
        preview: 'កខគឃង'
      },
      {
        id: 'freehand',
        label: 'Freehand Khmer',
        value: 'Freehand Khmer, cursive',
        category: 'khmer',
        preview: 'កខគឃង'
      }
    ]
  },
  {
    id: 'english-serif',
    label: 'English Serif',
    fonts: [
      {
        id: 'playfair',
        label: 'Playfair Display',
        value: 'Playfair Display, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'merriweather',
        label: 'Merriweather',
        value: 'Merriweather, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'lora',
        label: 'Lora',
        value: 'Lora, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'pt-serif',
        label: 'PT Serif',
        value: 'PT Serif, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'crimson-text',
        label: 'Crimson Text',
        value: 'Crimson Text, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'source-serif',
        label: 'Source Serif Pro',
        value: 'Source Serif Pro, serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      }
    ]
  },
  {
    id: 'english-sans',
    label: 'English Sans Serif',
    fonts: [
      {
        id: 'inter',
        label: 'Inter',
        value: 'Inter, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'montserrat',
        label: 'Montserrat',
        value: 'Montserrat, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'roboto',
        label: 'Roboto',
        value: 'Roboto, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'poppins',
        label: 'Poppins',
        value: 'Poppins, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'opensans',
        label: 'Open Sans',
        value: 'Open Sans, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'lato',
        label: 'Lato',
        value: 'Lato, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'nunito',
        label: 'Nunito',
        value: 'Nunito, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'urbanist',
        label: 'Urbanist',
        value: 'Urbanist, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'manrope',
        label: 'Manrope',
        value: 'Manrope, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      }
    ]
  },
  {
    id: 'english-display',
    label: 'English Display',
    fonts: [
      {
        id: 'clash-display',
        label: 'Clash Display',
        value: 'Clash Display, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'satoshi',
        label: 'Satoshi',
        value: 'Satoshi, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'gilroy',
        label: 'Gilroy',
        value: 'Gilroy, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'cabinet-grotesk',
        label: 'Cabinet Grotesk',
        value: 'Cabinet Grotesk, sans-serif',
        category: 'english',
        preview: 'Aa Bb Cc'
      }
    ]
  },
  {
    id: 'system',
    label: 'System Fonts',
    fonts: [
      {
        id: 'system-sans',
        label: 'System Sans',
        value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        category: 'system',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'system-serif',
        label: 'System Serif',
        value: 'Georgia, "Times New Roman", Times, serif',
        category: 'system',
        preview: 'Aa Bb Cc'
      },
      {
        id: 'system-mono',
        label: 'System Mono',
        value: 'Monaco, "Courier New", monospace',
        category: 'system',
        preview: 'Aa Bb Cc'
      }
    ]
  },
  {
    id: 'custom',
    label: 'Custom Font',
    fonts: [
      {
        id: 'custom-font',
        label: 'Custom Font',
        value: 'custom',
        category: 'custom',
        preview: 'Enter custom font'
      }
    ]
  }
];

// Get all fonts flattened
export const allFonts = fontCategories.flatMap(category => category.fonts);

// Find font by value
export const findFontByValue = (value: string): Font | undefined => {
  return allFonts.find(font => font.value === value);
};

// Check if font is custom
export const isCustomFont = (value: string): boolean => {
  const font = findFontByValue(value);
  return !font || font.id === 'custom-font';
};