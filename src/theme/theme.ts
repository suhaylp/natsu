export const theme = {
  colors: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundGradientStart: '#FFFFFF',
    backgroundGradientEnd: '#F2F2F7',

    // Liquid glass cards
    card: 'rgba(255,255,255,0.72)',
    cardBorder: 'rgba(255,255,255,0.85)',

    // Text (iOS system)
    textPrimary: '#1C1C1E',
    textSecondary: '#636366',
    textMuted: '#AEAEB2',
    textOnDark: '#FFFFFF',

    // Brand accent (green)
    accent: '#2C7D52',
    accentLight: 'rgba(44,125,82,0.10)',

    // Category colors (iOS system palette — consistent across all screens)
    flight: '#5856D6',
    flightLight: 'rgba(88,86,214,0.10)',
    hotel: '#007AFF',
    hotelLight: 'rgba(0,122,255,0.10)',
    sightseeing: '#FF3B30',
    sightseeingLight: 'rgba(255,59,48,0.10)',
    activities: '#FF9500',
    activitiesLight: 'rgba(255,149,0,0.10)',
    food: '#34C759',
    foodLight: 'rgba(52,199,89,0.10)',

    // Status
    statusBooked: '#34C759',
    statusBookedLight: 'rgba(52,199,89,0.12)',
    statusIdea: '#AEAEB2',
    statusIdeaLight: 'rgba(174,174,178,0.15)',

    // UI chrome
    separator: 'rgba(60,60,67,0.12)',
    border: 'rgba(60,60,67,0.18)',
    stub: 'rgba(116,116,128,0.08)',
    shadow: '#000000',

    // Filter pills
    pillActive: '#1C1C1E',
    pillActiveText: '#FFFFFF',
    pillInactive: 'rgba(116,116,128,0.08)',
    pillInactiveText: '#636366',
    pillInactiveBorder: 'rgba(60,60,67,0.15)',
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
    h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
    h3: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
  },
} as const;

export type Theme = typeof theme;
