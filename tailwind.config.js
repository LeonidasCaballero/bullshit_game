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
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        slideLeft: 'slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        slideRight: 'slideRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        exitLeft: 'exitLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        exitRight: 'exitRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
  darkMode: ["class"],
};
