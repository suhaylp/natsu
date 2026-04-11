// ── theme/theme.ts ──
export const theme = {
  colors: {
    background: '#EDF7F2',
    backgroundGradientStart: '#D6EDE4',
    backgroundGradientEnd: '#E4F0EB',
    card: 'rgba(220,245,232,0.55)',
    cardBorder: 'rgba(255,255,255,0.70)',
    textPrimary: '#1A3A2A',
    textSecondary: '#5A7A68',
    textMuted: '#8AADA0',
    accent: '#2E7D52',
    accentLight: 'rgba(46,125,82,0.12)',
    stub: 'rgba(200,230,215,0.30)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 48,
  },
  radii: {
    card: 24,
    button: 16,
    pill: 100,
    inner: 14,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3 },
    h3: { fontSize: 17, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
    caption: {
      fontSize: 12,
      fontWeight: '500',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  },
} as const;

export type Theme = typeof theme;
