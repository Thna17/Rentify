const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    join(
      __dirname,
      '{src,pages/*,pages/home/components/*,components/*,app}/**/*!(*.stories|*.spec).{ts,tsx,html,jsx}'
    ),
    join(__dirname, '../../../libs/shared/src/ui/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    screens: {
      xs: '0px',   
      sm: '600px',  
      md: '900px', 
      lg: '1280px', 
      xl: '1920px',
    },
    	container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
  	extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(220, 90%, 56%)',
					foreground: 'hsl(0, 0%, 100%)',
					50: 'hsl(220, 100%, 97%)',
					100: 'hsl(220, 95%, 92%)',
					200: 'hsl(220, 90%, 84%)',
					300: 'hsl(220, 85%, 74%)',
					400: 'hsl(220, 80%, 64%)',
					500: 'hsl(220, 90%, 56%)',
					600: 'hsl(220, 85%, 48%)',
					700: 'hsl(220, 80%, 40%)',
					800: 'hsl(220, 75%, 32%)',
					900: 'hsl(220, 70%, 24%)'
				},
				secondary: {
					DEFAULT: 'hsl(158, 64%, 52%)',
					foreground: 'hsl(0, 0%, 100%)',
					50: 'hsl(158, 70%, 95%)',
					100: 'hsl(158, 65%, 88%)',
					200: 'hsl(158, 60%, 76%)',
					300: 'hsl(158, 64%, 64%)',
					400: 'hsl(158, 64%, 52%)',
					500: 'hsl(158, 60%, 44%)',
					600: 'hsl(158, 56%, 36%)',
					700: 'hsl(158, 52%, 28%)',
					800: 'hsl(158, 48%, 20%)',
					900: 'hsl(158, 44%, 12%)'
				},
				destructive: {
					DEFAULT: 'hsl(0, 84.2%, 60.2%)',
					foreground: 'hsl(210, 40%, 98%)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				khmer: ['Kantumruy Pro', 'Noto Sans Khmer', 'system-ui', 'sans-serif']
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
				'float': 'float 3s ease-in-out infinite',
				'gradient-shift': 'gradient-shift 4s ease-in-out infinite',
				'pulse-slow': 'pulse 3s ease-in-out infinite',
				'shake': 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
			},
			keyframes: {
				'shake': {
					'0%, 100%': { transform: 'translateX(0)' },
					'20%, 60%': { transform: 'translateX(-6px)' },
					'40%, 80%': { transform: 'translateX(6px)' },
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(50px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'gradient-shift': {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' }
				}
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'hero-gradient': 'linear-gradient(135deg, hsl(220, 90%, 56%) 0%, hsl(158, 64%, 52%) 100%)'
			}
		}
  },
  plugins: [require("tailwindcss-animate")],
}
