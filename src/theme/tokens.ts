export const darkTheme = {
  colors: {
    bgPrimary: '#0f0f0f',      // CSS: --color-bg-primary
    bgSurface: '#1a1a1a',      // CSS: --color-bg-surface
    bgElevated: '#27272a',     // CSS: --color-bg-elevated
    border: '#2a2a2a',         // CSS: --color-border
    borderDim: '#27272a',      // CSS: --color-border-dim
    accent: '#4f9eff',         // CSS: --color-accent
    success: '#4ade80',        // CSS: --color-success
    warning: '#fbbf24',        // CSS: --color-warning
    danger: '#f87171',         // CSS: --color-danger
    textPrimary: '#ffffff',    // CSS: --color-text-primary
    textSecondary: '#a1a1aa',  // CSS: --color-text-secondary
    textMuted: '#71717a',      // CSS: --color-text-muted
    accentHover: '#3d88e6',    // CSS: --color-accent-hover (used for pressed states on iOS)
    successHover: '#3bc46a',   // CSS: --color-success-hover
    dangerHover: '#e65959',    // CSS: --color-danger-hover
  },
  spacing: {
    xs: 4,    // CSS: --spacing-xs: 0.25rem
    sm: 8,    // CSS: --spacing-sm: 0.5rem
    md: 16,   // CSS: --spacing-md: 1rem
    lg: 24,   // CSS: --spacing-lg: 1.5rem
    xl: 32,   // CSS: --spacing-xl: 2rem
    '2xl': 48, // CSS: --spacing-2xl: 3rem
  },
  radii: {
    sm: 4,      // CSS: --radius-sm
    md: 8,      // CSS: --radius-md
    lg: 12,     // CSS: --radius-lg
    full: 9999, // CSS: --radius-full
  },
  typography: {
    fontFamily: undefined,           // System font (SF Pro on iOS) -- no custom font
    fontFamilyMono: 'SF Mono',       // CSS: --font-mono
    sizes: {
      xs: 12,    // CSS: .text-xs { font-size: 0.75rem }
      sm: 14,    // CSS: .text-small { font-size: 0.875rem }
      base: 16,  // CSS: --font-size-base
      lg: 18,    // CSS: h4 { font-size: 1.125rem }
      xl: 20,    // CSS: h3 { font-size: 1.25rem }
      '2xl': 24, // CSS: h2 { font-size: 1.5rem }
      '3xl': 32, // CSS: h1 { font-size: 2rem }
    },
    lineHeights: {
      tight: 1.2, // CSS: h1-h6 { line-height: 1.2 }
      base: 1.5,  // CSS: --line-height-base
    },
    weights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const, // CSS: h1-h6 { font-weight: 600 }
    },
  },
  layout: {
    containerMaxWidth: 480, // CSS: --container-max-width
    minTapTarget: 44,       // CSS: --min-tap-target
  },
  shadows: {
    sm: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, shadowOpacity: 0.3, shadowColor: '#000' },
    md: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, shadowOpacity: 0.4, shadowColor: '#000' },
    lg: { shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, shadowOpacity: 0.5, shadowColor: '#000' },
  },
} as const;

export type Theme = typeof darkTheme;
