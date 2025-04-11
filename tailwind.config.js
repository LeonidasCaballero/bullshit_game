module.exports = {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        slideLeft: {
          '0%': { 
            transform: 'translateX(100vw) rotate(5deg)', 
            opacity: 0 
          },
          '100%': { 
            transform: 'translateX(0) rotate(0deg)', 
            opacity: 1 
          }
        },
        slideRight: {
          '0%': { 
            transform: 'translateX(-100vw) rotate(-5deg)', 
            opacity: 0 
          },
          '100%': { 
            transform: 'translateX(0) rotate(0deg)', 
            opacity: 1 
          }
        },
        exitLeft: {
          '0%': { 
            transform: 'translateX(0) rotate(0deg)', 
            opacity: 1 
          },
          '100%': { 
            transform: 'translateX(-100vw) rotate(-5deg)', 
            opacity: 0 
          }
        },
        exitRight: {
          '0%': { 
            transform: 'translateX(0) rotate(0deg)', 
            opacity: 1 
          },
          '100%': { 
            transform: 'translateX(100vw) rotate(5deg)', 
            opacity: 0 
          }
        },
        flicker: {
          '0%, 18%, 22%, 25%, 53%, 57%, 100%': { opacity: '1' },
          '20%, 24%, 55%': { opacity: '0.5' },
        },
        fireBorder: {
          '0%, 100%': { 
            boxShadow: '0 0 8px 2px rgba(255,87,0,0.7), 0 0 0 0 rgba(255,87,0,0.4)' 
          },
          '50%': { 
            boxShadow: '0 0 16px 4px rgba(255,87,0,0.7), 0 0 0 8px rgba(255,87,0,0)' 
          }
        },
<<<<<<< HEAD
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
=======
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, 10px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        fadeOutDown: {
          '0%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, 10px)' },
>>>>>>> fix/question-data-issue
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        slideLeft: 'slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        slideRight: 'slideRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        exitLeft: 'exitLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        exitRight: 'exitRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'flicker': 'flicker 2s ease-in-out infinite alternate',
        'fire-border': 'fireBorder 2s ease-in-out infinite',
<<<<<<< HEAD
        'fade-in': 'fadeIn 0.5s ease-out',
=======
        'fadeInUp': 'fadeInUp 0.3s ease-out',
        'fadeOutDown': 'fadeOutDown 0.3s ease-out',
>>>>>>> fix/question-data-issue
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
  darkMode: ["class"],
};
