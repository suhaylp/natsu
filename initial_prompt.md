# Initial Prompt

You are a senior React Native engineer. Build a complete, production-quality React Native app using Expo. Follow every instruction below exactly. Do not skip sections or stub features unless explicitly told to.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is a personal relationship app — a soft, emotional, premium iOS-style experience. It is NOT a productivity app. Every design decision should feel intentional, warm, and meaningful. Think of it as a private little world, not a dashboard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- React Native with Expo (latest SDK)
- React Navigation v6 — Stack Navigator
- expo-blur for BlurView (glassmorphism effect)
- expo-linear-gradient for background gradients
- Functional components with hooks only (no class components)
- Local mock data only — no backend, no API calls
- TypeScript preferred; plain JS acceptable if cleaner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create the following structure:

/src
  /components
    GlassCard.tsx         ← reusable glassmorphism card
    SectionLabel.tsx      ← small uppercase section label
  /screens
    HomeScreen.tsx
    TripsScreen.tsx
    TripDetailScreen.tsx
    FlightDetailScreen.tsx
  /data
    trips.ts              ← all hardcoded mock data
  /theme
    theme.ts              ← all colors, spacing, typography, radii
  /navigation
    AppNavigator.tsx      ← Stack navigator setup
App.tsx                   ← entry point

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THEME SYSTEM  (theme/theme.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export a single `theme` object with:

colors:
  background: '#FDF6F0'        ← warm off-white
  backgroundGradientStart: '#FDE8E0'
  backgroundGradientEnd: '#F0E8FD'
  card: 'rgba(255,255,255,0.55)'
  cardBorder: 'rgba(255,255,255,0.75)'
  textPrimary: '#1A1A2E'
  textSecondary: '#7A7A9A'
  textMuted: '#B0A8C0'
  accent: '#E8719A'            ← soft rose
  accentLight: 'rgba(232,113,154,0.12)'
  stub: 'rgba(180,170,200,0.25)'

spacing: 4, 8, 12, 16, 20, 24, 32, 48 (as named keys: xs, sm, md, lg, xl, xxl, xxxl)

radii:
  card: 24
  button: 16
  pill: 100
  inner: 14

typography:
  h1: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 }
  h2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3 }
  h3: { fontSize: 17, fontWeight: '600' }
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 }
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOCK DATA  (data/trips.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export a `trips` array with this exact structure:

[
  {
    id: '1',
    title: 'Southeast Asia',
    emoji: '🇹🇭🇻🇳',
    dateRange: 'Jul – Aug 2025',
    flights: [
      {
        id: 'f1',
        route: 'Singapore → Bangkok',
        date: 'July 18, 2025',
        time: '6:00 PM',
        airline: 'Scoot',
        bookingRef: 'SC-88421',
        terminal: 'Terminal 1, Gate B12',
        duration: '2h 20m',
      },
      {
        id: 'f2',
        route: 'Bangkok → Hanoi',
        date: 'July 25, 2025',
        time: '9:30 AM',
        airline: 'VietJet Air',
        bookingRef: 'VJ-33901',
        terminal: 'Suvarnabhumi, Gate D5',
        duration: '1h 55m',
      }
    ]
  },
  {
    id: '2',
    title: 'Montreal / Ottawa',
    emoji: '🇨🇦',
    dateRange: 'Sep 2025',
    flights: [
      {
        id: 'f3',
        route: 'Vancouver → Montreal',
        date: 'September 12, 2025',
        time: '7:15 AM',
        airline: 'Air Canada',
        bookingRef: 'AC-55902',
        terminal: 'YVR International, Gate C44',
        duration: '4h 45m',
      }
    ]
  }
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REUSABLE COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GlassCard (components/GlassCard.tsx) ──

A frosted-glass card component. Props: `children`, optional `style`.
Implementation:
- Outer View with: backgroundColor: theme.colors.card, borderRadius: theme.radii.card, borderWidth: 1, borderColor: theme.colors.cardBorder
- Add subtle shadow: shadowColor: '#C0A0D0', shadowOffset: {width:0, height:8}, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6
- Use BlurView (expo-blur) ONLY on iOS: intensity={18}, tint="light", wrapping the inner content
- On Android, fall back to a semi-transparent View (no BlurView — performance)
- Inner padding: 20px all sides

── SectionLabel (components/SectionLabel.tsx) ──

Small uppercase label. Props: `children`.
Style: theme.typography.caption, color: theme.colors.textMuted, marginBottom: 8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAVIGATION  (navigation/AppNavigator.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use React Navigation Stack Navigator.
Screens: Home, Trips, TripDetail, FlightDetail.
Set screenOptions to:
- headerShown: false (all screens use custom headers)
- cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS
- gestureEnabled: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All screens share this background pattern:
- Use LinearGradient (expo-linear-gradient) as the root view
- Colors: [theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]
- Full screen (flex: 1), wrapped in SafeAreaView

── 1. HomeScreen ──

Layout:
- Full screen gradient background
- Vertically centered content (justifyContent: 'center', alignItems: 'center')
- Large title: "Our App ❤️" using theme.typography.h1
- Subtitle below: "Just the two of us" using theme.colors.textSecondary
- Spacer (48px)
- A GlassCard containing a single button: "View Trips →"
  - Button style: backgroundColor: theme.colors.accent, borderRadius: theme.radii.button, paddingHorizontal: 32, paddingVertical: 16
  - Text: white, fontSize: 16, fontWeight: '600'
  - On press: navigate to Trips

── 2. TripsScreen ──

Layout:
- Full screen gradient background
- Custom header area (paddingTop from SafeAreaView): back chevron ("‹") on left + title "Our Trips" centered
- ScrollView below
- Each trip rendered as a GlassCard with:
  - Large emoji (fontSize: 36) on top
  - Trip title (h2)
  - Date range (caption, textMuted)
  - Subtle right arrow "→" in accent color
  - Full card is a TouchableOpacity → navigate to TripDetail, pass trip id
- Cards have marginHorizontal: 20, marginBottom: 16

── 3. TripDetailScreen ──

Receives `tripId` param. Looks up trip from mock data.

Layout:
- Full screen gradient background
- Custom header: back chevron + trip title + emoji
- ScrollView with paddingHorizontal: 20

Flights section:
- SectionLabel: "Flights"
- Each flight rendered as a GlassCard:
  - Route text (h3)
  - Airline + date + time in a row (caption style)
  - Duration pill (small rounded chip): backgroundColor: theme.colors.accentLight, color: theme.colors.accent
  - Right arrow "→"
  - TouchableOpacity → navigate to FlightDetail, pass flightId + tripId

Stub section (below flights):
- SectionLabel: "Things to Do"
- A single GlassCard with:
  - backgroundColor: theme.colors.stub
  - Text: "Coming soon ✨"
  - Subtext: "We'll plan activities here" in textMuted style
  - Non-interactive (no onPress)

── 4. FlightDetailScreen ──

Receives `flightId` + `tripId` params. Looks up from mock data.

Layout:
- Full screen gradient background
- Custom header: back chevron + "Flight Details"
- ScrollView with paddingHorizontal: 20, paddingTop: 24

Content inside a GlassCard:
- Route displayed prominently (h2, centered at top of card)
- Separator line (1px, borderColor: theme.colors.cardBorder)
- Info rows using a reusable inline pattern:
    [ Label (caption, textMuted) ]  [ Value (body, textPrimary) ]
  Rows: Date, Time, Airline, Booking Reference, Terminal, Duration
- Each row has paddingVertical: 12, borderBottomWidth: 0.5, borderColor: theme.colors.cardBorder
- Last row has no border

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN RULES — READ CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Do NOT use BlurView more than once per screen. It is expensive. Use it only in GlassCard and nowhere else.

2. Do NOT use any external icon library. Use plain Unicode characters for all icons:
   ‹  for back arrow
   →  for forward/action arrow
   ✨ for stub placeholder
   ❤️ in the app title only

3. All TouchableOpacity elements must have:
   activeOpacity={0.75}

4. Do NOT use any `StyleSheet.create` per screen. Instead, define all styles as inline objects referencing `theme`. This keeps the codebase readable and the theme system the single source of truth.

5. Font: Do not import any custom fonts. Use the system font stack (-apple-system / San Francisco on iOS). This ensures the app feels native instantly.

6. Spacing discipline: Never hardcode a pixel value that exists in the theme. Always reference theme.spacing.

7. Status bar: Use `` on all screens.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Output every file completely — no truncation, no "// ... rest of component"
- Output files in this order:
  1. theme/theme.ts
  2. data/trips.ts
  3. components/GlassCard.tsx
  4. components/SectionLabel.tsx
  5. navigation/AppNavigator.tsx
  6. screens/HomeScreen.tsx
  7. screens/TripsScreen.tsx
  8. screens/TripDetailScreen.tsx
  9. screens/FlightDetailScreen.tsx
  10. App.tsx
- Each file starts with a comment: // ── [filename] ──
- Include a short package.json dependencies section at the end listing all required Expo packages and their recommended versions
- Do not explain the code. Just output the code.

store this in a markdown called "initial_prompt" as well
