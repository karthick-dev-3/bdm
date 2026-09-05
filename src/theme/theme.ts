/**
 * Centralized Global Dashboard Design Configuration & Theme
 * 
 * Single source of truth for design tokens used across all dashboard pages & components.
 * Structured cleanly into 11 token categories + global rules.
 */

export const theme = {
  // 1. Colors
  colors: {
    // Core color system
    primary: '#ffffff',
    secondary: '#27272a',
    accent: '#3b82f6',
    background: '#09090b',
    surfaceCard: '#141417',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    border: '#EAECF0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Interaction colors
    primaryHover: '#e4e4e7',
    primaryActive: '#d4d4d8',
    focus: '#3b82f6',

    // Subtle background tints for pills & cards
    successSubtle: 'rgba(16, 185, 129, 0.12)',
    warningSubtle: 'rgba(245, 158, 11, 0.12)',
    errorSubtle: 'rgba(239, 68, 68, 0.12)',
    accentSubtle: 'rgba(59, 130, 246, 0.12)',
  },

  // 2. Typography
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
    baseFontSize: '14px',
    baseLineHeight: '1.5',

    // Weights
    regularFontWeight: 400,
    mediumFontWeight: 500,
    semiboldFontWeight: 600,
    boldFontWeight: 700,

    // Global text sizes
    sizes: {
      heading1: '1.5rem',    // 24px
      heading2: '1.25rem',   // 20px
      heading3: '1.05rem',   // 16.8px
      body: '0.875rem',      // 14px
      small: '0.8125rem',    // 13px
      caption: '0.75rem',    // 12px
    }
  },

  // 3. Spacing scale
  spacing: {
    sp4: '4px',
    sp8: '8px',
    sp12: '12px',
    sp16: '16px',
    sp20: '20px',
    sp24: '24px',
    sp32: '32px',
    sp40: '40px',
    sp48: '48px',
    sp64: '64px',
  },

  // 4. Border Radius
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    full: '9999px',
  },

  // 5. Shadows
  shadows: {
    none: 'none',
    small: '0 1px 2px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.5)',
    large: '0 12px 32px rgba(0, 0, 0, 0.7)',
  },

  // 6. Layout
  layout: {
    sidebarWidth: '260px',
    collapsedSidebarWidth: '68px',
    headerHeight: '56px',
    pagePadding: '24px',
    contentMaxWidth: '1440px',
    defaultLayoutGap: '16px',
  },

  // 7. Responsive Breakpoints
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
    largeDesktop: '1280px',
  },

  // 8. Global Component Defaults
  componentDefaults: {
    buttons: {
      defaultHeight: '36px',
      defaultRadius: '6px',
      defaultFontWeight: 600,
      defaultPadding: '0 14px',
    },
    inputs: {
      defaultHeight: '36px',
      defaultRadius: '6px',
      defaultBorder: '1px solid #27272a',
      defaultPadding: '0 12px',
    },
    cards: {
      defaultBackground: '#141417',
      defaultBorder: '1px solid #27272a',
      defaultRadius: '8px',
      defaultPadding: '16px',
      defaultShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    },
    tables: {
      defaultRowHeight: '44px',
      defaultBorder: '1px solid rgba(39, 39, 42, 0.5)',
      defaultHeaderStyle: {
        background: '#0f0f12',
        color: '#71717a',
        fontWeight: 500,
        textTransform: 'uppercase' as const,
        fontSize: '0.7rem',
        letterSpacing: '0.05em',
      }
    }
  },

  // 9. Icons
  icons: {
    iconLibrary: 'lucide-react',
    defaultIconSize: 16,
    smallIconSize: 14,
    largeIconSize: 20,
  },

  // 10. Dashboard Chart Colors
  chartColors: {
    chartColor1: '#3b82f6', // Electric Blue
    chartColor2: '#10b981', // Emerald Mint
    chartColor3: '#f59e0b', // Amber
    chartColor4: '#8b5cf6', // Indigo / Purple
    chartColor5: '#ec4899', // Pink
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#71717a',
  },

  // 11. Z-Index Layering System
  zIndex: {
    base: 0,
    sticky: 10,
    header: 50,
    dropdown: 100,
    modal: 200,
    toast: 300,
  }
} as const;

export type Theme = typeof theme;
export default theme;
