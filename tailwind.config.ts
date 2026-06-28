import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── Color tokens ───────────────────────────────────────────────────────
      colors: {
        // Brand — teal/mint from screenshot headers
        brand: {
          50:  '#e8faf9',
          100: '#c5f2ef',
          200: '#8fe6e1',
          300: '#52d4cd',
          400: '#2abfb8',
          500: '#1aa8a1', // primary brand
          600: '#138f89',
          700: '#0e726d',
          800: '#0b5a56',
          900: '#083d3a',
        },

        // Accent — periwinkle/blue-purple for active states (from screenshots)
        accent: {
          50:  '#eef0f9',
          100: '#d5d9f2',
          200: '#acb3e5',
          300: '#8a93da',
          400: '#7b8ec8', // primary accent (active state in screenshots)
          500: '#6677b8',
          600: '#5260a0',
          700: '#3f4b82',
          800: '#2e3764',
          900: '#1e2444',
        },

        // Surface — card and page backgrounds
        surface: {
          page:   '#F5F5F7', // app background (light gray)
          card:   '#FFFFFF', // card background
          input:  '#F0F0F5', // input field fill
          active: '#EEF0F9', // tinted surface for selected state
        },

        // Text
        text: {
          primary:   '#1A1A2E', // near-black navy (headings, primary)
          secondary: '#6B6B80', // muted (captions, labels)
          disabled:  '#ABABBA', // disabled state
          inverse:   '#FFFFFF', // on dark backgrounds
          brand:     '#1aa8a1', // brand-colored text
          accent:    '#7b8ec8', // accent-colored text
        },

        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        error:   '#EF4444',
        info:    '#3B82F6',

        // Macro ring colors
        macro: {
          protein: '#7b8ec8', // accent/periwinkle
          carbs:   '#F59E0B', // amber
          fat:     '#1aa8a1', // brand teal
        },

        // CTA button — dark navy from screenshots
        cta: {
          DEFAULT: '#1A1A2E',
          hover:   '#2D2D4A',
        },
      },

      // ─── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Display (large numbers — calories etc.)
        '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        // Headings
        '2xl': ['1.5rem',  { lineHeight: '2rem',    fontWeight: '700' }],
        'xl':  ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'lg':  ['1.125rem',{ lineHeight: '1.75rem', fontWeight: '600' }],
        // Body
        'base':['1rem',    { lineHeight: '1.5rem',  fontWeight: '400' }],
        'sm':  ['0.875rem',{ lineHeight: '1.25rem', fontWeight: '400' }],
        // Caption
        'xs':  ['0.75rem', { lineHeight: '1rem',    fontWeight: '400' }],
        '2xs': ['0.625rem',{ lineHeight: '0.875rem',fontWeight: '500' }],
      },
      fontWeight: {
        light:    '300',
        regular:  '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        extrabold:'800',
      },

      // ─── Spacing scale ───────────────────────────────────────────────────────
      // Base: 4px. All spacing is multiples.
      spacing: {
        px:   '1px',
        0:    '0',
        0.5:  '2px',
        1:    '4px',
        1.5:  '6px',
        2:    '8px',
        2.5:  '10px',
        3:    '12px',
        3.5:  '14px',
        4:    '16px',
        5:    '20px',
        6:    '24px',
        7:    '28px',
        8:    '32px',
        9:    '36px',
        10:   '40px',
        11:   '44px', // minimum tap target
        12:   '48px', // recommended tap target
        14:   '56px',
        16:   '64px',
        20:   '80px',
        24:   '96px',
        28:   '112px',
        32:   '128px',
        // Nav
        'nav-height':    '68px',
        'topbar-height': '56px',
        // Safe area
        'safe-bottom':   'env(safe-area-inset-bottom)',
        'safe-top':      'env(safe-area-inset-top)',
      },

      // ─── Border radius ───────────────────────────────────────────────────────
      borderRadius: {
        none:  '0',
        sm:    '6px',
        DEFAULT:'8px',
        md:    '10px',
        lg:    '14px',
        xl:    '18px',
        '2xl': '24px',
        '3xl': '32px',
        full:  '9999px',
        // Component-specific aliases
        card:  '18px',
        chip:  '9999px',
        input: '10px',
        btn:   '12px',
      },

      // ─── Shadows / elevation ─────────────────────────────────────────────────
      boxShadow: {
        none:   'none',
        sm:     '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT:'0 2px 8px 0 rgb(0 0 0 / 0.08)',
        md:     '0 4px 16px 0 rgb(0 0 0 / 0.10)',
        lg:     '0 8px 32px 0 rgb(0 0 0 / 0.14)',
        card:   '0 2px 12px 0 rgb(0 0 0 / 0.08)',
        sheet:  '0 -4px 24px 0 rgb(0 0 0 / 0.12)',
        inner:  'inset 0 1px 3px 0 rgb(0 0 0 / 0.06)',
      },

      // ─── Motion / transitions ────────────────────────────────────────────────
      transitionDuration: {
        instant: '50ms',
        fast:    '100ms',
        base:    '150ms',
        slow:    '250ms',
        slower:  '350ms',
      },
      transitionTimingFunction: {
        spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth:  'cubic-bezier(0.4, 0, 0.2, 1)',
        in:      'cubic-bezier(0.4, 0, 1, 1)',
        out:     'cubic-bezier(0, 0, 0.2, 1)',
      },

      // ─── Z-index scale ───────────────────────────────────────────────────────
      zIndex: {
        behind:  '-1',
        base:    '0',
        raised:  '10',
        nav:     '40',
        sheet:   '50',
        dialog:  '60',
        toast:   '70',
        overlay: '80',
      },
    },
  },
  plugins: [],
};

export default config;
