// ── App.tsx ──
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TripsDataProvider } from './src/data/TripsDataContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompactWeb = isWeb && width <= 520;

  const appTree = (
    <TripsDataProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </TripsDataProvider>
  );

  if (!isWeb) {
    return <SafeAreaProvider>{appTree}</SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.webCanvas}>
        <View style={[styles.webPhone, isCompactWeb ? styles.webPhoneCompact : null]}>{appTree}</View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webCanvas: {
    flex: 1,
    backgroundColor: '#dce6dd',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  webPhone: {
    width: '100%',
    maxWidth: 430,
    height: '100%',
    maxHeight: 920,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#f5f6f4',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  webPhoneCompact: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
});
