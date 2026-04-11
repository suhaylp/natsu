// ── theme/theme.ts ──
export const theme = {
  colors: {
    background: '#FDF6F0',
    backgroundGradientStart: '#FDE8E0',
    backgroundGradientEnd: '#F0E8FD',
    card: 'rgba(255,255,255,0.55)',
    cardBorder: 'rgba(255,255,255,0.75)',
    textPrimary: '#1A1A2E',
    textSecondary: '#7A7A9A',
    textMuted: '#B0A8C0',
    accent: '#E8719A',
    accentLight: 'rgba(232,113,154,0.12)',
    stub: 'rgba(180,170,200,0.25)',
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
